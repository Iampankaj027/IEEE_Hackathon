const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getCurrentUser,
} = require('../controllers/auth.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Registers a new Student, Faculty, or HOD Admin account
 * @access  Public
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticates user credentials and returns a signed JWT token
 * @access  Public
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Retrieves the currently authenticated user profile
 * @access  Private (Requires Bearer Token)
 */
router.get('/me', authenticateUser, getCurrentUser);

module.exports = router;