const express = require('express');
const router = express.Router();
const {
  createEvent,
  listEvents,
  getEventById,
  uploadEventCsv,
  previewEventCsv,
  confirmEventCsvMapping,
} = require('../controllers/event.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { uploadCsv } = require('../middlewares/upload.middleware');

/**
 * @route   GET /api/events
 * @desc    Retrieves all institutional events (with optional category/department filters)
 * @access  Private (Authenticated Students & Faculty)
 */
router.get('/', authenticateUser, listEvents);

/**
 * @route   GET /api/events/:id
 * @desc    Retrieves a single event by ID with its claims and CSV roster
 * @access  Private (Authenticated Students & Faculty)
 */
router.get('/:id', authenticateUser, getEventById);

/**
 * @route   POST /api/events
 * @desc    Creates a new institutional event
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.post('/', authenticateUser, authorizeRoles('FACULTY', 'HOD_ADMIN'), createEvent);

/**
 * @route   POST /api/events/:id/upload-roster
 * @desc    Uploads a master participant CSV roster for an event, auto-verifying matching claims
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.post(
  '/:id/upload-roster',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  uploadCsv.single('rosterFile'),
  uploadEventCsv
);

// Step 1: Upload CSV → get headers + preview rows + suggested column mapping
router.post(
  '/:id/preview-csv',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  uploadCsv.single('rosterFile'),
  previewEventCsv
);

// Step 2: Submit confirmed column mapping → process CSV and issue certificates
router.post(
  '/:id/confirm-csv',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  confirmEventCsvMapping
);

module.exports = router;