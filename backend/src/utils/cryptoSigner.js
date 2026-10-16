const crypto = require('crypto');

/**
 * Generates a unique, institutional-grade human-readable Certificate Number
 * Format: VC-{YEAR}-{6_CHAR_HEX} (e.g., VC-2026-9F4A2C)
 * @returns {string}
 */
function generateCertificateNo() {
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VC-${year}-${randomHex}`;
}

/**
 * Constructs a deterministic canonical payload string from certificate attributes.
 * Even a 1-character change in Roll No, Role, or Event ID will completely alter the hash.
 *
 * @param {Object} params
 * @param {string} params.certificateNo - e.g., "VC-2026-9F4A2C"
 * @param {string} params.studentRollNo - e.g., "23ESKIT045"
 * @param {string} params.eventId - UUID of the event
 * @param {string} params.participationRole - e.g., "WINNER_1ST"
 * @param {string} params.issuedAtISO - ISO-8601 date string
 * @returns {string} Canonical pipe-delimited payload string
 */
function buildCanonicalPayload({
  certificateNo,
  studentRollNo,
  eventId,
  participationRole,
  issuedAtISO,
}) {
  if (!certificateNo || !studentRollNo || !eventId || !participationRole || !issuedAtISO) {
    throw new Error('Missing required fields for cryptographic payload construction.');
  }

  const normalizedRoll = String(studentRollNo).trim().toUpperCase();
  const normalizedCertNo = String(certificateNo).trim().toUpperCase();
  const normalizedRole = String(participationRole).trim().toUpperCase();

  return [
    normalizedCertNo,
    normalizedRoll,
    String(eventId).trim(),
    normalizedRole,
    String(issuedAtISO).trim(),
  ].join('|');
}

/**
 * Computes an HMAC-SHA256 signature for the given canonical payload string.
 *
 * @param {string} payloadString - Output from buildCanonicalPayload()
 * @returns {string} 64-character hexadecimal HMAC-SHA256 signature
 */
function signPayload(payloadString) {
  const secret = process.env.CRYPTO_HMAC_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'CRITICAL SECURITY ERROR: CRYPTO_HMAC_SECRET must be defined in .env and be at least 32 characters long.'
    );
  }

  return crypto
    .createHmac('sha256', secret)
    .update(payloadString, 'utf8')
    .digest('hex');
}

/**
 * High-level helper used during certificate issuance.
 * Builds the canonical payload, signs it, and constructs the public QR verification URL.
 *
 * @param {Object} data
 * @param {string} data.certificateNo
 * @param {string} data.studentRollNo
 * @param {string} data.eventId
 * @param {string} data.participationRole
 * @param {Date|string} data.issuedAt
 * @returns {{
 *   payloadString: string,
 *   cryptoSignature: string,
 *   qrVerificationUrl: string
 * }}
 */
function createSignedCertificateBundle({
  certificateNo,
  studentRollNo,
  eventId,
  participationRole,
  issuedAt,
}) {
  const issuedAtISO =
    issuedAt instanceof Date ? issuedAt.toISOString() : new Date(issuedAt).toISOString();

  const payloadString = buildCanonicalPayload({
    certificateNo,
    studentRollNo,
    eventId,
    participationRole,
    issuedAtISO,
  });

  const cryptoSignature = signPayload(payloadString);

  const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const qrVerificationUrl = `${frontendBaseUrl}/verify/${encodeURIComponent(
    certificateNo
  )}?sig=${cryptoSignature}`;

  return {
    payloadString,
    cryptoSignature,
    qrVerificationUrl,
  };
}

/**
 * Verifies a certificate's authenticity in constant time (prevents timing side-channel attacks).
 * Used by the Zero-Login Public Verification endpoint when a QR code is scanned.
 *
 * @param {string} payloadString - The original canonical string stored in DB (or reconstructed from DB fields)
 * @param {string} providedSignature - The `sig` query parameter from the QR Code / URL
 * @returns {boolean} True if authentic and untampered, false otherwise
 */
function verifyCertificateSignature(payloadString, providedSignature) {
  try {
    if (!payloadString || !providedSignature) {
      return false;
    }

    const expectedSignature = signPayload(payloadString);

    // Ensure both hex strings are valid and of equal byte length before timingSafeEqual
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const providedBuffer = Buffer.from(String(providedSignature).trim(), 'hex');

    if (expectedBuffer.length !== providedBuffer.length || expectedBuffer.length === 0) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
  } catch (error) {
    return false;
  }
}

module.exports = {
  generateCertificateNo,
  buildCanonicalPayload,
  signPayload,
  createSignedCertificateBundle,
  verifyCertificateSignature,
};