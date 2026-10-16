const express = require('express');
const router = express.Router();
const {
  getClassGradingMatrix,
  getStudentActivityDetails,
  saveFacultyAssessment,
  bulkSaveFacultyAssessments,
  exportClassAssessmentExcel,
} = require('../controllers/facultyGrading.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');

const guard = [authenticateUser, authorizeRoles('FACULTY', 'HOD_ADMIN')];

// GET  /api/faculty/grading/matrix          — full class grading matrix with analytics
router.get('/matrix', ...guard, getClassGradingMatrix);

// GET  /api/faculty/grading/student/:id     — 360° student activity details for drawer
router.get('/student/:studentId', ...guard, getStudentActivityDetails);

// POST /api/faculty/grading/save            — save & lock single student assessment
router.post('/save', ...guard, saveFacultyAssessment);

// POST /api/faculty/grading/bulk-save       — bulk lock all filtered rows
router.post('/bulk-save', ...guard, bulkSaveFacultyAssessments);

// GET  /api/faculty/grading/export-excel    — download institutional .xlsx marks sheet
router.get('/export-excel', ...guard, exportClassAssessmentExcel);

module.exports = router;
