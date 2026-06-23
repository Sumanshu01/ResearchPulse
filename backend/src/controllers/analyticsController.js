import {
  getTrends,
  computeTrends,
  computeCitationIntelligence,
  computeTopicClusters,
  getAuthorRankings,
  getInstitutionRankings,
  getDashboardAnalytics,
  getTopicTimeSeries,
  detectEmergingTopics,
} from '../services/analyticsService.js';
import TopicCluster from '../models/TopicCluster.js';
import logger from '../config/logger.js';

// GET /api/analytics/trends?period=weekly
export const getTrendsHandler = async (req, res) => {
  try {
    const period = req.query.period || 'weekly';
    const limit = parseInt(req.query.limit) || 15;
    const trends = await getTrends(period, limit);
    res.json({ success: true, period, trends });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/analytics/trends/compute
export const computeTrendsHandler = async (req, res) => {
  try {
    const period = req.body.period || 'weekly';
    const trends = await computeTrends(period);
    res.json({ success: true, computed: trends.length, period });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/citations
export const getCitationsHandler = async (req, res) => {
  try {
    const data = await computeCitationIntelligence();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/topics
export const getTopicClustersHandler = async (req, res) => {
  try {
    let clusters = await TopicCluster.find({}).sort({ paperCount: -1 }).lean();
    if (clusters.length === 0) {
      clusters = await computeTopicClusters();
    }
    res.json({ success: true, clusters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/analytics/topics/compute
export const computeTopicClustersHandler = async (req, res) => {
  try {
    const clusters = await computeTopicClusters();
    res.json({ success: true, clusters });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/authors/rankings
export const getAuthorRankingsHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const authors = await getAuthorRankings(limit);
    res.json({ success: true, authors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/institutions/rankings
export const getInstitutionRankingsHandler = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const institutions = await getInstitutionRankings(limit);
    res.json({ success: true, institutions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/dashboard
export const getDashboardHandler = async (req, res) => {
  try {
    const data = await getDashboardAnalytics();
    res.json({ success: true, ...data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/emerging
export const getEmergingHandler = async (req, res) => {
  try {
    const topics = await detectEmergingTopics();
    res.json({ success: true, topics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/analytics/timeseries?topic=X&months=6
export const getTimeSeriesHandler = async (req, res) => {
  try {
    const { topic, months = 6 } = req.query;
    if (!topic) return res.status(400).json({ message: 'topic param required' });
    const data = await getTopicTimeSeries(topic, parseInt(months));
    res.json({ success: true, topic, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
