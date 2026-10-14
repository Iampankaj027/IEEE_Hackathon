const prisma = require('../config/db');
const { calculateRecommendedMarks } = require('../config/creditRules');
const { exportFacultyMarksToExcel } = require('../utils/excelExporter');

/**
 * Retrieves the complete class grading matrix for a department and semester.
 * Aggregates verified certificates, calculates points, and computes recommended marks.
 * GET /api/faculty/grading/matrix
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function getClassGradingMatrix(req, res) {
  try {
    const { department, semester, maxMarks = 20, targetPoints = 60 } = req.query;

    if (!department || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Department and semester query parameters are required.',
      });
    }

    const parsedSemester = parseInt(semester, 10);
    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);

    // 1. Fetch all students in this department and semester
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        department: { equals: department.trim(), mode: 'insensitive' },
        currentSemester: parsedSemester,
      },
      include: {
        certificates: {
          where: { isRevoked: false },
          include: {
            event: {
              select: {
                category: true,
                scope: true,
                title: true,
              },
            },
          },
        },
        marksReceived: {
          where: { semester: parsedSemester },
        },
      },
      orderBy: { rollNo: 'asc' },
    });

    // 2. Process and aggregate each student's certificates
    const studentRows = students.map((student) => {
      let verifiedCertsCount = student.certificates.length;
      let totalCreditPoints = 0;

      const categoryCounts = {
        TECHNICAL: 0,
        HACKATHON: 0,
        SPORTS: 0,
        CULTURAL: 0,
        NSS_SOCIAL: 0,
        WORKSHOP_SEMINAR: 0,
      };

      student.certificates.forEach((cert) => {
        totalCreditPoints += cert.creditPoints;
        const cat = cert.event.category;
        if (categoryCounts[cat] !== undefined) {
          categoryCounts[cat]++;
        }
      });

      // Build readable category breakdown text (e.g., "2 Tech, 1 Hackathon, 1 Sports")
      const breakdownParts = [];
      if (categoryCounts.TECHNICAL > 0) breakdownParts.push(`${categoryCounts.TECHNICAL} Tech`);
      if (categoryCounts.HACKATHON > 0) breakdownParts.push(`${categoryCounts.HACKATHON} Hackathon`);
      if (categoryCounts.SPORTS > 0) breakdownParts.push(`${categoryCounts.SPORTS} Sports`);
      if (categoryCounts.CULTURAL > 0) breakdownParts.push(`${categoryCounts.CULTURAL} Cultural`);
      if (categoryCounts.NSS_SOCIAL > 0) breakdownParts.push(`${categoryCounts.NSS_SOCIAL} NSS`);
      if (categoryCounts.WORKSHOP_SEMINAR > 0) breakdownParts.push(`${categoryCounts.WORKSHOP_SEMINAR} Workshop`);

      const categoryBreakdownText =
        breakdownParts.length > 0 ? breakdownParts.join(', ') : 'No verified activity';

      // Calculate recommended marks using the rule engine
      const recommendedMarks = calculateRecommendedMarks(
        totalCreditPoints,
        parsedMaxMarks,
        parsedTargetPoints
      );

      // Check if faculty already locked in an assessment
      const existingAssessment = student.marksReceived[0] || null;

      return {
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        email: student.email,
        section: student.section,
        verifiedCertsCount,
        categoryBreakdownText,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: existingAssessment ? existingAssessment.finalMarksAllotted : recommendedMarks,
        isLocked: existingAssessment ? existingAssessment.isLocked : false,
        remarks: existingAssessment ? existingAssessment.remarks : '',
      };
    });

    return res.status(200).json({
      success: true,
      department,
      semester: parsedSemester,
      totalStudents: studentRows.length,
      studentRows,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch class grading matrix: ${error.message}`,
    });
  }
}

/**
 * Retrieves 360° student activity details for the side-drawer inspection panel.
 * GET /api/faculty/grading/student/:studentId
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function getStudentActivityDetails(req, res) {
  try {
    const { studentId } = req.params;
    const { semester } = req.query;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        name: true,
        rollNo: true,
        department: true,
        batchYear: true,
        currentSemester: true,
        section: true,
        totalCreditPoints: true,
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const certWhereClause = { studentId, isRevoked: false };
    if (semester) {
      certWhereClause.semester = parseInt(semester, 10);
    }

    const certificates = await prisma.certificate.findMany({
      where: certWhereClause,
      include: {
        event: {
          select: {
            title: true,
            category: true,
            scope: true,
            eventDate: true,
            organizerDept: true,
            semesterTag: true,
            naacCriteriaTag: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      student,
      certificates,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch student 360 activity details: ${error.message}`,
    });
  }
}

/**
 * Saves and locks final faculty marks allotment for a student.
 * POST /api/faculty/grading/save
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function saveFacultyAssessment(req, res) {
  try {
    const {
      studentId,
      semester,
      evaluationTitle = 'SODECA / Co-Curricular Assessment',
      finalMarksAllotted,
      maxMarks = 20,
      remarks,
    } = req.body;

    if (!studentId || !semester || finalMarksAllotted === undefined) {
      return res.status(400).json({
        success: false,
        message: 'studentId, semester, and finalMarksAllotted are mandatory fields.',
      });
    }

    const parsedSemester = parseInt(semester, 10);
    const parsedFinalMarks = parseFloat(finalMarksAllotted);
    const parsedMaxMarks = parseFloat(maxMarks);

    if (parsedFinalMarks > parsedMaxMarks || parsedFinalMarks < 0) {
      return res.status(400).json({
        success: false,
        message: `Final marks must be between 0 and ${parsedMaxMarks}.`,
      });
    }

    // Fetch student's current stats to snapshot
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        certificates: {
          where: { isRevoked: false, semester: parsedSemester },
        },
      },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found.',
      });
    }

    const totalCertsCount = student.certificates.length;
    const totalCreditPoints = student.certificates.reduce((sum, c) => sum + c.creditPoints, 0);
    const recommendedMarks = calculateRecommendedMarks(totalCreditPoints, parsedMaxMarks, 60);

    // Upsert the assessment record
    const assessment = await prisma.facultyAssessment.upsert({
      where: {
        studentId_semester_evaluationTitle: {
          studentId,
          semester: parsedSemester,
          evaluationTitle: evaluationTitle.trim(),
        },
      },
      update: {
        facultyId: req.user.id,
        totalCertsCount,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: parsedFinalMarks,
        maxMarks: parsedMaxMarks,
        remarks: remarks ? remarks.trim() : null,
        isLocked: true,
      },
      create: {
        studentId,
        facultyId: req.user.id,
        semester: parsedSemester,
        evaluationTitle: evaluationTitle.trim(),
        totalCertsCount,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: parsedFinalMarks,
        maxMarks: parsedMaxMarks,
        remarks: remarks ? remarks.trim() : null,
        isLocked: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Faculty assessment successfully saved and locked.',
      assessment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to save faculty assessment: ${error.message}`,
    });
  }
}

/**
 * Triggers the Excel exporter utility to download the class marks sheet (.xlsx)
 * GET /api/faculty/grading/export-excel
 * Restricted to: FACULTY, HOD_ADMIN
 */
