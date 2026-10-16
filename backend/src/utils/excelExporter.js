const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Column layout (always 11 cols A-K — dept + semester always present for full traceability)
const COL_WIDTHS = [
  { key: 'sno',        width: 7  },
  { key: 'rollNo',     width: 18 },
  { key: 'name',       width: 28 },
  { key: 'dept',       width: 26 },
  { key: 'sem',        width: 11 },
  { key: 'section',    width: 10 },
  { key: 'certs',      width: 18 },
  { key: 'breakdown',  width: 30 },
  { key: 'points',     width: 16 },
  { key: 'recMarks',   width: 16 },
  { key: 'finalMarks', width: 16 },
  { key: 'remarks',    width: 24 },
];

const LAST_COL = 'L'; // 12 columns (A-L)

const HEADER_RANGE = `A1:${LAST_COL}1`;
const SUB_RANGE    = `A2:${LAST_COL}2`;

/**
 * Generates a professional institutional Excel marks sheet (.xlsx).
 *
 * @param {Object} reportData
 * @param {string} reportData.department    - "Information Technology" or "All-Departments"
 * @param {string|number} reportData.semester - e.g., 5 or "All-Semesters"
 * @param {string} reportData.evaluationTitle
 * @param {Array<Object>} reportData.studentRows - must include: rollNo, name, department,
 *   currentSemester, section, verifiedCertsCount, categoryBreakdownText, totalCreditPoints,
 *   recommendedMarks, finalMarksAllotted, remarks
 * @returns {Promise<{ filePath: string, publicUrl: string, fileName: string }>}
 */
async function exportFacultyMarksToExcel(reportData) {
  const { department, semester, evaluationTitle, studentRows } = reportData;

  const institution = (
    process.env.ISSUER_INSTITUTION_NAME || 'SWAMI KESHVANAND INSTITUTE OF TECHNOLOGY'
  ).toUpperCase();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = institution;
  workbook.created = new Date();

  const sheetName = `${department === 'All-Departments' ? 'All Depts' : department.substring(0, 15)} · Sem ${semester}`;
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 4 }],
  });

  // ── Row 1: Institution Header ────────────────────────────────────────────

  worksheet.mergeCells(HEADER_RANGE);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = institution;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 34;

  // ── Row 2: Report Context Sub-header ─────────────────────────────────────

  const deptLabel = department === 'All-Departments' ? 'All Departments — Institution Wide' : `Department of ${department}`;
  const semLabel  = semester === 'All-Semesters' ? 'All Semesters — Cumulative' : `Semester ${semester}`;

  worksheet.mergeCells(SUB_RANGE);
  const subCell = worksheet.getCell('A2');
  subCell.value = `${deptLabel}  ·  ${semLabel}  ·  Assessment: ${evaluationTitle}  ·  Generated: ${new Date().toLocaleDateString('en-IN')}`;
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: '334155' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // ── Row 3: Blank Separator ───────────────────────────────────────────────

  worksheet.getRow(3).height = 8;

  // ── Row 4: Column Headers ────────────────────────────────────────────────

  const headers = [
    'S.No', 'Roll Number', 'Student Full Name', 'Department',
    'Sem', 'Sec', 'Verified Certs', 'Category Breakdown',
    'Credit Points', 'Recommended Marks', 'Final Locked Marks', 'Faculty Remarks',
  ];

  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 26;
  worksheet.getRow(4).eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top:    { style: 'thin',   color: { argb: 'CBD5E1' } },
      left:   { style: 'thin',   color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      right:  { style: 'thin',   color: { argb: 'CBD5E1' } },
    };
  });

  // ── Rows 5+: Student Data ────────────────────────────────────────────────

  let rowIndex = 5;
  let totalPointsAcc = 0;
  let totalCertsAcc = 0;
  let totalFinalMarksAcc = 0;

  studentRows.forEach((student, index) => {
    const finalMark = student.finalMarksAllotted !== undefined
      ? student.finalMarksAllotted
      : student.recommendedMarks;

    const row = worksheet.getRow(rowIndex);
    row.values = [
      index + 1,
      String(student.rollNo || 'N/A').toUpperCase(),
      student.name,
      student.department,
      student.currentSemester || '—',
      student.section || 'A',
      student.verifiedCertsCount,
      student.categoryBreakdownText || 'No verified activity',
      student.totalCreditPoints,
      student.recommendedMarks,
      finalMark,
      student.remarks || '',
    ];

    totalPointsAcc += student.totalCreditPoints;
    totalCertsAcc  += student.verifiedCertsCount;
    totalFinalMarksAcc += parseFloat(finalMark) || 0;

    row.height = 20;
    const isEven = (rowIndex % 2 === 0);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: '0F172A' } };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'E2E8F0' } },
        left:   { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right:  { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      const centered = [1, 2, 5, 6, 7, 9, 10, 11];
      cell.alignment = {
        horizontal: centered.includes(colNumber) ? 'center' : 'left',
        vertical: 'middle',
        wrapText: colNumber === 8,
      };

      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }

      // Highlight zero-activity rows subtly
      if (colNumber === 7 && student.verifiedCertsCount === 0) {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'DC2626' }, bold: true };
      }
    });

    rowIndex++;
  });

  // ── Summary Row ──────────────────────────────────────────────────────────

  const summaryRow = worksheet.getRow(rowIndex);
  summaryRow.values = [
    'TOTALS',
    '',
    `${studentRows.length} Students`,
    '',
    '',
    '',
    totalCertsAcc,
    'Class Averages →',
    Math.round(totalPointsAcc / (studentRows.length || 1)),
    '',
    (totalFinalMarksAcc / (studentRows.length || 1)).toFixed(1),
    '',
  ];
  summaryRow.height = 26;
  summaryRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    const centered = [1, 7, 9, 11];
    cell.alignment = {
      horizontal: centered.includes(colNumber) ? 'center' : 'left',
      vertical: 'middle',
    };
    cell.border = {
      top:    { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
    };
  });

  // ── Column Widths ────────────────────────────────────────────────────────

  worksheet.columns = COL_WIDTHS;

  // ── Save ─────────────────────────────────────────────────────────────────

  const safeDate = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const fileName = `VeriCred_Assessment_${department}_Sem${semester}_${safeDate}.xlsx`;
  const filePath = path.join(REPORTS_DIR, fileName);

  await workbook.xlsx.writeFile(filePath);

  return {
    filePath,
    publicUrl: `/uploads/reports/${fileName}`,
    fileName,
  };
}

module.exports = { exportFacultyMarksToExcel };
