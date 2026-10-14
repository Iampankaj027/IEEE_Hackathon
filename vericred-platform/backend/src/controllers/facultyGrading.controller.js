const prisma = require('../config/db');
const { calculateRecommendedMarks } = require('../config/creditRules');
const { exportFacultyMarksToExcel } = require('../utils/excelExporter');

/**
 * GET /api/faculty/grading/matrix
 * Supports department='ALL'|specific, semester='ALL'|1-8,
 * section='ALL'|A-D, batchYear, maxMarks, targetPoints, baseMinMarks.
 * Returns full student grading matrix + enhanced institutional analytics.
 */
async function getClassGradingMatrix(req, res) {
  try {
    const {
      department = 'ALL',
      semester = 'ALL',
      section = 'ALL',
      batchYear,
      maxMarks = 20,
      targetPoints = 60,
      baseMinMarks = 0,
    } = req.query;

    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);
    const parsedBaseMinMarks = parseFloat(baseMinMarks);

    const whereClause = { role: 'STUDENT' };
    if (department !== 'ALL') {
      whereClause.department = { equals: department.trim(), mode: 'insensitive' };
    }
    if (semester !== 'ALL') {
      whereClause.currentSemester = parseInt(semester, 10);
    }
    if (section !== 'ALL') {
      whereClause.section = section.trim();
    }
    if (batchYear) {
      whereClause.batchYear = parseInt(batchYear, 10);
    }

    const marksWhere = semester !== 'ALL' ? { semester: parseInt(semester, 10) } : {};

    const [students, deptGroups] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        include: {
          certificates: {
            where: { isRevoked: false },
            include: {
              event: {
                select: {
                  category: true,
                  scope: true,
                  title: true,
                  naacCriteriaTag: true,
                },
              },
            },
            orderBy: { issuedAt: 'desc' },
          },
          marksReceived: {
            where: marksWhere,
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
        },
        orderBy: [{ department: 'asc' }, { rollNo: 'asc' }],
      }),
      prisma.user.groupBy({
        by: ['department'],
        where: { role: 'STUDENT' },
      }),
    ]);

    const distinctDepartments = deptGroups.map((g) => g.department).sort();

    // ── Per-student aggregation ─────────────────────────────────────────────

    const studentRows = students.map((student) => {
      const categoryCounts = {
        TECHNICAL: 0, HACKATHON: 0, SPORTS: 0,
        CULTURAL: 0, NSS_SOCIAL: 0, WORKSHOP_SEMINAR: 0,
      };
      const scopeCounts = {
        INTRA_COLLEGE: 0, INTER_COLLEGE: 0, STATE: 0, NATIONAL: 0, INTERNATIONAL: 0,
      };

      let totalCreditPoints = 0;
      let lastVerifiedAt = null;

      student.certificates.forEach((cert) => {
        totalCreditPoints += cert.creditPoints;
        if (categoryCounts[cert.event.category] !== undefined) categoryCounts[cert.event.category]++;
        if (scopeCounts[cert.event.scope] !== undefined) scopeCounts[cert.event.scope]++;
        const ts = new Date(cert.issuedAt);
        if (!lastVerifiedAt || ts > new Date(lastVerifiedAt)) lastVerifiedAt = cert.issuedAt;
      });

      const parts = [];
      if (categoryCounts.TECHNICAL > 0) parts.push(`${categoryCounts.TECHNICAL} Tech`);
      if (categoryCounts.HACKATHON > 0) parts.push(`${categoryCounts.HACKATHON} Hackathon`);
      if (categoryCounts.SPORTS > 0) parts.push(`${categoryCounts.SPORTS} Sports`);
      if (categoryCounts.CULTURAL > 0) parts.push(`${categoryCounts.CULTURAL} Cultural`);
      if (categoryCounts.NSS_SOCIAL > 0) parts.push(`${categoryCounts.NSS_SOCIAL} NSS`);
      if (categoryCounts.WORKSHOP_SEMINAR > 0) parts.push(`${categoryCounts.WORKSHOP_SEMINAR} Workshop`);
      const categoryBreakdownText = parts.length > 0 ? parts.join(', ') : 'No verified activity';

      const recommendedMarks = calculateRecommendedMarks(
        totalCreditPoints, parsedMaxMarks, parsedTargetPoints, parsedBaseMinMarks
      );

      const existing = student.marksReceived[0] || null;

      return {
        studentId: student.id,
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        email: student.email,
        department: student.department,
        batchYear: student.batchYear,
        currentSemester: student.currentSemester,
        section: student.section,
        verifiedCertsCount: student.certificates.length,
        categoryCounts,
        scopeCounts,
        categoryBreakdownText,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: existing ? existing.finalMarksAllotted : recommendedMarks,
        isLocked: existing ? existing.isLocked : false,
        remarks: existing ? existing.remarks : '',
        lastVerifiedAt,
      };
    });

    // ── Institution-wide aggregates ─────────────────────────────────────────

    const activeCount = studentRows.filter((s) => s.verifiedCertsCount > 0).length;
    const totalCerts = studentRows.reduce((sum, s) => sum + s.verifiedCertsCount, 0);
    const totalPts = studentRows.reduce((sum, s) => sum + s.totalCreditPoints, 0);

    // Category totals
    const categoryTotals = {
      TECHNICAL: 0, HACKATHON: 0, SPORTS: 0,
      CULTURAL: 0, NSS_SOCIAL: 0, WORKSHOP_SEMINAR: 0,
    };
    studentRows.forEach((s) => {
      Object.keys(categoryTotals).forEach((cat) => { categoryTotals[cat] += s.categoryCounts[cat]; });
    });

    // Scope totals (NIRF / NBA accreditation view)
    const scopeTotals = {
      INTRA_COLLEGE: 0, INTER_COLLEGE: 0, STATE: 0, NATIONAL: 0, INTERNATIONAL: 0,
    };
    studentRows.forEach((s) => {
      Object.keys(scopeTotals).forEach((scope) => { scopeTotals[scope] += (s.scopeCounts[scope] || 0); });
    });

    // NAAC criteria summary — aggregate naacCriteriaTag across all certs
    const naacMap = {};
    students.forEach((student) => {
      student.certificates.forEach((cert) => {
        const tag = cert.event.naacCriteriaTag || 'Uncategorized / Not Mapped';
        naacMap[tag] = (naacMap[tag] || 0) + 1;
      });
    });
    const naacCriteriaSummary = Object.entries(naacMap)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    // Top 3 performers by credit points
    const topPerformers = [...studentRows]
      .filter((s) => s.verifiedCertsCount > 0)
      .sort((a, b) => b.totalCreditPoints - a.totalCreditPoints)
      .slice(0, 3)
      .map((s) => ({
        studentId: s.studentId,
        rollNo: s.rollNo,
        name: s.name,
        department: s.department,
        currentSemester: s.currentSemester,
        verifiedCertsCount: s.verifiedCertsCount,
        totalCreditPoints: s.totalCreditPoints,
      }));

    // Target achievement rate
    const targetAchieversCount = studentRows.filter(
      (s) => s.totalCreditPoints >= parsedTargetPoints
    ).length;
    const targetAchievementRate = studentRows.length > 0
      ? Math.round((targetAchieversCount / studentRows.length) * 100) : 0;

    const highestCreditPoints = studentRows.length > 0
      ? Math.max(...studentRows.map((s) => s.totalCreditPoints)) : 0;

    const analyticsSummary = {
      totalStudents: studentRows.length,
      activeParticipantsCount: activeCount,
      zeroActivityCount: studentRows.length - activeCount,
      participationCoveragePercent: studentRows.length > 0
        ? Math.round((activeCount / studentRows.length) * 100) : 0,
      totalVerifiedCertificates: totalCerts,
      totalInstitutionalCreditPoints: totalPts,
      averageCreditPoints: studentRows.length > 0
        ? Math.round(totalPts / studentRows.length) : 0,
      highestCreditPoints,
      targetAchieversCount,
      targetAchievementRate,
      categoryTotals,
      scopeTotals,
      naacCriteriaSummary,
      topPerformers,
      distinctDepartments,
    };

    return res.status(200).json({
      success: true,
      department,
      semester,
      totalStudents: studentRows.length,
      studentRows,
      analyticsSummary,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch class grading matrix: ${error.message}`,
    });
  }
}

/**
 * GET /api/faculty/grading/student/:studentId
 */
async function getStudentActivityDetails(req, res) {
  try {
    const { studentId } = req.params;
    const { semester } = req.query;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true, name: true, rollNo: true, department: true,
        batchYear: true, currentSemester: true, section: true, totalCreditPoints: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const certWhere = { studentId, isRevoked: false };
    if (semester) certWhere.semester = parseInt(semester, 10);

    const certificates = await prisma.certificate.findMany({
      where: certWhere,
      include: {
        event: {
          select: {
            title: true, category: true, scope: true,
            eventDate: true, organizerDept: true, semesterTag: true, naacCriteriaTag: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    return res.status(200).json({ success: true, student, certificates });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to fetch student activity details: ${error.message}`,
    });
  }
}

