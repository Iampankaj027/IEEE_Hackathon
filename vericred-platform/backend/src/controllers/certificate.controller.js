const prisma = require('../config/db');

/**
 * Retrieves all cryptographic certificates earned by the logged-in student
 * GET /api/certificates/my-certificates
 * Restricted to: STUDENT
 */
async function getMyCertificates(req, res) {
  try {
    const studentId = req.user.id;

    const certificates = await prisma.certificate.findMany({
      where: {
        studentId,
        isRevoked: false,
      },
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
        claim: {
          select: {
            achievementNotes: true,
          },
        },
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch certificates: ${error.message}`,
    });
  }
}

/**
 * Generates pre-filled LinkedIn Certification Add URL metadata for a specific certificate
 * GET /api/certificates/:id/linkedin-share
 * Restricted to: STUDENT
 */
async function getLinkedInShareUrl(req, res) {
  try {
    const { id: certificateId } = req.params;
    const studentId = req.user.id;

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        event: true,
        student: true,
      },
    });

    if (!certificate || certificate.studentId !== studentId) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or unauthorized.',
      });
    }

    const institutionName =
      process.env.ISSUER_INSTITUTION_NAME || 'Swami Keshvanand Institute of Technology (SKIT)';

    // Format ISO date to YYYYMM as required by LinkedIn certificate parameters
    const issueDate = new Date(certificate.issuedAt);
    const issueYear = issueDate.getFullYear();
    const issueMonth = String(issueDate.getMonth() + 1).padStart(2, '0');

    // Build official LinkedIn Certification pre-fill URL
    // Parameters: startType=CERTIFICATION, name, organizationName, issueYear, issueMonth, certId, certUrl
    const linkedInParams = new URLSearchParams({
      startType: 'CERTIFICATION',
      name: `${certificate.event.title} (${certificate.participationRole.replace('_', ' ')})`,
      organizationName: institutionName,
      issueYear: String(issueYear),
      issueMonth: String(issueMonth),
      certId: certificate.certificateNo,
      certUrl: certificate.qrVerificationUrl,
    });

    const linkedInShareUrl = `https://www.linkedin.com/profile/add?${linkedInParams.toString()}`;

    return res.status(200).json({
      success: true,
      certificateNo: certificate.certificateNo,
      linkedInShareUrl,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to generate LinkedIn share link: ${error.message}`,
    });
  }
}

/**
 * Retrieves a student's public verifiable portfolio and achievement timeline by Roll Number
 * GET /api/certificates/portfolio/:rollNo
 * Publicly accessible (No login required)
 */
async function getPublicStudentPortfolio(req, res) {
  try {
    const { rollNo } = req.params;
    const normalizedRollNo = String(rollNo).trim().toUpperCase();

    const student = await prisma.user.findUnique({
      where: { rollNo: normalizedRollNo },
      select: {
        id: true,
        name: true,
        rollNo: true,
        department: true,
        batchYear: true,
        currentSemester: true,
        totalCreditPoints: true,
        createdAt: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student portfolio with Roll Number "${normalizedRollNo}" not found.`,
      });
    }

    const certificates = await prisma.certificate.findMany({
      where: {
        studentId: student.id,
        isRevoked: false,
      },
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
      },
      orderBy: {
        issuedAt: 'desc',
      },
    });

    return res.status(200).json({
      success: true,
      student,
      totalCertificates: certificates.length,
      certificates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch public student portfolio: ${error.message}`,
    });
  }
}

module.exports = {
  getMyCertificates,
  getLinkedInShareUrl,
  getPublicStudentPortfolio,
};