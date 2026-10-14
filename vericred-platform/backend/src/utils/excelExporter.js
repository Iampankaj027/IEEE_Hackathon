const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const REPORTS_DIR = path.join(__dirname, '../../uploads/reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Generates and saves a professional institutional Excel marks sheet (.xlsx)
 * for Faculty Class Grading & SODECA / Activity Point Assessments.
 *
 * @param {Object} reportData
 * @param {string} reportData.department - e.g., "Information Technology"
 * @param {number} reportData.semester - e.g., 5
 * @param {string} reportData.evaluationTitle - e.g., "Internal Co-Curricular Assessment"
 * @param {Array<Object>} reportData.studentRows - Array of student aggregation objects
 * @returns {Promise<{ filePath: string, publicUrl: string, fileName: string }>}
 */
async function exportFacultyMarksToExcel(reportData) {
  const { department, semester, evaluationTitle, studentRows } = reportData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = process.env.ISSUER_INSTITUTION_NAME || 'VeriCred Platform';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(`Sem ${semester} Marks Sheet`, {
    views: [{ showGridLines: true }],
  });

  // 1. Institutional Header Block (Rows 1-4)
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = (
    process.env.ISSUER_INSTITUTION_NAME || 'SWAMI KESHVANAND INSTITUTE OF TECHNOLOGY'
  ).toUpperCase();
  worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '0F172A' }, // Slate-900 Institutional Navy
  };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells('A2:I2');
  worksheet.getCell('A2').value = `Department of ${department} | Semester: ${semester} | Assessment: ${evaluationTitle}`;
  worksheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: '334155' } };
  worksheet.getCell('A2').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F1F5F9' }, // Slate-100
  };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // Blank row separator
  worksheet.getRow(3).height = 10;

  // 2. Data Table Columns Header (Row 4)
  const headers = [
    'S.No',
    'Roll Number',
    'Student Full Name',
    'Total Verified Certs',
    'Category Breakdown',
    'Total Credit Points',
    'Recommended Marks',
    'Final Locked Marks',
    'Faculty Remarks',
  ];

  worksheet.getRow(4).values = headers;
  worksheet.getRow(4).height = 26;

  worksheet.getRow(4).eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1E293B' }, // Slate-800
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } },
    };
  });

  // 3. Populate Student Rows
  let rowIndex = 5;
  let totalPointsAccumulator = 0;
  let totalCertsAccumulator = 0;

  studentRows.forEach((student, index) => {
    const row = worksheet.getRow(rowIndex);
    row.values = [
      index + 1,
      student.rollNo.toUpperCase(),
      student.name,
      student.verifiedCertsCount,
      student.categoryBreakdownText || 'N/A',
      student.totalCreditPoints,
      student.recommendedMarks,
      student.finalMarksAllotted !== undefined ? student.finalMarksAllotted : student.recommendedMarks,
      student.remarks || '',
    ];

    totalPointsAccumulator += student.totalCreditPoints;
    totalCertsAccumulator += student.verifiedCertsCount;

    row.height = 20;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9.5, color: { argb: '0F172A' } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };

      // Alignment rules by column
      if (colNumber === 1 || colNumber === 2 || colNumber === 4 || colNumber === 6 || colNumber === 7 || colNumber === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Alternating row shading (zebra striping)
      if (rowIndex % 2 === 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F8FAFC' }, // Slate-50
        };
      }
    });

    rowIndex++;
  });

  // 4. Summary KPI Row at the Bottom
  const summaryRow = worksheet.getRow(rowIndex);
  summaryRow.values = [
    'TOTAL / AVG',
    '',
    `Total Students: ${studentRows.length}`,
    totalCertsAccumulator,
    'Class Total Credits:',
    totalPointsAccumulator,
    '-',
    `Avg: ${(totalPointsAccumulator / (studentRows.length || 1)).toFixed(1)} Pts`,
    '',
  ];
  summaryRow.height = 24;

  summaryRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: '0F172A' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2E8F0' }, // Slate-200
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'medium', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
    };
  });

  // 5. Auto-fit Column Widths cleanly
  worksheet.columns = [
    { key: 'sno', width: 8 },
    { key: 'rollNo', width: 18 },
    { key: 'name', width: 28 },
    { key: 'certsCount', width: 18 },
    { key: 'breakdown', width: 32 },
    { key: 'points', width: 18 },
    { key: 'recMarks', width: 18 },
    { key: 'finalMarks', width: 18 },
    { key: 'remarks', width: 24 },
  ];

  // Save Workbook to disk
  const fileName = `Assessment_Marks_Dept_${department}_Sem_${semester}_${Date.now()}.xlsx`;
  const filePath = path.join(REPORTS_DIR, fileName);
  const publicUrl = `/uploads/reports/${fileName}`;

  await workbook.xlsx.writeFile(filePath);

  return {
    filePath,
    publicUrl,
    fileName,
  };
}

module.exports = {
  exportFacultyMarksToExcel,
};