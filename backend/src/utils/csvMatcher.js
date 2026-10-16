const fs = require('fs');
const csv = require('csv-parser');
const prisma = require('../config/db');
const { calculateCertificatePoints } = require('../config/creditRules');
const {
  generateCertificateNo,
  createSignedCertificateBundle,
} = require('./cryptoSigner');
const { buildCertificatePdf } = require('./certificateBuilder');
const { createNotification } = require('./notificationHelper');

/**
 * Normalizes human-written role strings from a Faculty CSV (e.g., "1st Prize", "Winner", "Coord")
 * into the strict Prisma ParticipationRole enum.
 *
 * @param {string} rawRole
 * @returns {string} Valid ParticipationRole enum value
 */
function normalizeParticipationRole(rawRole) {
  if (!rawRole) return 'PARTICIPANT';
  const cleaned = String(rawRole).trim().toUpperCase();

  if (
    cleaned === 'WINNER_1ST' ||
    cleaned === '1ST' ||
    cleaned === 'FIRST' ||
    cleaned === 'WINNER' ||
    cleaned === '1ST PLACE' ||
    cleaned === 'GOLD'
  ) {
    return 'WINNER_1ST';
  }
  if (
    cleaned === 'WINNER_2ND' ||
    cleaned === '2ND' ||
    cleaned === 'SECOND' ||
    cleaned === 'RUNNER UP' ||
    cleaned === 'RUNNER-UP' ||
    cleaned === '2ND PLACE' ||
    cleaned === 'SILVER'
  ) {
    return 'WINNER_2ND';
  }
  if (
    cleaned === 'WINNER_3RD' ||
    cleaned === '3RD' ||
    cleaned === 'THIRD' ||
    cleaned === '2ND RUNNER UP' ||
    cleaned === '3RD PLACE' ||
    cleaned === 'BRONZE'
  ) {
    return 'WINNER_3RD';
  }
  if (cleaned.includes('FINALIST')) {
    return 'FINALIST';
  }
  if (
    cleaned.includes('ORGANIZER') ||
    cleaned.includes('COORDINATOR') ||
    cleaned.includes('LEAD')
  ) {
    return 'ORGANIZER';
  }
  if (cleaned.includes('VOLUNTEER')) {
    return 'VOLUNTEER';
  }

  return 'PARTICIPANT';
}

/**
 * Extracts a field from a CSV row object case-insensitively across multiple possible header aliases.
 *
 * @param {Object} row - Raw row object from csv-parser
 * @param {string[]} possibleKeys - Array of lowercase header names to check
 * @returns {string|null}
 */
function extractCsvField(row, possibleKeys) {
  const rowKeys = Object.keys(row);
  for (const key of rowKeys) {
    const normalizedKey = key.trim().toLowerCase().replace(/[\s_-]+/g, '');
    if (possibleKeys.includes(normalizedKey)) {
      const val = row[key];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }
  return null;
}

/**
 * Reads the first N rows + all headers from a CSV file for column-mapping preview.
 * Also suggests a best-guess mapping based on known aliases.
 *
 * @param {string} filePath
 * @param {number} [maxRows=5]
 * @returns {Promise<{ headers: string[], previewRows: Object[], suggestedMapping: { rollNo, name, role } }>}
 */
function parseParticipantCsvPreview(filePath, maxRows = 5) {
  return new Promise((resolve, reject) => {
    const headers = [];
    const previewRows = [];
    let headersSet = false;

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (h) => {
        headers.push(...h);
        headersSet = true;
      })
      .on('data', (row) => {
        if (!headersSet) headers.push(...Object.keys(row));
        if (previewRows.length < maxRows) previewRows.push(row);
      })
      .on('end', () => {
        const suggestedMapping = suggestColumnMapping(headers);
        resolve({ headers, previewRows, suggestedMapping });
      })
      .on('error', (err) => reject(new Error(`CSV Preview Error: ${err.message}`)));
  });
}

/**
 * Suggests which CSV header maps to rollNo / name / role using known alias sets.
 */
function suggestColumnMapping(headers) {
  const ROLL_ALIASES = new Set([
    'rollno', 'rollnumber', 'studentrollno', 'enrollmentno', 'enrollment',
    'universityrollno', 'regno', 'id', 'prn', 'sapid', 'htno',
    'admno', 'admissionno', 'studentid', 'uid',
  ]);
  const NAME_ALIASES = new Set([
    'name', 'studentname', 'fullname', 'participantname',
    'sname', 'studname', 'candidatename',
  ]);
  const ROLE_ALIASES = new Set([
    'role', 'participationrole', 'position', 'rank', 'status',
    'achievement', 'award', 'prize', 'category', 'result',
    'prizewon', 'awardwon', 'performance',
  ]);

  const norm = (s) => s.trim().toLowerCase().replace(/[\s_\-.]+/g, '');
  const suggested = { rollNo: '', name: '', role: '' };

  for (const h of headers) {
    const n = norm(h);
    if (!suggested.rollNo && ROLL_ALIASES.has(n)) suggested.rollNo = h;
    if (!suggested.name && NAME_ALIASES.has(n)) suggested.name = h;
    if (!suggested.role && ROLE_ALIASES.has(n)) suggested.role = h;
  }

  return suggested;
}

