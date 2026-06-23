import Paper from '../models/Paper.js';
import Author from '../models/Author.js';
import Institution from '../models/Institution.js';
import Topic from '../models/Topic.js';
import Trend from '../models/Trend.js';
import TopicCluster from '../models/TopicCluster.js';
import logger from '../config/logger.js';
import { getCache, setCache } from '../config/redis.js';

// Predefined topic cluster definitions
const CLUSTER_DEFINITIONS = [
  { name: 'AI & Machine Learning', keywords: ['Artificial Intelligence', 'Machine Learning', 'Deep Learning', 'Neural Network', 'Reinforcement Learning', 'Transfer Learning', 'Computer Vision', 'Natural Language Processing', 'Large Language Models', 'AI Agents', 'Generative AI', 'Multimodal AI'] },
  { name: 'Data & Knowledge', keywords: ['Data Science', 'Big Data', 'Knowledge Graph', 'Synthetic Data', 'Data Mining', 'Database', 'Graph Neural Networks', 'Information Retrieval'] },
  { name: 'Emerging AI Protocols', keywords: ['MCP', 'Model Context Protocol', 'AI Safety', 'AI Alignment', 'Explainable AI', 'Federated Learning', 'Edge AI', 'Autonomous Agents'] },
  { name: 'Biomedical & Health', keywords: ['Medicine', 'Genetics', 'Bioinformatics', 'Cancer', 'Drug Discovery', 'Genomics', 'Clinical', 'Healthcare', 'Epidemiology', 'Neuroscience'] },
  { name: 'Quantum & Physics', keywords: ['Quantum Computing', 'Quantum Mechanics', 'Physics', 'Quantum Machine Learning', 'Quantum Algorithms', 'Photonics'] },
  { name: 'Climate & Environment', keywords: ['Climate Change', 'Environmental Science', 'Sustainability', 'Renewable Energy', 'Ecology', 'Atmospheric Science'] },
  { name: 'Security & Privacy', keywords: ['Cybersecurity', 'Cryptography', 'Privacy', 'Blockchain', 'Decentralized', 'Network Security', 'Malware'] },
  { name: 'Robotics & Automation', keywords: ['Robotics', 'Automation', 'Control Systems', 'Autonomous Vehicles', 'Human-Robot Interaction', 'Motion Planning'] },
];

/**
 * Compute topic trends for a given period
 */
export const computeTrends = async (period = 'weekly') => {
  try {
    logger.info(`Computing ${period} trends...`);

    const now = new Date();
    let fromDate, prevFromDate;

    if (period === 'daily') {
      fromDate = new Date(now - 24 * 3600 * 1000);
      prevFromDate = new Date(now - 48 * 3600 * 1000);
    } else if (period === 'weekly') {
      fromDate = new Date(now - 7 * 24 * 3600 * 1000);
      prevFromDate = new Date(now - 14 * 24 * 3600 * 1000);
    } else {
      fromDate = new Date(now - 30 * 24 * 3600 * 1000);
      prevFromDate = new Date(now - 60 * 24 * 3600 * 1000);
    }

    // Current period aggregation
    const current = await Paper.aggregate([
      { $match: { publicationDate: { $gte: fromDate } } },
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
          totalCitations: { $sum: '$citationCount' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]);

    // Previous period aggregation
    const previous = await Paper.aggregate([
      { $match: { publicationDate: { $gte: prevFromDate, $lt: fromDate } } },
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$categories',
          count: { $sum: 1 },
          totalCitations: { $sum: '$citationCount' },
        },
      },
    ]);

    const prevMap = {};
    previous.forEach((p) => { prevMap[p._id] = p; });

    const trends = [];
    for (const item of current) {
      const prev = prevMap[item._id] || { count: 0, totalCitations: 0 };
      const growthPercent = prev.count > 0
        ? ((item.count - prev.count) / prev.count) * 100
        : item.count > 0 ? 100 : 0;

      const citationGrowth = item.totalCitations - (prev.totalCitations || 0);
      const trendScore = item.count * 0.4 + Math.max(0, growthPercent) * 0.4 + Math.log1p(item.totalCitations) * 0.2;

      let status = 'stable';
      if (growthPercent > 50) status = 'emerging';
      else if (growthPercent > 10) status = 'growing';
      else if (growthPercent < -20) status = 'declining';

      const trend = await Trend.findOneAndUpdate(
        { topicName: item._id, period },
        {
          topicName: item._id,
          period,
          publicationCount: item.count,
          previousCount: prev.count,
          growthPercent: parseFloat(growthPercent.toFixed(2)),
          citationGrowth,
          totalCitations: item.totalCitations,
          trendScore: parseFloat(trendScore.toFixed(2)),
          status,
          snapshotDate: now,
        },
        { upsert: true, new: true }
      );

      // Update Topic document
      await Topic.findOneAndUpdate(
        { name: item._id },
        {
          paperCount: item.count,
          totalCitations: item.totalCitations,
          trendScore: trendScore,
          isEmergingTopic: status === 'emerging',
          ...(period === 'weekly' ? { weeklyGrowth: growthPercent } : {}),
          ...(period === 'monthly' ? { monthlyGrowth: growthPercent } : {}),
        },
        { upsert: false }
      );

      trends.push(trend);
    }

    logger.info(`Computed ${trends.length} ${period} trends`);
    return trends;
  } catch (error) {
    logger.error(`Compute trends error: ${error.message}`);
    throw error;
  }
};

