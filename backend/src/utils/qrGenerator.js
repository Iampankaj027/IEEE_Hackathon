const QRCode = require('qrcode');

/**
 * Default institutional styling options for QR code generation.
 * Uses Slate-900 (#0F172A) instead of harsh pure black to match
 * the classic institutional certificate typography.
 */
const DEFAULT_QR_OPTIONS = {
  errorCorrectionLevel: 'M', // Optimal balance of density and scan reliability for long signed URLs
  type: 'image/png',
  quality: 1.0,
  margin: 1,
  width: 240,
  color: {
    dark: '#0F172A', // Institutional Slate-900
    light: '#FFFFFF', // Crisp White background
  },
};

/**
 * Generates a PNG Buffer of the QR code for embedding directly into PDFKit documents.
 *
 * @param {string} verificationUrl - The full signed URL (e.g., https://.../verify/VC-2026-8F92A1?sig=...)
 * @param {Object} [customOptions={}] - Optional width or margin overrides
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generateQrBuffer(verificationUrl, customOptions = {}) {
  if (!verificationUrl || typeof verificationUrl !== 'string') {
    throw new Error('A valid verificationUrl string is required to generate a QR Buffer.');
  }

  try {
    const options = {
      ...DEFAULT_QR_OPTIONS,
      ...customOptions,
      color: {
        ...DEFAULT_QR_OPTIONS.color,
        ...(customOptions.color || {}),
      },
    };

    const buffer = await QRCode.toBuffer(verificationUrl, options);
    return buffer;
  } catch (error) {
    throw new Error(`Failed to generate QR PNG buffer: ${error.message}`);
  }
}

/**
 * Generates a Base64 Data URL (data:image/png;base64,...) of the QR code
 * for instant rendering in React UI previews and modals.
 *
 * @param {string} verificationUrl - The full signed URL
 * @param {Object} [customOptions={}] - Optional width or margin overrides
 * @returns {Promise<string>} Base64 Data URL string
 */
async function generateQrDataUrl(verificationUrl, customOptions = {}) {
  if (!verificationUrl || typeof verificationUrl !== 'string') {
    throw new Error('A valid verificationUrl string is required to generate a QR Data URL.');
  }

  try {
    const options = {
      ...DEFAULT_QR_OPTIONS,
      ...customOptions,
      color: {
        ...DEFAULT_QR_OPTIONS.color,
        ...(customOptions.color || {}),
      },
    };

    const dataUrl = await QRCode.toDataURL(verificationUrl, options);
    return dataUrl;
  } catch (error) {
    throw new Error(`Failed to generate QR Data URL: ${error.message}`);
  }
}

module.exports = {
  generateQrBuffer,
  generateQrDataUrl,
};