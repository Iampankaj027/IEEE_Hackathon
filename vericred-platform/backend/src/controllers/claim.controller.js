const prisma = require('../config/db');
const { issueCertificateForClaim } = require('../utils/csvMatcher');

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
      },
    });

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Participation claim not found.',
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
      const updatedClaim = await prisma.participationClaim.update({
        where: { id: claimId },
        data: {
          status: 'REJECTED',
          verifiedById: req.user.id,
          verifiedAt: new Date(),
          rejectionReason: rejectionReason ? rejectionReason.trim() : 'Rejected by faculty reviewer',
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
    if (department) {
      whereClause.event = {
        organizerDept: { contains: department, mode: 'insensitive' },
      };
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