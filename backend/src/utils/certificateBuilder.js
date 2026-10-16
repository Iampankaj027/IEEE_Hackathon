const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { generateQrBuffer } = require('./qrGenerator');

// Ensure the certificates output directory exists
const CERTIFICATES_DIR = path.join(__dirname, '../../uploads/certificates');
if (!fs.existsSync(CERTIFICATES_DIR)) {
  fs.mkdirSync(CERTIFICATES_DIR, { recursive: true });
}

/**
 * Maps internal enum values to formal human-readable labels for the certificate body.
 */
const ROLE_LABELS = {
  WINNER_1ST: 'First Place (Winner)',
  WINNER_2ND: 'Second Place (Runner-Up)',
  WINNER_3RD: 'Third Place (2nd Runner-Up)',
  FINALIST: 'Grand Finalist',
  ORGANIZER: 'Core Organizing Committee Member',
  VOLUNTEER: 'Official Student Volunteer',
  PARTICIPANT: 'Active Participant',
};

const SCOPE_LABELS = {
  INTRA_COLLEGE: 'Intra-Institutional Level',
  INTER_COLLEGE: 'Inter-Institutional Level',
  STATE: 'State Level',
  NATIONAL: 'National Level',
  INTERNATIONAL: 'International Level',
};

const CATEGORY_LABELS = {
  TECHNICAL: 'Technical & Engineering',
  HACKATHON: 'Hackathon & Innovation',
  SPORTS: 'Athletics & Sports',
  CULTURAL: 'Cultural & Literary Arts',
  NSS_SOCIAL: 'NSS & Community Service',
  WORKSHOP_SEMINAR: 'Academic Workshop & Seminar',
};

/**
 * Formats a Date object or ISO string into a formal academic date string (e.g., "October 14, 2026")
 * @param {Date|string} dateInput
 * @returns {string}
 */