async function exportClassAssessmentExcel(req, res) {
  try {
    const { department, semester, maxMarks = 20, targetPoints = 60, evaluationTitle = 'Internal Assessment' } = req.query;

    if (!department || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Department and semester query parameters are required for export.',
      });
    }

    const parsedSemester = parseInt(semester, 10);
    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);

    // Fetch student matrix rows
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        department: { equals: department.trim(), mode: 'insensitive' },
        currentSemester: parsedSemester,
      },
      include: {
        certificates: {
          where: { isRevoked: false },
          include: { event: { select: { category: true } } },
        },
        marksReceived: {
          where: { semester: parsedSemester },
        },
      },
      orderBy: { rollNo: 'asc' },
    });

    const studentRows = students.map((student) => {
      let verifiedCertsCount = student.certificates.length;
      let totalCreditPoints = student.certificates.reduce((sum, c) => sum + c.creditPoints, 0);

      const categoryCounts = { TECHNICAL: 0, HACKATHON: 0, SPORTS: 0, CULTURAL: 0, NSS_SOCIAL: 0, WORKSHOP_SEMINAR: 0 };
      student.certificates.forEach((c) => {
        if (categoryCounts[c.event.category] !== undefined) categoryCounts[c.event.category]++;
      });

      const breakdownParts = [];
      if (categoryCounts.TECHNICAL > 0) breakdownParts.push(`${categoryCounts.TECHNICAL} Tech`);
      if (categoryCounts.HACKATHON > 0) breakdownParts.push(`${categoryCounts.HACKATHON} Hackathon`);
      if (categoryCounts.SPORTS > 0) breakdownParts.push(`${categoryCounts.SPORTS} Sports`);
      if (categoryCounts.CULTURAL > 0) breakdownParts.push(`${categoryCounts.CULTURAL} Cultural`);
      if (categoryCounts.NSS_SOCIAL > 0) breakdownParts.push(`${categoryCounts.NSS_SOCIAL} NSS`);
      if (categoryCounts.WORKSHOP_SEMINAR > 0) breakdownParts.push(`${categoryCounts.WORKSHOP_SEMINAR} Workshop`);

      const categoryBreakdownText = breakdownParts.length > 0 ? breakdownParts.join(', ') : 'No verified activity';
      const recommendedMarks = calculateRecommendedMarks(totalCreditPoints, parsedMaxMarks, parsedTargetPoints);
      const existingAssessment = student.marksReceived[0] || null;

      return {
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        verifiedCertsCount,
        categoryBreakdownText,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: existingAssessment ? existingAssessment.finalMarksAllotted : recommendedMarks,
        remarks: existingAssessment ? existingAssessment.remarks : '',
      };
    });

    const { filePath, fileName } = await exportFacultyMarksToExcel({
      department,
      semester: parsedSemester,
      evaluationTitle,
      studentRows,
    });

    return res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('File download error:', err);
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to export class assessment Excel sheet: ${error.message}`,
    });
  }
}

module.exports = {
  getClassGradingMatrix,
  getStudentActivityDetails,
  saveFacultyAssessment,
  exportClassAssessmentExcel,
};