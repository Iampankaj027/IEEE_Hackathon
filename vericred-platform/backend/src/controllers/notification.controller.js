const prisma = require('../config/db');

/**
 * GET /api/notifications
 * Returns the 30 most recent notifications for the authenticated user.
 */
async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/notifications/unread-count
 * Lightweight poll endpoint — returns only the unread count.
 */
async function getUnreadCount(req, res) {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });

    return res.json({ success: true, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Marks all unread notifications for the authenticated user as read.
 */
async function markAllRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Marks a single notification as read (only if it belongs to the current user).
 */
async function markOneRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getNotifications, getUnreadCount, markAllRead, markOneRead };
