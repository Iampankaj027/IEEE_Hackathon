const multer = require('multer');
const path = require('path');
const fs = require('fs');

const csvUploadDir = path.join(__dirname, '../../uploads/csv-rosters');
if (!fs.existsSync(csvUploadDir)) {
  fs.mkdirSync(csvUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, csvUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `roster-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
    cb(null, true);
  } else {
    cb(new Error('Only .csv files are allowed for participant rosters!'), false);
  }
};

const uploadCsv = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

module.exports = { uploadCsv };