/**
 * Parses a CSV using an explicit { rollNo, name, role } column mapping
 * (column values are the actual header strings from the uploaded file).
 *
 * @param {string} filePath
 * @param {{ rollNo: string, name: string, role: string }} columnMapping
 * @returns {Promise<Array<{ studentRollNo, studentName, participationRole }>>}
 */
function parseParticipantCsvWithMapping(filePath, columnMapping) {
  return new Promise((resolve, reject) => {
    const participantsMap = new Map();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const rawRollNo = columnMapping.rollNo ? row[columnMapping.rollNo] : null;
        if (!rawRollNo || !String(rawRollNo).trim()) return;

        const studentRollNo = String(rawRollNo).trim().toUpperCase();
        const studentName = columnMapping.name
          ? (row[columnMapping.name] ? String(row[columnMapping.name]).trim() : null)
          : null;
        const rawRole = columnMapping.role ? row[columnMapping.role] : null;
        const participationRole = normalizeParticipationRole(rawRole);

        participantsMap.set(studentRollNo, { studentRollNo, studentName, participationRole });
      })
      .on('end', () => resolve(Array.from(participantsMap.values())))
      .on('error', (err) => reject(new Error(`CSV Mapping Parse Error: ${err.message}`)));
  });
}

/**
 * Parses an uploaded CSV file into a clean, deduplicated array of participant records.
 *
 * @param {string} filePath - Absolute path to uploaded CSV file
 * @returns {Promise<Array<{ studentRollNo: string, studentName: string|null, participationRole: string }>>}
 */
function parseParticipantCsv(filePath) {
  return new Promise((resolve, reject) => {
    const participantsMap = new Map();

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const rawRollNo = extractCsvField(row, [
          'rollno',
          'rollnumber',
          'studentrollno',
          'enrollmentno',
          'enrollment',
          'universityrollno',
          'regno',
          'id',
        ]);

        if (!rawRollNo) return; // Skip empty or malformed rows without a Roll No

        const studentRollNo = rawRollNo.toUpperCase();
        const studentName = extractCsvField(row, [
          'name',
          'studentname',
          'fullname',
          'participantname',
        ]);
        const rawRole = extractCsvField(row, [
          'role',
          'participationrole',
          'position',
          'rank',
          'status',
          'category',
          'achievement',
        ]);

        const participationRole = normalizeParticipationRole(rawRole);

        participantsMap.set(studentRollNo, {
          studentRollNo,
          studentName: studentName || null,
          participationRole,
        });
      })
      .on('end', () => {
        resolve(Array.from(participantsMap.values()));
      })
      .on('error', (error) => {
        reject(new Error(`CSV Parsing Error: ${error.message}`));
      });
  });
}

/**
 * Atomic helper that approves a student's ParticipationClaim, generates the HMAC-SHA256
 * cryptographic signature, builds the PDF certificate with QR code, saves the Certificate
 * record, and increments the student's totalCreditPoints.
 *
 * Used by BOTH the CSV Auto-Matcher and Faculty 1-Click Approval.
 *
 * @param {Object} params
 * @param {string} params.claimId - UUID of the ParticipationClaim
 * @param {string} params.approvalStatus - 'APPROVED_BY_CSV' | 'APPROVED_BY_FACULTY'
 * @param {string} [params.verifiedById] - UUID of Faculty User who verified/uploaded CSV
 * @param {string} [params.overrideRole] - Optional authoritative role from Faculty CSV
 * @returns {Promise<Object>} The newly created Certificate record
 */
