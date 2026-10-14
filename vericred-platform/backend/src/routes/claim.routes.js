const express = require('express');
const router = express.Router();
const {
  submitClaim,
  reviewClaim,
  getStudentClaims,
  getPendingClaims,
} = require('../controllers/claim.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

/**
 * @route   GET /api/claims/my-claims
 * @desc    Retrieves all participation claims and certificates for the logged-in student
 * @access  Private (Restricted to STUDENT)
 */
router.get('/my-claims', authenticateUser, authorizeRoles('STUDENT'), getStudentClaims);

/**
 * @route   GET /api/claims/pending
 * @desc    Retrieves all pending participation claims awaiting faculty review
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.get('/pending', authenticateUser, authorizeRoles('FACULTY', 'HOD_ADMIN'), getPendingClaims);

/**
 * @route   POST /api/claims
 * @desc    Submits a participation claim for an event (auto-checks against faculty CSV roster)
 * @access  Private (Restricted to STUDENT)
 */
router.post('/', authenticateUser, authorizeRoles('STUDENT'), submitClaim);

/**
 * @route   PUT /api/claims/:id/review
 * @desc    Faculty 1-click review (Approve or Reject) of a pending claim, issuing cryptographic certificate on approval
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.put('/:id/review', authenticateUser, authorizeRoles('FACULTY', 'HOD_ADMIN'), reviewClaim);

module.exports = router;