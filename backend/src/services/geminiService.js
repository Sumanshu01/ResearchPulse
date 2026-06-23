import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../config/logger.js';
import AiSummary from '../models/AiSummary.js';
import Paper from '../models/Paper.js';
import { getCache, setCache } from '../config/redis.js';

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.'))) {
    return null;
  }
  try {
    return new GoogleGenerativeAI(apiKey);
  } catch (err) {
    logger.error('Failed to initialize GoogleGenerativeAI:', err);
    return null;
  }
};

const MOCK_SUMMARY = (paper) => ({
  executiveSummary: `This paper titled "${paper.title}" investigates key challenges and presents novel contributions in the domain of ${paper.categories?.[0] || 'research'}. The work advances the field by proposing new methodologies validated through rigorous experimentation.`,
  keyContributions: [
    'Novel theoretical framework addressing core research challenges',
    'State-of-the-art performance on standard benchmarks',
    'Open-source implementation enabling reproducibility',
  ],
  mainFindings: [
    'Demonstrated significant improvement over existing baselines',
    'Validated approach across multiple datasets and settings',
    'Identified key factors influencing model performance',
  ],
  limitations: [
    'Computational cost may limit real-world deployment at scale',
    'Results primarily validated on English-language datasets',
  ],
  futureWork: [
    'Extension to multilingual and cross-domain settings',
    'Investigation of more efficient training strategies',
  ],
  methodology: 'The authors employ a combination of empirical experimentation and theoretical analysis, using standard evaluation protocols.',
});

/**
 * Generate AI summary for a paper using Gemini API
 */
export const generatePaperSummary = async (paperId) => {
  try {
    const cacheKey = `ai:summary:${paperId}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    // Check if summary already exists
    const existing = await AiSummary.findOne({ paperId, status: 'completed' });
    if (existing) {
      await setCache(cacheKey, JSON.stringify(existing), 86400); // 24h
      return existing;
    }

    const paper = await Paper.findById(paperId).lean();
    if (!paper) throw new Error('Paper not found');

    // Create/update pending record
    let summaryDoc = await AiSummary.findOneAndUpdate(
      { paperId },
      { paperId, status: 'pending' },
      { upsert: true, new: true }
    );

    const genAI = getGeminiClient();

    if (!genAI) {
      // Use intelligent mock when no API key
      logger.warn('GEMINI_API_KEY not configured — using mock summary');
      const mock = MOCK_SUMMARY(paper);
      summaryDoc = await AiSummary.findOneAndUpdate(
        { paperId },
        { ...mock, status: 'completed', model: 'mock', generatedAt: new Date() },
        { new: true }
      );
      await setCache(cacheKey, JSON.stringify(summaryDoc), 86400);
      return summaryDoc;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Analyze this academic research paper and provide a structured JSON summary.

Title: ${paper.title}
Authors: ${paper.authors?.map((a) => a.name).join(', ') || 'Unknown'}
Abstract: ${paper.abstract || 'No abstract available'}
Categories: ${paper.categories?.join(', ') || 'General'}

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "executiveSummary": "2-3 sentence overview of the paper's purpose and significance",
  "keyContributions": ["contribution 1", "contribution 2", "contribution 3"],
  "mainFindings": ["finding 1", "finding 2", "finding 3"],
  "limitations": ["limitation 1", "limitation 2"],
  "futureWork": ["future direction 1", "future direction 2"],
  "methodology": "1-2 sentences describing the research approach"
}`;

    let result;
    let parsed;
    let modelName = 'gemini-1.5-flash';
    try {
      result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      // Strip markdown code fences if present
      const clean = text.replace(/^```json\n?|^```\n?|\n?```$/g, '').trim();
      parsed = JSON.parse(clean);
    } catch (error) {
      logger.warn(`Gemini API generation failed for paper ${paperId} (using mock fallback): ${error.message}`);
      parsed = MOCK_SUMMARY(paper);
      modelName = 'mock-fallback';
    }

    summaryDoc = await AiSummary.findOneAndUpdate(
      { paperId },
      {
        ...parsed,
        status: 'completed',
        model: modelName,
        generatedAt: new Date(),
      },
      { new: true }
    );

    // Link summary to paper
    await Paper.findByIdAndUpdate(paperId, { aiSummaryId: summaryDoc._id });
    await setCache(cacheKey, JSON.stringify(summaryDoc), 86400);

    logger.info(`AI summary generated for paper: ${paper.title}`);
    return summaryDoc;
  } catch (error) {
    logger.error(`Gemini summary error: ${error.message}`);
    await AiSummary.findOneAndUpdate(
      { paperId },
      { status: 'failed', errorMessage: error.message },
      { upsert: true }
    );
    throw error;
  }
};

/**
 * Detect research gaps from topic clusters using Gemini
 */
export const detectResearchGaps = async (clusters) => {
  try {
    const cacheKey = 'ai:research_gaps';
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const genAI = getGeminiClient();

    if (!genAI) {
      const mockGaps = clusters.slice(0, 6).map((c) => ({
        area: c.clusterName,
        description: `Under-explored intersection of ${c.topics?.slice(0, 3).join(', ') || c.clusterName} with emerging computational methods.`,
        suggestedDirections: [
          `Apply large language models to ${c.clusterName} problems`,
          `Develop benchmark datasets for ${c.clusterName} evaluation`,
          `Cross-domain transfer learning from ${c.clusterName}`,
        ],
        urgency: Math.random() > 0.5 ? 'high' : 'medium',
      }));
      await setCache(cacheKey, JSON.stringify(mockGaps), 3600);
      return mockGaps;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const clusterSummary = clusters
      .slice(0, 8)
      .map((c) => `${c.clusterName}: ${c.paperCount} papers, topics: ${c.topics?.slice(0, 4).join(', ')}`)
      .join('\n');

    const prompt = `You are a research analyst. Based on these research topic clusters from an academic database, identify research gaps and opportunities.

Clusters:
${clusterSummary}

Respond ONLY with valid JSON array (no markdown):
[
  {
    "area": "gap area name",
    "description": "description of the gap",
    "suggestedDirections": ["direction 1", "direction 2", "direction 3"],
    "urgency": "high|medium|low"
  }
]

Identify 5-7 specific, actionable research gaps.`;

    let result;
    let gaps;
    try {
      result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const clean = text.replace(/^```json\n?|^```\n?|\n?```$/g, '').trim();
      gaps = JSON.parse(clean);
    } catch (err) {
      logger.warn(`Gemini research gap generation error (falling back to mock): ${err.message}`);
      gaps = clusters.slice(0, 6).map((c) => ({
        area: c.clusterName,
        description: `Under-explored intersection of ${c.topics?.slice(0, 3).join(', ') || c.clusterName} with emerging computational methods.`,
        suggestedDirections: [
          `Apply large language models to ${c.clusterName} problems`,
          `Develop benchmark datasets for ${c.clusterName} evaluation`,
          `Cross-domain transfer learning from ${c.clusterName}`,
        ],
        urgency: 'medium',
      }));
    }

    await setCache(cacheKey, JSON.stringify(gaps), 3600);
    return gaps;
  } catch (error) {
    logger.error(`Research gap detection error (falling back to mock): ${error.message}`);
    const mockGaps = clusters.slice(0, 6).map((c) => ({
      area: c.clusterName,
      description: `Under-explored intersection of ${c.topics?.slice(0, 3).join(', ') || c.clusterName} with emerging computational methods.`,
      suggestedDirections: [
        `Apply large language models to ${c.clusterName} problems`,
        `Develop benchmark datasets for ${c.clusterName} evaluation`,
        `Cross-domain transfer learning from ${c.clusterName}`,
      ],
      urgency: 'medium',
    }));
    return mockGaps;
  }
};