function formatFormalDate(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generates an archival-grade A4 Landscape PDF Certificate stamped with a cryptographic QR code.
 *
 * @param {Object} certData
 * @param {string} certData.certificateNo - e.g., "VC-2026-9F4A2C"
 * @param {string} certData.studentName - e.g., "Aarav Sharma"
 * @param {string} certData.studentRollNo - e.g., "23ESKIT001"
 * @param {string} certData.studentDepartment - e.g., "Information Technology"
 * @param {string} certData.eventTitle - e.g., "Smart India Internal Hackathon 2026"
 * @param {string} certData.eventCategory - Enum from EventCategory
 * @param {string} certData.eventScope - Enum from EventScope
 * @param {Date|string} certData.eventDate - Date of the event
 * @param {string} certData.participationRole - Enum from ParticipationRole
 * @param {number} certData.creditPoints - Auto-calculated credit points
 * @param {number} certData.semester - Semester number (e.g., 5)
 * @param {string} certData.cryptoSignature - 64-char HMAC-SHA256 hex string
 * @param {string} certData.qrVerificationUrl - Full verification URL encoded in the QR
 * @param {Date|string} certData.issuedAt - Issuance timestamp
 * @param {string} [certData.verifierName] - Name of verifying faculty / authority
 * @returns {Promise<{ filePath: string, publicPdfUrl: string }>}
 */
async function buildCertificatePdf(certData) {
  const {
    certificateNo,
    studentName,
    studentRollNo,
    studentDepartment,
    eventTitle,
    eventCategory,
    eventScope,
    eventDate,
    participationRole,
    creditPoints,
    semester,
    cryptoSignature,
    qrVerificationUrl,
    issuedAt,
    verifierName = 'Institutional Verification Cell (IQAC)',
  } = certData;

  const institutionName =
    process.env.ISSUER_INSTITUTION_NAME ||
    'Swami Keshvanand Institute of Technology, Management & Gramothan';

  const qrBuffer = await generateQrBuffer(qrVerificationUrl, {
    width: 220,
    margin: 1,
  });

  const fileName = `${certificateNo}.pdf`;
  const filePath = path.join(CERTIFICATES_DIR, fileName);
  const publicPdfUrl = `/uploads/certificates/${fileName}`;

  return new Promise((resolve, reject) => {
    try {
      // A4 Landscape: 841.89 x 595.28 points
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 0,
        info: {
          Title: `Certificate ${certificateNo} - ${studentName}`,
          Author: institutionName,
          Subject: `Verified Participation Record for ${eventTitle}`,
          Keywords: `VeriCred,${certificateNo},${studentRollNo},${cryptoSignature}`,
        },
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const pageWidth = doc.page.width; // 841.89
      const pageHeight = doc.page.height; // 595.28

      // 1. Subtle Warm Archival Paper Background
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FCFBF9');

      // 2. Outer Heavy Institutional Navy Frame
      doc
        .lineWidth(3)
        .strokeColor('#0F172A')
        .rect(24, 24, pageWidth - 48, pageHeight - 48)
        .stroke();

      // 3. Inner Antique Gold Rule
      doc
        .lineWidth(1)
        .strokeColor('#B45309')
        .rect(31, 31, pageWidth - 62, pageHeight - 62)
        .stroke();

      // 4. Inner Hairline Slate Border
      doc
        .lineWidth(0.5)
        .strokeColor('#CBD5E1')
        .rect(36, 36, pageWidth - 72, pageHeight - 72)
        .stroke();

      // 5. Top Metadata Bar (Credential ID & Credit Badge)
      doc
        .font('Courier-Bold')
        .fontSize(9)
        .fillColor('#475569')
        .text(`CREDENTIAL ID: ${certificateNo}`, 54, 52, { align: 'left' });

      doc
        .font('Courier-Bold')
        .fontSize(9)
        .fillColor('#0F172A')
        .text(
          `VERIFIED ACTIVITY CREDITS: +${creditPoints} PTS (SEM ${semester})`,
          54,
          52,
          {
            width: pageWidth - 108,
            align: 'right',
          }
        );

      // 6. Institution Header
      doc
        .font('Times-Bold')
        .fontSize(17)
        .fillColor('#0F172A')
        .text(institutionName.toUpperCase(), 60, 82, {
          width: pageWidth - 120,
          align: 'center',
          characterSpacing: 1.2,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#64748B')
        .text(
          'CENTRALIZED DIRECTORATE OF STUDENT AFFAIRS & INTERNAL QUALITY ASSURANCE CELL (IQAC)',
          60,
          106,
          {
            width: pageWidth - 120,
            align: 'center',
            characterSpacing: 1.5,
          }
        );

      // Ornamental Divider Line under Institution Header
      const centerX = pageWidth / 2;
      doc
        .moveTo(centerX - 140, 126)
        .lineTo(centerX + 140, 126)
        .lineWidth(1)
        .strokeColor('#B45309')
        .stroke();

      // 7. Certificate Main Title
      const isWinnerOrMerit = ['WINNER_1ST', 'WINNER_2ND', 'WINNER_3RD', 'FINALIST'].includes(
        participationRole
      );
      const mainHeading = isWinnerOrMerit
        ? 'CERTIFICATE OF EXCELLENCE & MERIT'
        : 'CERTIFICATE OF VERIFIED PARTICIPATION';

      doc
        .font('Times-Bold')
        .fontSize(26)
        .fillColor('#0F172A')
        .text(mainHeading, 60, 144, {
          width: pageWidth - 120,
          align: 'center',
          characterSpacing: 2,
        });

      // 8. Presentation Line
      doc
        .font('Times-Italic')
        .fontSize(13)
        .fillColor('#475569')
        .text('This official institutional credential is proudly presented to', 60, 186, {
          width: pageWidth - 120,
          align: 'center',
        });

      // 9. Student Name & Roll Number Highlight
      doc
        .font('Times-Bold')
        .fontSize(28)
        .fillColor('#0F172A')
        .text(studentName, 60, 210, {
          width: pageWidth - 120,
          align: 'center',
        });

      // Subtle underline below student name
      doc
        .moveTo(centerX - 180, 244)
        .lineTo(centerX + 180, 244)
        .lineWidth(0.75)
        .strokeColor('#CBD5E1')
        .stroke();

      doc
        .font('Courier-Bold')
        .fontSize(10.5)
        .fillColor('#334155')
        .text(
          `ENROLLMENT / ROLL NO: ${studentRollNo.toUpperCase()}   |   DEPARTMENT: ${studentDepartment.toUpperCase()}`,
          60,
          253,
          {
            width: pageWidth - 120,
            align: 'center',
          }
        );

      // 10. Citation Paragraph
      const roleText = ROLE_LABELS[participationRole] || participationRole;
      const scopeText = SCOPE_LABELS[eventScope] || eventScope;
      const categoryText = CATEGORY_LABELS[eventCategory] || eventCategory;
      const formattedEventDate = formatFormalDate(eventDate);

      doc
        .font('Times-Roman')
        .fontSize(13.5)
        .fillColor('#1E293B')
        .text(
          `in recognition of serving/achieving the distinction of `,
          90,
          284,
          {
            width: pageWidth - 180,
            align: 'center',
            continued: true,
          }
        )
        .font('Times-Bold')
        .fillColor('#B45309')
        .text(`${roleText}`, { continued: true })
        .font('Times-Roman')
        .fillColor('#1E293B')
        .text(` in the ${scopeText} event:`, { continued: false });

      // 11. Event Title Box
      doc
        .font('Times-Bold')
        .fontSize(20)
        .fillColor('#0F172A')
        .text(`"${eventTitle}"`, 80, 314, {
          width: pageWidth - 160,
          align: 'center',
        });

      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#475569')
        .text(
          `Category: ${categoryText}   •   Conducted on: ${formattedEventDate}   •   Academic Semester: ${semester}`,
          80,
          346,
          {
            width: pageWidth - 160,
            align: 'center',
          }
        );

      // 12. Bottom Section: 3-Column Footer (Left: Authority Signature, Center: Cryptographic Ledger Box, Right: QR Code)
      const footerTopY = 405;

      // Left Column: Verifying Authority & Date of Issue
      doc
        .moveTo(64, footerTopY + 55)
        .lineTo(240, footerTopY + 55)
        .lineWidth(0.8)
        .strokeColor('#334155')
        .stroke();

      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#0F172A')
        .text(verifierName, 64, footerTopY + 62, { width: 190, align: 'left' });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#64748B')
        .text('Authorized Verifying Authority', 64, footerTopY + 76)
        .text(`Issued On: ${formatFormalDate(issuedAt)}`, 64, footerTopY + 89);

      // Center Column: Tamper-Proof Cryptographic Ledger Stamp Box
      const boxX = 275;
      const boxY = footerTopY + 12;
      const boxW = 355;
      const boxH = 92;

      doc
        .roundedRect(boxX, boxY, boxW, boxH, 4)
        .fillAndStroke('#F8FAFC', '#CBD5E1');

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#0F172A')
        .text('CRYPTOGRAPHIC VERIFICATION RECORD (HMAC-SHA256)', boxX + 12, boxY + 10);

      doc
        .font('Courier')
        .fontSize(7.5)
        .fillColor('#334155')
        .text(`CERT NO : ${certificateNo}`, boxX + 12, boxY + 25)
        .text(`ROLL NO : ${studentRollNo.toUpperCase()}`, boxX + 12, boxY + 37)
        .text(
          `SHA-256 : ${cryptoSignature.substring(0, 32)}`,
          boxX + 12,
          boxY + 49
        )
        .text(
          `          ${cryptoSignature.substring(32, 64)}`,
          boxX + 12,
          boxY + 59
        );

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#64748B')
        .text(
          'Scan the QR code or visit the public verification portal (no login required) to validate cryptographic integrity.',
          boxX + 12,
          boxY + 73,
          { width: boxW - 24 }
        );

      // Right Column: Embedded QR Code + Label
      const qrSize = 96;
      const qrX = pageWidth - 64 - qrSize;
      const qrY = footerTopY + 6;

      // White container frame around QR
      doc
        .rect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8)
        .fillAndStroke('#FFFFFF', '#0F172A');

      doc.image(qrBuffer, qrX, qrY, {
        width: qrSize,
        height: qrSize,
      });

      doc
        .font('Courier-Bold')
        .fontSize(7.5)
        .fillColor('#0F172A')
        .text('SCAN TO VERIFY', qrX - 10, qrY + qrSize + 7, {
          width: qrSize + 20,
          align: 'center',
        });

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          filePath,
          publicPdfUrl,
        });
      });

      writeStream.on('error', (err) => {
        reject(new Error(`Error writing certificate PDF file: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Failed to build certificate PDF: ${error.message}`));
    }
  });
}

module.exports = {
  buildCertificatePdf,
  ROLE_LABELS,
  SCOPE_LABELS,
  CATEGORY_LABELS,
};