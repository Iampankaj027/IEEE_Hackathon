const express = require('express');
const router = express.Router();
const {
  createPasscodes,
  listPasscodes,
  revokePasscode,
  deletePasscode,
  getPasscodeStats,
} = require('../controllers/admin.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

// All admin routes require authentication + HOD_ADMIN role
router.use(authenticateUser);
router.use(authorizeRoles('HOD_ADMIN'));

/**
 * @route   POST /api/admin/passcodes
 * @desc    Generate one or more faculty registration passcodes
 * @access  HOD_ADMIN only
 */
router.post('/passcodes', createPasscodes);

/**
 * @route   GET /api/admin/passcodes
 * @desc    List all passcodes created by the current HOD_ADMIN
 * @access  HOD_ADMIN only
 */
router.get('/passcodes', listPasscodes);

/**
 * @route   GET /api/admin/passcodes/stats
 * @desc    Aggregate stats for passcodes created by this admin
 * @access  HOD_ADMIN only
 */
router.get('/passcodes/stats', getPasscodeStats);

/**
 * @route   PATCH /api/admin/passcodes/:id/revoke
 * @desc    Revoke a specific passcode (renders it unusable)
 * @access  HOD_ADMIN only
 */
router.patch('/passcodes/:id/revoke', revokePasscode);

/**
 * @route   DELETE /api/admin/passcodes/:id
 * @desc    Permanently delete a passcode (only if unconsumed)
 * @access  HOD_ADMIN only
 */
router.delete('/passcodes/:id', deletePasscode);

module.exports = router;
