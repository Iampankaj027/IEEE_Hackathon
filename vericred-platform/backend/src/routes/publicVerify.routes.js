const express = require('express');
const router = express.Router();
const { verifyCertificatePublic } = require('../controllers/publicVerify.controller');

/**
 * @route   GET /api/verify/:certificateNo
 * @desc    Publicly verifies a digital certificate's HMAC-SHA256 signature without requiring a login
 * @access  Public (Open to external recruiters, auditors, and peers)
 */
router.get('/:certificateNo', verifyCertificatePublic);

module.exports = router;