/**
 * Get trend data for dashboard
 */
export const getTrends = async (period = 'weekly', limit = 15) => {
  try {
    const cacheKey = `analytics:trends:${period}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    let trends = await Trend.find({ period })
      .sort({ trendScore: -1 })
      .limit(limit)
      .lean();

    if (trends.length === 0) {
      // Compute on-demand
      await computeTrends(period);
      trends = await Trend.find({ period }).sort({ trendScore: -1 }).limit(limit).lean();
    }

    await setCache(cacheKey, JSON.stringify(trends), 3600);
    return trends;
  } catch (error) {
    logger.error(`Get trends error: ${error.message}`);
    return [];
  }
};

/**
 * Compute citation intelligence metrics
 */
export const computeCitationIntelligence = async () => {
  try {
    const cacheKey = 'analytics:citations';
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);

    const [mostCited, recentHighCitation, citationByCategory, totalStats] = await Promise.all([
      // Top 10 most cited all time
      Paper.find({})
        .sort({ citationCount: -1 })
        .limit(10)
        .select('title authors citationCount publicationDate source categories')
        .lean(),

      // Fastest growing (recent papers with notable citations)
      Paper.find({ publicationDate: { $gte: weekAgo } })
        .sort({ citationCount: -1 })
        .limit(10)
        .select('title authors citationCount publicationDate source categories')
        .lean(),

      // Citations by category
      Paper.aggregate([
        { $unwind: '$categories' },
        {
          $group: {
            _id: '$categories',
            totalCitations: { $sum: '$citationCount' },
            avgCitations: { $avg: '$citationCount' },
            paperCount: { $sum: 1 },
          },
        },
        { $sort: { totalCitations: -1 } },
        { $limit: 15 },
      ]),

      // Overall stats
      Paper.aggregate([
        {
          $group: {
            _id: null,
            totalCitations: { $sum: '$citationCount' },
            avgCitations: { $avg: '$citationCount' },
            maxCitations: { $max: '$citationCount' },
            paperCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const result = {
      mostCited,
      fastestGrowing: recentHighCitation,
      citationByCategory,
      summary: totalStats[0] || { totalCitations: 0, avgCitations: 0, maxCitations: 0, paperCount: 0 },
      generatedAt: now,
    };

    await setCache(cacheKey, JSON.stringify(result), 1800);
    return result;
  } catch (error) {
    logger.error(`Citation intelligence error: ${error.message}`);
    throw error;
  }
};

/**
 * Compute topic clusters
 */
export const computeTopicClusters = async () => {
  try {
    logger.info('Computing topic clusters...');

    const clusters = [];

    for (const def of CLUSTER_DEFINITIONS) {
      // Count papers in this cluster
      const paperCount = await Paper.countDocuments({
        categories: { $in: def.keywords.map((k) => new RegExp(k, 'i')) },
      });

      const citationAgg = await Paper.aggregate([
        { $match: { categories: { $in: def.keywords.map((k) => new RegExp(k, 'i')) } } },
        { $group: { _id: null, total: { $sum: '$citationCount' } } },
      ]);

      const totalCitations = citationAgg[0]?.total || 0;

      // Get actual topics in DB that match
      const matchingTopics = await Topic.find({
        name: { $in: def.keywords.map((k) => new RegExp(k, 'i')) },
      })
        .select('name paperCount trendScore')
        .lean();

      const avgTrend = matchingTopics.reduce((s, t) => s + (t.trendScore || 0), 0) / (matchingTopics.length || 1);

      const cluster = await TopicCluster.findOneAndUpdate(
        { clusterName: def.name },
        {
          clusterName: def.name,
          topics: def.keywords,
          paperCount,
          totalCitations,
          trendScore: parseFloat(avgTrend.toFixed(2)),
          isEmerging: avgTrend > 5,
          lastUpdated: new Date(),
          researchGaps: [
            `Intersection of ${def.keywords[0]} and ${def.keywords[1]}`,
            `Real-world deployment of ${def.name} systems`,
            `Ethical implications and bias in ${def.name}`,
          ],
        },
        { upsert: true, new: true }
      );

      clusters.push(cluster);
    }

    logger.info(`Computed ${clusters.length} topic clusters`);
    return clusters;
  } catch (error) {
    logger.error(`Topic cluster computation error: ${error.message}`);
    throw error;
  }
};

/**
 * Get top authors rankings
 */
export const getAuthorRankings = async (limit = 20) => {
  try {
    const cacheKey = `analytics:authors:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const authors = await Author.find({})
      .sort({ citations: -1, publicationsCount: -1 })
      .limit(limit)
      .select('name citations publicationsCount institutions')
      .populate('institutions', 'name')
      .lean();

    await setCache(cacheKey, JSON.stringify(authors), 3600);
    return authors;
  } catch (error) {
    logger.error(`Author rankings error: ${error.message}`);
    return [];
  }
};

