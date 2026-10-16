const express = require('express');
const router = express.Router();
const {
  getMyCertificates,
  getLinkedInShareUrl,
  getPublicStudentPortfolio,
} = require('../controllers/certificate.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

/**
 * @route   GET /api/certificates/my-certificates
 * @desc    Retrieves all cryptographic certificates earned by the logged-in student
 * @access  Private (Restricted to STUDENT)
 */
router.get('/my-certificates', authenticateUser, authorizeRoles('STUDENT'), getMyCertificates);

/**
 * @route   GET /api/certificates/:id/linkedin-share
 * @desc    Generates official pre-filled LinkedIn certification add URL for 1-click show-off
 * @access  Private (Restricted to STUDENT)
 */
router.get('/:id/linkedin-share', authenticateUser, authorizeRoles('STUDENT'), getLinkedInShareUrl);

/**
 * @route   GET /api/certificates/portfolio/:rollNo
 * @desc    Retrieves a student's public verifiable portfolio and achievement timeline by Roll Number
 * @access  Public (No login required for recruiters / external stakeholders)
 */
router.get('/portfolio/:rollNo', getPublicStudentPortfolio);

module.exports = router;