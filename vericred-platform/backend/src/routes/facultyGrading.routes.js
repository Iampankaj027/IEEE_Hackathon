const express = require('express');
const router = express.Router();
const {
  getClassGradingMatrix,
  getStudentActivityDetails,
  saveFacultyAssessment,
  exportClassAssessmentExcel,
} = require('../controllers/facultyGrading.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

/**
 * @route   GET /api/faculty/grading/matrix
 * @desc    Retrieves the complete class grading matrix with aggregated points and recommended marks
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.get(
  '/matrix',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  getClassGradingMatrix
);

/**
 * @route   GET /api/faculty/grading/student/:studentId
 * @desc    Retrieves 360° student activity certificates for the side-drawer inspection panel
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.get(
  '/student/:studentId',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  getStudentActivityDetails
);

/**
 * @route   POST /api/faculty/grading/save
 * @desc    Saves and locks final faculty marks allotment for a student
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.post(
  '/save',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  saveFacultyAssessment
);

/**
 * @route   GET /api/faculty/grading/export-excel
 * @desc    Downloads the class marks sheet as a formatted institutional .xlsx spreadsheet
 * @access  Private (Restricted to FACULTY and HOD_ADMIN)
 */
router.get(
  '/export-excel',
  authenticateUser,
  authorizeRoles('FACULTY', 'HOD_ADMIN'),
  exportClassAssessmentExcel
);

module.exports = router;