/**
 * Get institution rankings
 */
export const getInstitutionRankings = async (limit = 20) => {
  try {
    const cacheKey = `analytics:institutions:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const institutions = await Institution.find({})
      .sort({ citations: -1, publicationCount: -1 })
      .limit(limit)
      .select('name citations publicationCount location')
      .lean();

    await setCache(cacheKey, JSON.stringify(institutions), 3600);
    return institutions;
  } catch (error) {
    logger.error(`Institution rankings error: ${error.message}`);
    return [];
  }
};

/**
 * Get full analytics dashboard snapshot
 */
export const getDashboardAnalytics = async () => {
  try {
    const cacheKey = 'analytics:dashboard';
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 3600 * 1000);

    const [
      totalPapers,
      totalAuthors,
      totalTopics,
      totalCitations,
      recentPapers,
      weeklyTrends,
      topClusters,
    ] = await Promise.all([
      Paper.countDocuments(),
      Author.countDocuments(),
      Topic.countDocuments(),
      Paper.aggregate([{ $group: { _id: null, total: { $sum: '$citationCount' } } }]),
      // Publication trend (papers per day last 30 days)
      Paper.aggregate([
        { $match: { publicationDate: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$publicationDate' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      getTrends('weekly', 10),
      TopicCluster.find({}).sort({ paperCount: -1 }).limit(8).lean(),
    ]);

    const result = {
      summary: {
        totalPapers,
        totalAuthors,
        totalTopics,
        totalCitations: totalCitations[0]?.total || 0,
      },
      publicationTrend: recentPapers,
      weeklyTrends,
      topClusters,
      generatedAt: now,
    };

    await setCache(cacheKey, JSON.stringify(result), 1800);
    return result;
  } catch (error) {
    logger.error(`Dashboard analytics error: ${error.message}`);
    throw error;
  }
};

/**
 * Get publication trend over time for a topic
 */
export const getTopicTimeSeries = async (topicName, months = 6) => {
  try {
    const from = new Date();
    from.setMonth(from.getMonth() - months);

    const data = await Paper.aggregate([
      {
        $match: {
          categories: { $regex: topicName, $options: 'i' },
          publicationDate: { $gte: from },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$publicationDate' } },
          count: { $sum: 1 },
          citations: { $sum: '$citationCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return data.map((d, i) => ({ month: i + 1, label: d._id, count: d.count, citations: d.citations }));
  } catch (error) {
    logger.error(`Topic time series error: ${error.message}`);
    return [];
  }
};

/**
 * Detect emerging topics based on growth
 */
export const detectEmergingTopics = async () => {
  try {
    const trends = await Trend.find({ period: 'weekly', status: { $in: ['emerging', 'growing'] } })
      .sort({ growthPercent: -1 })
      .limit(10)
      .lean();
    return trends;
  } catch (error) {
    logger.error(`Emerging topics error: ${error.message}`);
    return [];
  }
};