/**
 * POST /api/faculty/grading/save
 */
async function saveFacultyAssessment(req, res) {
  try {
    const {
      studentId,
      semester,
      evaluationTitle = 'SODECA / Co-Curricular Assessment',
      finalMarksAllotted,
      maxMarks = 20,
      targetPoints = 60,
      baseMinMarks = 0,
      remarks,
    } = req.body;

    if (!studentId || !semester || finalMarksAllotted === undefined) {
      return res.status(400).json({
        success: false,
        message: 'studentId, semester, and finalMarksAllotted are required.',
      });
    }

    const parsedSemester = parseInt(semester, 10);
    const parsedFinalMarks = parseFloat(finalMarksAllotted);
    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);
    const parsedBaseMinMarks = parseFloat(baseMinMarks);

    if (parsedFinalMarks < parsedBaseMinMarks || parsedFinalMarks > parsedMaxMarks) {
      return res.status(400).json({
        success: false,
        message: `Final marks must be between ${parsedBaseMinMarks} and ${parsedMaxMarks}.`,
      });
    }

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        certificates: { where: { isRevoked: false, semester: parsedSemester } },
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const totalCertsCount = student.certificates.length;
    const totalCreditPoints = student.certificates.reduce((sum, c) => sum + c.creditPoints, 0);
    const recommendedMarks = calculateRecommendedMarks(
      totalCreditPoints, parsedMaxMarks, parsedTargetPoints, parsedBaseMinMarks
    );

    const assessment = await prisma.facultyAssessment.upsert({
      where: {
        studentId_semester_evaluationTitle: {
          studentId, semester: parsedSemester, evaluationTitle: evaluationTitle.trim(),
        },
      },
      update: {
        facultyId: req.user.id,
        totalCertsCount, totalCreditPoints, recommendedMarks,
        finalMarksAllotted: parsedFinalMarks, maxMarks: parsedMaxMarks,
        remarks: remarks ? remarks.trim() : null,
        isLocked: true,
      },
      create: {
        studentId, facultyId: req.user.id,
        semester: parsedSemester, evaluationTitle: evaluationTitle.trim(),
        totalCertsCount, totalCreditPoints, recommendedMarks,
        finalMarksAllotted: parsedFinalMarks, maxMarks: parsedMaxMarks,
        remarks: remarks ? remarks.trim() : null,
        isLocked: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment saved and locked.',
      assessment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to save assessment: ${error.message}`,
    });
  }
}

/**
 * POST /api/faculty/grading/bulk-save
 * Body: { assessments: [{ studentId, semester, finalMarksAllotted, remarks }],
 *         evaluationTitle, maxMarks, targetPoints, baseMinMarks }
 */
async function bulkSaveFacultyAssessments(req, res) {
  try {
    const {
      assessments,
      evaluationTitle = 'SODECA / Co-Curricular Assessment',
      maxMarks = 20,
      targetPoints = 60,
      baseMinMarks = 0,
    } = req.body;

    if (!Array.isArray(assessments) || assessments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'assessments must be a non-empty array.',
      });
    }

    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);
    const parsedBaseMinMarks = parseFloat(baseMinMarks);
    let saved = 0;
    const errors = [];

    for (const item of assessments) {
      const { studentId, semester: itemSemester, finalMarksAllotted, remarks } = item;

      if (!studentId || itemSemester === undefined || finalMarksAllotted === undefined) {
        errors.push({ studentId, reason: 'Missing required fields.' });
        continue;
      }

      const parsedSem = parseInt(itemSemester, 10);
      const parsedMarks = parseFloat(finalMarksAllotted);

      if (parsedMarks < parsedBaseMinMarks || parsedMarks > parsedMaxMarks) {
        errors.push({ studentId, reason: `Marks out of range (${parsedBaseMinMarks}–${parsedMaxMarks}).` });
        continue;
      }

      try {
        const student = await prisma.user.findUnique({
          where: { id: studentId },
          include: {
            certificates: { where: { isRevoked: false, semester: parsedSem } },
          },
        });

        if (!student) { errors.push({ studentId, reason: 'Student not found.' }); continue; }

        const totalCertsCount = student.certificates.length;
        const totalCreditPoints = student.certificates.reduce((s, c) => s + c.creditPoints, 0);
        const recommendedMarks = calculateRecommendedMarks(
          totalCreditPoints, parsedMaxMarks, parsedTargetPoints, parsedBaseMinMarks
        );

        await prisma.facultyAssessment.upsert({
          where: {
            studentId_semester_evaluationTitle: {
              studentId, semester: parsedSem, evaluationTitle: evaluationTitle.trim(),
            },
          },
          update: {
            facultyId: req.user.id,
            totalCertsCount, totalCreditPoints, recommendedMarks,
            finalMarksAllotted: parsedMarks, maxMarks: parsedMaxMarks,
            remarks: remarks ? remarks.trim() : null,
            isLocked: true,
          },
          create: {
            studentId, facultyId: req.user.id,
            semester: parsedSem, evaluationTitle: evaluationTitle.trim(),
            totalCertsCount, totalCreditPoints, recommendedMarks,
            finalMarksAllotted: parsedMarks, maxMarks: parsedMaxMarks,
            remarks: remarks ? remarks.trim() : null,
            isLocked: true,
          },
        });
        saved++;
      } catch (e) {
        errors.push({ studentId, reason: e.message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk save complete: ${saved} saved, ${errors.length} failed.`,
      saved,
      failed: errors.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Bulk save failed: ${error.message}`,
    });
  }
}

/**
 * GET /api/faculty/grading/export-excel
 */
async function exportClassAssessmentExcel(req, res) {
  try {
    const {
      department = 'ALL',
      semester = 'ALL',
      section = 'ALL',
      maxMarks = 20,
      targetPoints = 60,
      baseMinMarks = 0,
      evaluationTitle = 'Institutional Activity Assessment',
    } = req.query;

    const parsedMaxMarks = parseFloat(maxMarks);
    const parsedTargetPoints = parseInt(targetPoints, 10);
    const parsedBaseMinMarks = parseFloat(baseMinMarks);

    const whereClause = { role: 'STUDENT' };
    if (department !== 'ALL') {
      whereClause.department = { equals: department.trim(), mode: 'insensitive' };
    }
    if (semester !== 'ALL') {
      whereClause.currentSemester = parseInt(semester, 10);
    }
    if (section !== 'ALL') {
      whereClause.section = section.trim();
    }

    const marksWhere = semester !== 'ALL' ? { semester: parseInt(semester, 10) } : {};

    const students = await prisma.user.findMany({
      where: whereClause,
      include: {
        certificates: {
          where: { isRevoked: false },
          include: { event: { select: { category: true } } },
        },
        marksReceived: {
          where: marksWhere,
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [{ department: 'asc' }, { rollNo: 'asc' }],
    });

    const studentRows = students.map((student) => {
      const totalCreditPoints = student.certificates.reduce((sum, c) => sum + c.creditPoints, 0);
      const verifiedCertsCount = student.certificates.length;
      const cats = {
        TECHNICAL: 0, HACKATHON: 0, SPORTS: 0,
        CULTURAL: 0, NSS_SOCIAL: 0, WORKSHOP_SEMINAR: 0,
      };
      student.certificates.forEach((c) => {
        if (cats[c.event.category] !== undefined) cats[c.event.category]++;
      });

      const parts = [];
      if (cats.TECHNICAL > 0) parts.push(`${cats.TECHNICAL} Tech`);
      if (cats.HACKATHON > 0) parts.push(`${cats.HACKATHON} Hackathon`);
      if (cats.SPORTS > 0) parts.push(`${cats.SPORTS} Sports`);
      if (cats.CULTURAL > 0) parts.push(`${cats.CULTURAL} Cultural`);
      if (cats.NSS_SOCIAL > 0) parts.push(`${cats.NSS_SOCIAL} NSS`);
      if (cats.WORKSHOP_SEMINAR > 0) parts.push(`${cats.WORKSHOP_SEMINAR} Workshop`);

      const categoryBreakdownText = parts.length > 0 ? parts.join(', ') : 'No verified activity';
      const recommendedMarks = calculateRecommendedMarks(
        totalCreditPoints, parsedMaxMarks, parsedTargetPoints, parsedBaseMinMarks
      );
      const existing = student.marksReceived[0] || null;

      return {
        rollNo: student.rollNo || 'N/A',
        name: student.name,
        department: student.department,
        currentSemester: student.currentSemester,
        section: student.section || 'A',
        verifiedCertsCount,
        categoryBreakdownText,
        totalCreditPoints,
        recommendedMarks,
        finalMarksAllotted: existing ? existing.finalMarksAllotted : recommendedMarks,
        remarks: existing ? existing.remarks : '',
      };
    });

    const exportDept = department === 'ALL' ? 'All-Departments' : department;
    const exportSem = semester === 'ALL' ? 'All-Semesters' : semester;

    const { filePath, fileName } = await exportFacultyMarksToExcel({
      department: exportDept,
      semester: exportSem,
      evaluationTitle,
      studentRows,
    });

    return res.download(filePath, fileName, (err) => {
      if (err) console.error('Excel download error:', err);
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to export Excel: ${error.message}`,
    });
  }
}

module.exports = {
  getClassGradingMatrix,
  getStudentActivityDetails,
  saveFacultyAssessment,
  bulkSaveFacultyAssessments,
  exportClassAssessmentExcel,
};
