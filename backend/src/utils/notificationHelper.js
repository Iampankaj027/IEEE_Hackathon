const prisma = require('../config/db');

/**
 * Creates an in-app notification for a user.
 * Failures are swallowed so they never interrupt the main claim/cert flow.
 */
async function createNotification({ userId, type, title, body, metadata = null }) {
  try {
    return await prisma.notification.create({
      data: { userId, type, title, body, metadata, isRead: false },
    });
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
    return null;
  }
}

module.exports = { createNotification };
