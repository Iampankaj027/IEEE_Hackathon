const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Static File Serving for Generated Artifacts (PDF Certificates & Excel Reports)
app.use('/uploads/certificates', express.static(path.join(__dirname, '../uploads/certificates')));
app.use('/uploads/reports', express.static(path.join(__dirname, '../uploads/reports')));

// 3. API Routers Mount
const authRoutes = require('./routes/auth.routes');
const eventRoutes = require('./routes/event.routes');
const claimRoutes = require('./routes/claim.routes');
const certificateRoutes = require('./routes/certificate.routes');
const facultyGradingRoutes = require('./routes/facultyGrading.routes');
const publicVerifyRoutes = require('./routes/publicVerify.routes');
const adminRoutes = require('./routes/admin.routes');
const notificationRoutes = require('./routes/notification.routes');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/faculty/grading', facultyGradingRoutes);
app.use('/api/verify', publicVerifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// 4. Root Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    platform: 'VeriCred Institutional Participation & Cryptographic Verification API',
    version: '1.0.0',
    status: 'Operational',
    timestamp: new Date().toISOString(),
  });
});

// 5. Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: `Internal Server Error: ${err.message}`,
  });
});

// 6. Start HTTP Server
app.listen(PORT, () => {
  console.log(`🚀 VeriCred Backend Server is running successfully on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📂 Static Certificates served from: /uploads/certificates`);
});

module.exports = app;