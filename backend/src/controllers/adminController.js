import Paper from '../models/Paper.js';
import Author from '../models/Author.js';
import Topic from '../models/Topic.js';
import AiSummary from '../models/AiSummary.js';
import Notification from '../models/Notification.js';
import Recommendation from '../models/Recommendation.js';
import { computeTrends, computeTopicClusters, getDashboardAnalytics } from '../services/analyticsService.js';
import { batchUpdateEmbeddings } from '../services/embeddingService.js';
import logger from '../config/logger.js';
import { deleteCache } from '../config/redis.js';

// GET /api/admin/stats
export const getAdminStats = async (req, res) => {
  try {
    const [papers, authors, topics, summaries, notifications, recommendations] = await Promise.all([
      Paper.countDocuments(),
      Author.countDocuments(),
      Topic.countDocuments(),
      AiSummary.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Notification.countDocuments(),
      Recommendation.countDocuments(),
    ]);

    const summaryStats = { pending: 0, completed: 0, failed: 0 };
    summaries.forEach(({ _id, count }) => { summaryStats[_id] = count; });

    res.json({
      success: true,
      stats: {
        papers, authors, topics,
        aiSummaries: summaryStats,
        notifications,
        recommendations,
        aiCoverage: papers > 0 ? `${((summaryStats.completed / papers) * 100).toFixed(1)}%` : '0%',
        embeddingCoverage: '—',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/analytics/refresh
export const refreshAnalytics = async (req, res) => {
  try {
    await Promise.all([
      computeTrends('daily'),
      computeTrends('weekly'),
      computeTrends('monthly'),
      computeTopicClusters(),
    ]);
    await deleteCache('analytics:dashboard');
    res.json({ success: true, message: 'Analytics refreshed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/ai/queue-summaries
export const queueSummaries = async (req, res) => {
  try {
    const limit = req.body.limit || 10;
    const papersWithoutSummary = await Paper.find({
      $or: [{ aiSummaryId: null }, { aiSummaryId: { $exists: false } }],
    }).limit(limit).select('_id title').lean();

    const { aiQueue } = await import('../jobs/queue.js');
    if (!aiQueue) {
      logger.warn('aiQueue is null (Redis is down). Processing summaries inline synchronously...');
      const { generatePaperSummary } = await import('../services/geminiService.js');
      let processed = 0;
      for (const paper of papersWithoutSummary) {
        try {
          await generatePaperSummary(paper._id.toString());
          processed++;
        } catch (e) {
          logger.error(`Sync inline summary generation failed for paper ${paper._id}: ${e.message}`);
        }
      }
      return res.json({
        success: true,
        queued: 0,
        processed,
        message: `Redis offline. Synchronously generated summaries for ${processed} papers inline.`
      });
    }

    let queued = 0;
    for (const paper of papersWithoutSummary) {
      await aiQueue.add('generate-summary', { paperId: paper._id.toString() }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
      });
      queued++;
    }

    res.json({ success: true, queued, message: `Queued ${queued} AI summary jobs` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/admin/embeddings/refresh
export const refreshEmbeddingsAdmin = async (req, res) => {
  try {
    const updated = await batchUpdateEmbeddings(req.body.batchSize || 30);
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/admin/dashboard
export const getAdminDashboard = async (req, res) => {
  try {
    const data = await getDashboardAnalytics();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/admin/cache/clear
export const clearCache = async (req, res) => {
  try {
    const patterns = ['analytics:*', 'ai:*', 'rec:*', 'embed:*'];
    for (const p of patterns) await deleteCache(p);
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