/**
 * Generate trend narrative for a topic
 */
export const generateTrendNarrative = async (topicName, trendData) => {
  try {
    const genAI = getGeminiClient();
    if (!genAI) {
      return `${topicName} shows ${trendData.growthPercent > 0 ? 'strong growth' : 'stabilization'} with ${trendData.publicationCount} recent publications and ${trendData.growthPercent?.toFixed(1)}% growth rate.`;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Write a 1-sentence research trend insight for the topic "${topicName}" which has ${trendData.publicationCount} publications and ${trendData.growthPercent?.toFixed(1)}% growth. Be specific and insightful. No quotes, just the sentence.`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    logger.warn(`Gemini trend narrative error: ${error.message}`);
    return `${topicName} is experiencing dynamic growth in the research community.`;
  }
};

/**
 * Predict future topic growth using Gemini
 */
export const predictTopicGrowth = async (topicName, historicalData, horizon) => {
  try {
    const cacheKey = `ai:prediction:${topicName}:${horizon}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    const genAI = getGeminiClient();

    const baseCount = historicalData[historicalData.length - 1]?.count || 10;
    const growthRate = historicalData.length > 1
      ? (baseCount - historicalData[0]?.count) / historicalData.length
      : 1;

    if (!genAI) {
      const predictions = Array.from({ length: horizon }, (_, i) => ({
        month: i + 1,
        predicted: Math.round(baseCount + growthRate * (i + 1) * (1 + Math.random() * 0.2)),
        confidence: Math.max(0.5, 0.95 - i * 0.04),
      }));
      await setCache(cacheKey, JSON.stringify(predictions), 7200);
      return predictions;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const histStr = historicalData.map((d) => `Month ${d.month}: ${d.count} papers`).join(', ');

    const prompt = `Given this publication history for the research topic "${topicName}":
${histStr}

Predict publication counts for the next ${horizon} months. Respond ONLY with JSON array:
[{"month": 1, "predicted": <number>, "confidence": <0-1>}, ...]`;

    let result;
    let predictions;
    try {
      result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const clean = text.replace(/^```json\n?|^```\n?|\n?```$/g, '').trim();
      predictions = JSON.parse(clean);
    } catch (err) {
      logger.warn(`Gemini prediction error (falling back to mock): ${err.message}`);
      predictions = Array.from({ length: horizon }, (_, i) => ({
        month: i + 1,
        predicted: Math.round(baseCount + growthRate * (i + 1)),
        confidence: 0.7,
      }));
    }

    await setCache(cacheKey, JSON.stringify(predictions), 7200);
    return predictions;
  } catch (error) {
    logger.error(`Prediction error (falling back to mock): ${error.message}`);
    const baseCount = historicalData[historicalData.length - 1]?.count || 10;
    const growthRate = historicalData.length > 1
      ? (baseCount - historicalData[0]?.count) / historicalData.length
      : 1;
    return Array.from({ length: horizon }, (_, i) => ({
      month: i + 1,
      predicted: Math.round(baseCount + growthRate * (i + 1)),
      confidence: 0.7,
    }));
  }
};
