import {
  getUserNotifications,
  markNotificationsRead,
  subscribeAlert,
  unsubscribeAlert,
} from '../services/alertService.js';

// GET /api/alerts
export const getAlerts = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const onlyUnread = req.query.unread === 'true';
    const result = await getUserNotifications(userId, page, limit, onlyUnread);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/alerts/:id/read
export const markRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    await markNotificationsRead(userId, id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/alerts/read-all
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user._id;
    await markNotificationsRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/alerts/subscribe
export const subscribe = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, refName } = req.body;
    if (!type || !refName) return res.status(400).json({ message: 'type and refName required' });
    const result = await subscribeAlert(userId, type, refName);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/alerts/subscribe/:refName
export const unsubscribe = async (req, res) => {
  try {
    const userId = req.user._id;
    const { refName } = req.params;
    const result = await unsubscribeAlert(userId, decodeURIComponent(refName));
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
