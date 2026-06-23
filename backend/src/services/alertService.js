import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Topic from '../models/Topic.js';
import Paper from '../models/Paper.js';
import Trend from '../models/Trend.js';
import logger from '../config/logger.js';

/**
 * Create a notification for a user
 */
export const createNotification = async (userId, type, title, message, metadata = {}) => {
  try {
    const notification = await Notification.create({ userId, type, title, message, metadata });
    return notification;
  } catch (error) {
    logger.error(`Create notification error: ${error.message}`);
  }
};

/**
 * Check subscriptions and fire relevant alerts
 */
export const checkAndFireAlerts = async () => {
  try {
    logger.info('Running alert checks...');

    const usersWithSubs = await User.find({
      'alertSubscriptions.0': { $exists: true },
    }).lean();

    let fired = 0;

    for (const user of usersWithSubs) {
      for (const sub of user.alertSubscriptions) {
        if (sub.type === 'topic') {
          // Check for new papers in this topic (last 24h)
          const recentCount = await Paper.countDocuments({
            categories: { $regex: sub.refName, $options: 'i' },
            createdAt: { $gte: new Date(Date.now() - 86400000) },
          });

          if (recentCount > 0) {
            await createNotification(
              user._id,
              'new_paper',
              `New papers in ${sub.refName}`,
              `${recentCount} new paper${recentCount > 1 ? 's' : ''} published in ${sub.refName} in the last 24 hours.`,
              { topicName: sub.refName }
            );
            fired++;
          }

          // Check for topic growth alerts
          const trend = await Trend.findOne({
            topicName: { $regex: sub.refName, $options: 'i' },
            period: 'daily',
            growthPercent: { $gt: 50 },
          }).lean();

          if (trend) {
            await createNotification(
              user._id,
              'topic_growth',
              `${sub.refName} is trending!`,
              `${sub.refName} has grown ${trend.growthPercent.toFixed(0)}% in the last 24 hours with ${trend.publicationCount} new publications.`,
              { topicName: sub.refName }
            );
            fired++;
          }
        }

        if (sub.type === 'citation_milestone') {
          const paper = await Paper.findOne({
            title: { $regex: sub.refName, $options: 'i' },
            citationCount: { $gte: 100 },
          }).lean();

          if (paper) {
            await createNotification(
              user._id,
              'citation_milestone',
              `Citation milestone reached!`,
              `The paper "${paper.title}" has reached ${paper.citationCount} citations.`,
              { paperId: paper._id, citationCount: paper.citationCount }
            );
            fired++;
          }
        }
      }
    }

    // Also notify all users about newly emerging topics
    const emergingTopics = await Trend.find({
      period: 'daily',
      status: 'emerging',
      snapshotDate: { $gte: new Date(Date.now() - 86400000) },
    })
      .sort({ growthPercent: -1 })
      .limit(3)
      .lean();

    if (emergingTopics.length > 0) {
      const allUsers = await User.find({}).select('_id').lean();
      for (const user of allUsers.slice(0, 100)) { // limit to 100 users
        for (const topic of emergingTopics) {
          await createNotification(
            user._id,
            'topic_growth',
            `Emerging: ${topic.topicName}`,
            `${topic.topicName} is an emerging research area with ${topic.growthPercent.toFixed(0)}% growth this week.`,
            { topicName: topic.topicName }
          );
          fired++;
        }
      }
    }

    logger.info(`Fired ${fired} alert notifications`);
    return fired;
  } catch (error) {
    logger.error(`Alert check error: ${error.message}`);
    return 0;
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, page = 1, limit = 20, onlyUnread = false) => {
  try {
    const query = { userId };
    if (onlyUnread) query.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return { notifications, total, unreadCount, page, pages: Math.ceil(total / limit) };
  } catch (error) {
    logger.error(`Get notifications error: ${error.message}`);
    return { notifications: [], total: 0, unreadCount: 0 };
  }
};

/**
 * Mark notifications as read
 */
export const markNotificationsRead = async (userId, notificationId = null) => {
  try {
    const query = { userId };
    if (notificationId) query._id = notificationId;
    await Notification.updateMany(query, { isRead: true });
  } catch (error) {
    logger.error(`Mark read error: ${error.message}`);
  }
};

/**
 * Subscribe user to a topic/author alert
 */
export const subscribeAlert = async (userId, type, refName) => {
  try {
    const existing = await User.findOne({
      _id: userId,
      'alertSubscriptions.refName': refName,
      'alertSubscriptions.type': type,
    });

    if (existing) return { message: 'Already subscribed' };

    await User.findByIdAndUpdate(userId, {
      $push: {
        alertSubscriptions: { type, refName, refId: refName },
      },
    });

    return { message: `Subscribed to ${type} alerts for ${refName}` };
  } catch (error) {
    logger.error(`Subscribe alert error: ${error.message}`);
    throw error;
  }
};

/**
 * Unsubscribe user from an alert
 */
export const unsubscribeAlert = async (userId, refName) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { alertSubscriptions: { refName } },
    });
    return { message: `Unsubscribed from alerts for ${refName}` };
  } catch (error) {
    logger.error(`Unsubscribe error: ${error.message}`);
    throw error;
  }
};