async function issueCertificateForClaim({
  claimId,
  approvalStatus,
  verifiedById = null,
  overrideRole = null,
}) {
  // 1. Fetch complete claim with student, event, and verifier details
  const claim = await prisma.participationClaim.findUnique({
    where: { id: claimId },
    include: {
      student: true,
      event: {
        include: {
          createdBy: true,
        },
      },
      certificate: true,
    },
  });

  if (!claim) {
    throw new Error(`Claim with ID ${claimId} not found.`);
  }

  // If certificate is already generated for this claim, return it idempotently
  if (claim.certificate) {
    return claim.certificate;
  }

  const finalRole = overrideRole || claim.claimedRole;
  const issuedAt = new Date();
  const certificateNo = generateCertificateNo();
  const studentRollNo = (claim.student.rollNo || claim.student.id).toUpperCase();

  // 2. Calculate credit points based on Event Scope + Final Participation Role
  const creditPoints = calculateCertificatePoints(claim.event.scope, finalRole);
  const semester = claim.student.currentSemester || claim.event.semesterTag || 5;

  // 3. Create Cryptographic Payload & HMAC-SHA256 Signature
  const { payloadString, cryptoSignature, qrVerificationUrl } =
    createSignedCertificateBundle({
      certificateNo,
      studentRollNo,
      eventId: claim.event.id,
      participationRole: finalRole,
      issuedAt,
    });

  // Determine Verifier display name for the PDF
  let verifierName = 'Institutional Verification Cell (IQAC)';
  if (verifiedById) {
    const verifierUser = await prisma.user.findUnique({
      where: { id: verifiedById },
      select: { name: true, department: true },
    });
    if (verifierUser) {
      verifierName = `${verifierUser.name} (${verifierUser.department})`;
    }
  } else if (claim.event.createdBy) {
    verifierName = `${claim.event.createdBy.name} (${claim.event.organizerDept})`;
  }

  // 4. Execute Database Transaction: Update Claim + Create Certificate + Increment Student Points
  // PDF generation is intentionally moved AFTER the transaction so the HTTP response
  // is not blocked by slow PDFKit/QR rendering. pdfUrl is updated once the background
  // job completes (usually within 2–5 seconds).
  const createdCertificate = await prisma.$transaction(async (tx) => {
    await tx.participationClaim.update({
      where: { id: claim.id },
      data: {
        claimedRole: finalRole,
        status: approvalStatus,
        verifiedById: verifiedById || claim.event.createdById,
        verifiedAt: issuedAt,
        rejectionReason: null,
      },
    });

    const cert = await tx.certificate.create({
      data: {
        certificateNo,
        claimId: claim.id,
        studentId: claim.student.id,
        eventId: claim.event.id,
        participationRole: finalRole,
        creditPoints,
        semester,
        payloadString,
        cryptoSignature,
        qrVerificationUrl,
        pdfUrl: null, // set by background job below
        issuedAt,
      },
    });

    await tx.user.update({
      where: { id: claim.student.id },
      data: { totalCreditPoints: { increment: creditPoints } },
    });

    await tx.eventCsvRoster.updateMany({
      where: { eventId: claim.event.id, studentRollNo },
      data: { isClaimed: true },
    });

    return cert;
  });

  // 5. Generate PDF in background — does not block the HTTP response.
  // All data is captured in closure. Certificate record already exists in DB.
  setImmediate(async () => {
    try {
      const { publicPdfUrl } = await buildCertificatePdf({
        certificateNo,
        studentName: claim.student.name,
        studentRollNo,
        studentDepartment: claim.student.department,
        eventTitle: claim.event.title,
        eventCategory: claim.event.category,
        eventScope: claim.event.scope,
        eventDate: claim.event.eventDate,
        participationRole: finalRole,
        creditPoints,
        semester,
        cryptoSignature,
        qrVerificationUrl,
        issuedAt,
        verifierName,
      });

      await prisma.certificate.update({
        where: { id: createdCertificate.id },
        data: { pdfUrl: publicPdfUrl },
      });
    } catch (err) {
      console.error(`[PDF] Background generation failed for ${certificateNo}:`, err.message);
    }
  });

  return createdCertificate;
}

/**
 * Processes a Faculty CSV Upload for a specific Event:
 * 1. Parses and upserts all rows into EventCsvRoster.
 * 2. Finds any existing PENDING claims from students whose Roll No is in the CSV.
 * 3. Automatically verifies those claims and issues their cryptographic certificates.
 * 4. Also auto-creates claims + certificates for registered students in the DB who haven't manually filled the form yet!
 *
 * @param {Object} params
 * @param {string} params.eventId - UUID of the Event
 * @param {string} params.csvFilePath - Path to uploaded CSV file
 * @param {string} params.facultyId - UUID of the Faculty uploading the CSV
 * @param {boolean} [params.autoIssueForRegisteredStudents=true] - If a student exists in User table with that RollNo, issue cert directly even if they didn't submit a manual claim yet
 * @returns {Promise<{
 *   totalRowsParsed: number,
 *   rosterSavedCount: number,
 *   pendingClaimsAutoVerified: number,
 *   directCertificatesIssued: number,
 *   issuedCertificates: Array<Object>
 * }>}
 */
