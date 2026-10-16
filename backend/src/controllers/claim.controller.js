const prisma = require('../config/db');
const { issueCertificateForClaim } = require('../utils/csvMatcher');
const { createNotification } = require('../utils/notificationHelper');

/**
 * Submits a participation claim for an event.
 * Checks if Faculty CSV roster already exists for this event.
 * If found, auto-approves instantly and generates the certificate.
 * POST /api/claims
 * Restricted to: STUDENT
 */
async function submitClaim(req, res) {
  try {
    const { eventId, claimedRole = 'PARTICIPANT', achievementNotes } = req.body;
    const studentId = req.user.id;
    const studentRollNo = (req.user.rollNo || '').toUpperCase();

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is mandatory for submitting a claim.',
      });
    }

    // 1. Verify event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'The specified event does not exist.',
      });
    }

    // 2. Check if claim already exists for this student + event
    const existingClaim = await prisma.participationClaim.findUnique({
      where: {
        studentId_eventId: {
          studentId,
          eventId,
        },
      },
      include: {
        certificate: true,
      },
    });

    if (existingClaim) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a participation claim for this event.',
        claim: existingClaim,
      });
    }

    // 3. Check if Faculty uploaded a master CSV roster and this student is in it
    let initialStatus = 'PENDING';
    let csvRole = null;

    if (studentRollNo) {
      const rosterEntry = await prisma.eventCsvRoster.findUnique({
        where: {
          eventId_studentRollNo: {
            eventId,
            studentRollNo,
          },
        },
      });

      if (rosterEntry) {
        initialStatus = 'APPROVED_BY_CSV';
        csvRole = rosterEntry.participationRole;
      }
    }

    // 4. Create the claim
    const finalRole = csvRole || claimedRole.toUpperCase();
    const newClaim = await prisma.participationClaim.create({
      data: {
        studentId,
        eventId,
        claimedRole: finalRole,
        achievementNotes: achievementNotes ? achievementNotes.trim() : null,
        status: initialStatus,
        verifiedAt: initialStatus !== 'PENDING' ? new Date() : null,
      },
    });

    // 5. If found in CSV roster, automatically issue certificate right now!
    let issuedCertificate = null;
    if (initialStatus === 'APPROVED_BY_CSV') {
      issuedCertificate = await issueCertificateForClaim({
        claimId: newClaim.id,
        approvalStatus: 'APPROVED_BY_CSV',
        overrideRole: finalRole,
      });

      // Notify student of instant auto-approval
      await createNotification({
        userId: studentId,
        type: 'CLAIM_APPROVED_CSV',
        title: 'Participation Verified — Certificate Issued',
        body: `Your claim for "${event.title}" was automatically verified against the faculty roster. Certificate ${issuedCertificate?.certificateNo} is ready.`,
        metadata: {
          certificateNo: issuedCertificate?.certificateNo,
          creditPoints: issuedCertificate?.creditPoints,
          eventTitle: event.title,
          claimId: newClaim.id,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message:
        initialStatus === 'APPROVED_BY_CSV'
          ? 'Participation claim successfully submitted and auto-verified against faculty CSV roster!'
          : 'Participation claim submitted successfully and is pending faculty review.',
      claim: newClaim,
      certificate: issuedCertificate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to submit participation claim: ${error.message}`,
    });
  }
}

/**
 * Faculty 1-click review (Approve or Reject) of pending student claims.
 * PUT /api/claims/:id/review
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function reviewClaim(req, res) {
  try {
    const { id: claimId } = req.params;
    const { action, rejectionReason, overrideRole } = req.body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review action. Must be either "APPROVE" or "REJECT".',
      });
    }

    const claim = await prisma.participationClaim.findUnique({
      where: { id: claimId },
      include: {
        certificate: true,
        event: { select: { createdById: true, title: true } },
      },
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Participation claim not found.',
      });
    }

    // Ownership guard: FACULTY can only act on claims for events they created
    if (req.user.role === 'FACULTY' && claim.event.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only review claims for events you have created.',
      });
    }

    if (claim.certificate && action.toUpperCase() === 'APPROVE') {
      return res.status(400).json({
        success: false,
        message: 'Certificate has already been issued for this claim.',
        certificate: claim.certificate,
      });
    }

    if (action.toUpperCase() === 'REJECT') {
      const reason = rejectionReason ? rejectionReason.trim() : 'Rejected by faculty reviewer';
      const updatedClaim = await prisma.participationClaim.update({
        where: { id: claimId },
        include: { event: { select: { title: true } } },
        data: {
          status: 'REJECTED',
          verifiedById: req.user.id,
          verifiedAt: new Date(),
          rejectionReason: reason,
        },
      });

      await createNotification({
        userId: claim.studentId,
        type: 'CLAIM_REJECTED',
        title: 'Participation Claim Rejected',
        body: `Your claim for "${updatedClaim.event.title}" was not approved. Reason: ${reason}`,
        metadata: {
          eventTitle: updatedClaim.event.title,
          claimId,
          rejectionReason: reason,
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Participation claim rejected.',
        claim: updatedClaim,
      });
    }

    // APPROVE Action: Issue Cryptographic Certificate
    const certificate = await issueCertificateForClaim({
      claimId,
      approvalStatus: 'APPROVED_BY_FACULTY',
      verifiedById: req.user.id,
      overrideRole: overrideRole ? overrideRole.toUpperCase() : null,
    });

    await createNotification({
      userId: claim.studentId,
      type: 'CLAIM_APPROVED_FACULTY',
      title: 'Participation Approved — Certificate Issued',
      body: `Your claim for "${claim.event.title}" was approved by faculty. Certificate ${certificate?.certificateNo} (+${certificate?.creditPoints} pts) has been issued.`,
      metadata: {
        certificateNo: certificate?.certificateNo,
        creditPoints: certificate?.creditPoints,
        eventTitle: claim.event.title,
        claimId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Claim approved successfully and cryptographic certificate generated.',
      certificate,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to review claim: ${error.message}`,
    });
  }
}

/**
 * Retrieves all claims submitted by the logged-in student
 * GET /api/claims/my-claims
 * Restricted to: STUDENT
 */
async function getStudentClaims(req, res) {
  try {
    const studentId = req.user.id;

    const claims = await prisma.participationClaim.findMany({
      where: { studentId },
      include: {
        event: {
          select: {
            title: true,
            category: true,
            scope: true,
            eventDate: true,
            organizerDept: true,
            semesterTag: true,
          },
        },
        certificate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      count: claims.length,
      claims,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch student claims: ${error.message}`,
    });
  }
}

/**
 * Retrieves pending claims for faculty review
 * GET /api/claims/pending
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function getPendingClaims(req, res) {
  try {
    const { department } = req.query;

    const whereClause = { status: 'PENDING' };

    // Build event sub-filter: FACULTY only sees claims for events they own
    const eventFilter = {};
    if (req.user.role === 'FACULTY') {
      eventFilter.createdById = req.user.id;
    }
    if (department) {
      eventFilter.organizerDept = { contains: department, mode: 'insensitive' };
    }
    if (Object.keys(eventFilter).length > 0) {
      whereClause.event = eventFilter;
    }

    const pendingClaims = await prisma.participationClaim.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            name: true,
            rollNo: true,
            department: true,
            currentSemester: true,
          },
        },
        event: {
          select: {
            title: true,
            category: true,
            scope: true,
            eventDate: true,
            organizerDept: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      count: pendingClaims.length,
      pendingClaims,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch pending claims: ${error.message}`,
    });
  }
}

module.exports = {
  submitClaim,
  reviewClaim,
  getStudentClaims,
  getPendingClaims,
};