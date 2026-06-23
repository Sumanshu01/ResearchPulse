import User from '../models/User.js';
import Paper from '../models/Paper.js';
import SavedPaper from '../models/SavedPaper.js';
import Recommendation from '../models/Recommendation.js';
import logger from '../config/logger.js';
import { getCache, setCache } from '../config/redis.js';

/**
 * Score and generate recommendations for a user
 */
export const generateRecommendations = async (userId) => {
  try {
    logger.info(`Generating recommendations for user: ${userId}`);

    const user = await User.findById(userId)
      .populate('followedTopics', 'name')
      .populate('followedAuthors', 'name')
      .lean();

    if (!user) throw new Error('User not found');

    const savedPapers = await SavedPaper.find({ userId }).select('paperId').lean();
    const savedIds = savedPapers.map((s) => s.paperId?.toString()).filter(Boolean);
    const historyIds = (user.readingHistory || []).map((h) => h.paperId?.toString()).filter(Boolean);
    const excludeIds = [...new Set([...savedIds, ...historyIds])];

    const followedTopicNames = (user.followedTopics || []).map((t) => t.name);
    const followedAuthorIds = (user.followedAuthors || []).map((a) => a._id?.toString());

    const candidateQuery = { _id: { $nin: excludeIds } };
    const candidates = await Paper.find(candidateQuery)
      .sort({ trendScore: -1, citationCount: -1 })
      .limit(100)
      .select('title authors categories citationCount publicationDate source trendScore')
      .lean();

    const scored = candidates.map((paper) => {
      let score = 0;
      const reasons = [];

      // Topic match scoring
      const topicMatches = (paper.categories || []).filter((cat) =>
        followedTopicNames.some((t) => cat.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(cat.toLowerCase()))
      );
      if (topicMatches.length > 0) {
        score += topicMatches.length * 30;
        reasons.push('followed_topic');
      }

      // Author match scoring
      const authorMatch = (paper.authors || []).some((a) =>
        followedAuthorIds.includes(a.authorId?.toString())
      );
      if (authorMatch) {
        score += 40;
        reasons.push('followed_author');
      }

      // Trend score boost
      if (paper.trendScore > 5) {
        score += Math.min(paper.trendScore * 2, 20);
        reasons.push('trending');
      }

      // Citation score
      score += Math.log1p(paper.citationCount || 0) * 3;

      // Recency boost (papers from last 30 days)
      const ageMs = Date.now() - new Date(paper.publicationDate).getTime();
      const ageDays = ageMs / (1000 * 3600 * 24);
      if (ageDays < 30) score += 15;
      else if (ageDays < 90) score += 5;

      return { paper, score, reasons, topicMatch: topicMatches };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 30);

    // Upsert recommendations
    for (const { paper, score, reasons, topicMatch } of top) {
      await Recommendation.findOneAndUpdate(
        { userId, paperId: paper._id },
        { userId, paperId: paper._id, score, reasons, topicMatch, generatedAt: new Date() },
        { upsert: true }
      );
    }

    logger.info(`Generated ${top.length} recommendations for user ${userId}`);
    return top.length;
  } catch (error) {
    logger.error(`Recommendation generation error: ${error.message}`);
    throw error;
  }
};

/**
 * Get paginated personalized recommendations for a user
 */
export const getPersonalizedFeed = async (userId, page = 1, limit = 12) => {
  try {
    const cacheKey = `rec:feed:${userId}:${page}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const skip = (page - 1) * limit;

    const [recs, total] = await Promise.all([
      Recommendation.find({ userId })
        .sort({ score: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'paperId',
          select: 'title authors categories citationCount publicationDate source abstract',
        })
        .lean(),
      Recommendation.countDocuments({ userId }),
    ]);

    // If no recs yet, generate them first
    if (total === 0 && page === 1) {
      await generateRecommendations(userId);
      const freshRecs = await Recommendation.find({ userId })
        .sort({ score: -1 })
        .limit(limit)
        .populate({
          path: 'paperId',
          select: 'title authors categories citationCount publicationDate source abstract',
        })
        .lean();
      return { recommendations: freshRecs, total: freshRecs.length, page: 1 };
    }

    const result = {
      recommendations: recs.filter((r) => r.paperId),
      total,
      page,
      pages: Math.ceil(total / limit),
    };

    await setCache(cacheKey, JSON.stringify(result), 600); // 10 min
    return result;
  } catch (error) {
    logger.error(`Personalized feed error: ${error.message}`);
    return { recommendations: [], total: 0, page: 1 };
  }
};

/**
 * Record a paper view in user reading history
 */
export const recordPaperView = async (userId, paperId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      $push: {
        readingHistory: {
          $each: [{ paperId, viewedAt: new Date() }],
          $slice: -50, // keep last 50
        },
      },
    });

    // Increment view count on paper
    await Paper.findByIdAndUpdate(paperId, { $inc: { viewCount: 1 } });
  } catch (error) {
    logger.error(`Record view error: ${error.message}`);
  }
};