async function processEventCsvUpload({
  eventId,
  csvFilePath,
  facultyId,
  autoIssueForRegisteredStudents = true,
  columnMapping = null,
}) {
  const parsedRows = columnMapping
    ? await parseParticipantCsvWithMapping(csvFilePath, columnMapping)
    : await parseParticipantCsv(csvFilePath);

  if (parsedRows.length === 0) {
    throw new Error(
      'No valid student records found in CSV. Ensure the CSV has a column named "roll_no" or "RollNo".'
    );
  }

  let rosterSavedCount = 0;
  let pendingClaimsAutoVerified = 0;
  let directCertificatesIssued = 0;
  const issuedCertificates = [];

  for (const row of parsedRows) {
    const { studentRollNo, studentName, participationRole } = row;

    // 1. Upsert into EventCsvRoster
    await prisma.eventCsvRoster.upsert({
      where: {
        eventId_studentRollNo: {
          eventId,
          studentRollNo,
        },
      },
      update: {
        studentName,
        participationRole,
      },
      create: {
        eventId,
        studentRollNo,
        studentName,
        participationRole,
        isClaimed: false,
      },
    });
    rosterSavedCount++;

    // 2. Check if a student with this Roll No exists in the User table
    const studentUser = await prisma.user.findUnique({
      where: { rollNo: studentRollNo },
    });

    if (!studentUser) {
      // Student hasn't registered on the platform yet; their row stays in EventCsvRoster
      // and will auto-verify the moment they register and submit a claim.
      continue;
    }

    // 3. Check if this student already submitted a ParticipationClaim for this event
    const existingClaim = await prisma.participationClaim.findUnique({
      where: {
        studentId_eventId: {
          studentId: studentUser.id,
          eventId,
        },
      },
      include: {
        certificate: true,
      },
    });

    if (existingClaim) {
      if (!existingClaim.certificate) {
        // Auto-verify their pending claim and generate their certificate!
        const cert = await issueCertificateForClaim({
          claimId: existingClaim.id,
          approvalStatus: 'APPROVED_BY_CSV',
          verifiedById: facultyId,
          overrideRole: participationRole,
        });
        pendingClaimsAutoVerified++;
        issuedCertificates.push(cert);

        await createNotification({
          userId: studentUser.id,
          type: 'CLAIM_APPROVED_CSV',
          title: 'Participation Verified — Certificate Issued',
          body: `Your pending claim was matched against the official faculty CSV roster. Certificate ${cert?.certificateNo} (+${cert?.creditPoints} pts) is ready.`,
          metadata: {
            certificateNo: cert?.certificateNo,
            creditPoints: cert?.creditPoints,
            claimId: existingClaim.id,
          },
        });
      }
    } else if (autoIssueForRegisteredStudents) {
      // Student is registered in DB but hasn't filled the claim form yet.
      // Create the claim automatically from Faculty's official CSV and issue the certificate immediately!
      const newClaim = await prisma.participationClaim.create({
        data: {
          studentId: studentUser.id,
          eventId,
          claimedRole: participationRole,
          achievementNotes: 'Auto-enrolled via Official Faculty Master CSV Roster',
          status: 'APPROVED_BY_CSV',
          verifiedById: facultyId,
          verifiedAt: new Date(),
        },
      });

      const cert = await issueCertificateForClaim({
        claimId: newClaim.id,
        approvalStatus: 'APPROVED_BY_CSV',
        verifiedById: facultyId,
        overrideRole: participationRole,
      });

      directCertificatesIssued++;
      issuedCertificates.push(cert);

      await createNotification({
        userId: studentUser.id,
        type: 'CLAIM_APPROVED_CSV',
        title: 'You Were Added to an Event — Certificate Issued',
        body: `Faculty roster listed you as a participant. Certificate ${cert?.certificateNo} (+${cert?.creditPoints} pts) has been automatically issued to your account.`,
        metadata: {
          certificateNo: cert?.certificateNo,
          creditPoints: cert?.creditPoints,
          claimId: newClaim.id,
        },
      });
    }
  }

  // Clean up temporary uploaded CSV file after processing
  try {
    if (fs.existsSync(csvFilePath)) {
      fs.unlinkSync(csvFilePath);
    }
  } catch (_) {
    // Ignore file cleanup warnings
  }

  return {
    totalRowsParsed: parsedRows.length,
    rosterSavedCount,
    pendingClaimsAutoVerified,
    directCertificatesIssued,
    issuedCertificates,
  };
}

module.exports = {
  normalizeParticipationRole,
  parseParticipantCsv,
  parseParticipantCsvPreview,
  parseParticipantCsvWithMapping,
  suggestColumnMapping,
  issueCertificateForClaim,
  processEventCsvUpload,
};