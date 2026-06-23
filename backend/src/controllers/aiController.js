import { generatePaperSummary, detectResearchGaps, predictTopicGrowth } from '../services/geminiService.js';
import { getSimilarPapers, batchUpdateEmbeddings } from '../services/embeddingService.js';
import { getPersonalizedFeed, generateRecommendations } from '../services/recommendationService.js';
import { computeTopicClusters, getTopicTimeSeries } from '../services/analyticsService.js';
import TopicCluster from '../models/TopicCluster.js';
import logger from '../config/logger.js';

// GET /api/ai/summary/:paperId
export const getSummary = async (req, res) => {
  try {
    const { paperId } = req.params;
    const summary = await generatePaperSummary(paperId);
    res.json({ success: true, summary });
  } catch (error) {
    logger.error(`getSummary error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/ai/summary/:paperId/generate
export const regenerateSummary = async (req, res) => {
  try {
    const { paperId } = req.params;
    // Clear cache to force regeneration
    const { deleteCache } = await import('../config/redis.js');
    await deleteCache(`ai:summary:${paperId}`);
    const summary = await generatePaperSummary(paperId);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ai/similar/:paperId
export const getSimilar = async (req, res) => {
  try {
    const { paperId } = req.params;
    const limit = parseInt(req.query.limit) || 6;
    const papers = await getSimilarPapers(paperId, limit);
    res.json({ success: true, papers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ai/gaps
export const getResearchGaps = async (req, res) => {
  try {
    const clusters = await TopicCluster.find({}).sort({ paperCount: -1 }).limit(10).lean();
    if (clusters.length === 0) await computeTopicClusters();
    const freshClusters = await TopicCluster.find({}).sort({ paperCount: -1 }).limit(10).lean();
    const gaps = await detectResearchGaps(freshClusters);
    res.json({ success: true, gaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ai/recommendations  (auth required)
export const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const result = await getPersonalizedFeed(userId, page, limit);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/ai/recommendations/refresh  (auth required)
export const refreshRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const count = await generateRecommendations(userId);
    res.json({ success: true, message: `Generated ${count} recommendations` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/ai/predictions?topic=X&horizon=6
export const getPredictions = async (req, res) => {
  try {
    const { topic, horizon = 6 } = req.query;
    if (!topic) return res.status(400).json({ message: 'topic query param required' });

    const historicalData = await getTopicTimeSeries(topic, 6);
    const predictions = await predictTopicGrowth(topic, historicalData, parseInt(horizon));
    res.json({ success: true, topic, horizon: parseInt(horizon), historicalData, predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/ai/embeddings/refresh (admin)
export const refreshEmbeddings = async (req, res) => {
  try {
    const updated = await batchUpdateEmbeddings(req.body.batchSize || 20);
    res.json({ success: true, updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
