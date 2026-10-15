const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} = require('../controllers/notification.controller');
const { authenticateUser } = require('../middlewares/auth.middleware');

const guard = [authenticateUser];

// GET  /api/notifications               — last 30 notifications + unread count
router.get('/', ...guard, getNotifications);

// GET  /api/notifications/unread-count  — lightweight poll (count only)
router.get('/unread-count', ...guard, getUnreadCount);

// PATCH /api/notifications/read-all     — mark all as read (must be before /:id)
router.patch('/read-all', ...guard, markAllRead);

// PATCH /api/notifications/:id/read     — mark one as read
router.patch('/:id/read', ...guard, markOneRead);

module.exports = router;
