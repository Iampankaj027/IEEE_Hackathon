const prisma = require('../config/db');
const {
  buildCanonicalPayload,
  verifyCertificateSignature,
} = require('../utils/cryptoSigner');

/**
 * Publicly verifies a digital certificate's authenticity via QR Code or direct URL lookup.
 * NO LOGIN REQUIRED.
 * GET /api/verify/:certificateNo?sig=...
 */
async function verifyCertificatePublic(req, res) {
  try {
    const { certificateNo } = req.params;
    const { sig: providedSignature } = req.query;

    const normalizedCertNo = String(certificateNo).trim().toUpperCase();

    if (!normalizedCertNo) {
      return res.status(400).json({
        success: false,
        isAuthentic: false,
        message: 'Certificate Number is required for verification.',
      });
    }

    // 1. Fetch certificate from database with student and event relations
    const certificate = await prisma.certificate.findUnique({
      where: { certificateNo: normalizedCertNo },
      include: {
        student: {
          select: {
            name: true,
            rollNo: true,
            department: true,
            batchYear: true,
          },
        },
        event: {
          select: {
            title: true,
            category: true,
            scope: true,
            eventDate: true,
            organizerDept: true,
            semesterTag: true,
            naacCriteriaTag: true,
          },
        },
      },
    });

    if (!certificate || certificate.isRevoked) {
      return res.status(404).json({
        success: false,
        isAuthentic: false,
        message: 'Certificate record not found in institutional registry or has been revoked.',
      });
    }

    const studentRollNo = (certificate.student.rollNo || '').toUpperCase();
    const issuedAtISO = new Date(certificate.issuedAt).toISOString();
    const institutionName =
      process.env.ISSUER_INSTITUTION_NAME || 'Swami Keshvanand Institute of Technology (SKIT)';

    // Build the common verification details response object
    const verificationDetails = {
      institutionName,
      certificateNo: certificate.certificateNo,
      issuedAt: certificate.issuedAt,
      semester: certificate.semester,
      creditPoints: certificate.creditPoints,
      participationRole: certificate.participationRole,
      student: {
        name: certificate.student.name,
        rollNo: studentRollNo,
        department: certificate.student.department,
        batchYear: certificate.student.batchYear,
      },
      event: {
        title: certificate.event.title,
        category: certificate.event.category,
        scope: certificate.event.scope,
        eventDate: certificate.event.eventDate,
        organizerDept: certificate.event.organizerDept,
        naacCriteriaTag: certificate.event.naacCriteriaTag,
      },
    };

    // 2. If a cryptographic signature is provided, perform full HMAC-SHA256 verification
    if (providedSignature) {
      const canonicalPayload = buildCanonicalPayload({
        certificateNo: certificate.certificateNo,
        studentRollNo,
        eventId: certificate.eventId,
        participationRole: certificate.participationRole,
        issuedAtISO,
      });

      const isSignatureValid = verifyCertificateSignature(canonicalPayload, providedSignature);

      if (!isSignatureValid) {
        return res.status(400).json({
          success: false,
          isAuthentic: false,
          message:
            'CRYPTOGRAPHIC TAMPER DETECTED: The signature provided does not match institutional records. This certificate may have been forged or altered.',
        });
      }

      // Full cryptographic verification passed
      return res.status(200).json({
        success: true,
        isAuthentic: true,
        message: 'Cryptographically Verified Institutional Credential.',
        verificationDetails,
      });
    }

    // 3. No signature provided — certificate exists in DB, return as registry-verified
    return res.status(200).json({
      success: true,
      isAuthentic: true,
      message: 'Certificate found in institutional registry. For full cryptographic verification, use the QR code link with the embedded signature.',
      verificationDetails,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      isAuthentic: false,
      message: `Verification service error: ${error.message}`,
    });
  }
}

module.exports = {
  verifyCertificatePublic,
};