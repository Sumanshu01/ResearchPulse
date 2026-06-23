import axios from 'axios';
import logger from '../config/logger.js';
import Paper from '../models/Paper.js';
import { getCache, setCache } from '../config/redis.js';

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || 'http://localhost:5001';
const EMBEDDING_DIM = 384; // all-MiniLM-L6-v2 output dimension

/**
 * Check if the Python embedding service is alive
 */
export const isEmbeddingServiceAlive = async () => {
  try {
    await axios.get(`${EMBEDDING_SERVICE_URL}/health`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
};

/**
 * Generate a random unit vector (fallback when Python service unavailable)
 */
const randomEmbedding = () => {
  const vec = Array.from({ length: EMBEDDING_DIM }, () => Math.random() - 0.5);
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / norm);
};

/**
 * Get embedding for a text string
 */
export const getEmbedding = async (text) => {
  try {
    const alive = await isEmbeddingServiceAlive();
    if (!alive) {
      logger.warn('Embedding service not available — using random vector fallback');
      return randomEmbedding();
    }
    const { data } = await axios.post(
      `${EMBEDDING_SERVICE_URL}/embed`,
      { text: text.slice(0, 1000) }, // limit length
      { timeout: 10000 }
    );
    return data.embedding;
  } catch (error) {
    logger.error(`Embedding generation error: ${error.message}`);
    return randomEmbedding();
  }
};

/**
 * Batch embed multiple texts
 */
export const getEmbeddingBatch = async (texts) => {
  try {
    const alive = await isEmbeddingServiceAlive();
    if (!alive) {
      return texts.map(() => randomEmbedding());
    }
    const { data } = await axios.post(
      `${EMBEDDING_SERVICE_URL}/embed-batch`,
      { texts: texts.map((t) => t.slice(0, 1000)) },
      { timeout: 30000 }
    );
    return data.embeddings;
  } catch (error) {
    logger.error(`Batch embedding error: ${error.message}`);
    return texts.map(() => randomEmbedding());
  }
};

/**
 * Cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Generate and store embedding for a paper
 */
export const updatePaperEmbedding = async (paperId) => {
  try {
    const paper = await Paper.findById(paperId).lean();
    if (!paper) throw new Error('Paper not found');

    const text = `${paper.title}. ${paper.abstract || ''}`.trim();
    const embedding = await getEmbedding(text);

    await Paper.findByIdAndUpdate(paperId, { embedding });
    logger.debug(`Embedding updated for paper: ${paper.title}`);
    return embedding;
  } catch (error) {
    logger.error(`Update paper embedding error: ${error.message}`);
    throw error;
  }
};

/**
 * Find semantically similar papers to a given paper
 */
export const getSimilarPapers = async (paperId, limit = 6) => {
  try {
    const cacheKey = `embed:similar:${paperId}:${limit}`;
    const cached = await getCache(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get embedding for source paper
    const sourcePaper = await Paper.findById(paperId).select('+embedding').lean();
    if (!sourcePaper) throw new Error('Paper not found');

    let queryEmbedding = sourcePaper.embedding;
    if (!queryEmbedding || queryEmbedding.length === 0) {
      const text = `${sourcePaper.title}. ${sourcePaper.abstract || ''}`;
      queryEmbedding = await getEmbedding(text);
      await Paper.findByIdAndUpdate(paperId, { embedding: queryEmbedding });
    }

    // Fetch candidate papers that have embeddings
    const candidates = await Paper.find({
      _id: { $ne: paperId },
      embedding: { $exists: true, $not: { $size: 0 } },
    })
      .select('+embedding title authors abstract categories publicationDate citationCount source')
      .limit(200)
      .lean();

    if (candidates.length === 0) {
      // Fall back to category-based similarity
      const fallback = await Paper.find({
        _id: { $ne: paperId },
        categories: { $in: sourcePaper.categories || [] },
      })
        .limit(limit)
        .select('title authors abstract categories publicationDate citationCount source')
        .lean();
      return fallback;
    }

    // Score by cosine similarity
    const scored = candidates.map((p) => ({
      ...p,
      similarity: cosineSimilarity(queryEmbedding, p.embedding),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);
    const results = scored.slice(0, limit).map(({ embedding, ...rest }) => rest);

    await setCache(cacheKey, JSON.stringify(results), 21600); // 6h
    return results;
  } catch (error) {
    logger.error(`Similar papers error: ${error.message}`);
    // Graceful fallback
    const paper = await Paper.findById(paperId).lean();
    return Paper.find({
      _id: { $ne: paperId },
      categories: { $in: paper?.categories || [] },
    })
      .limit(limit)
      .lean();
  }
};

/**
 * Batch update embeddings for papers missing them
 */
export const batchUpdateEmbeddings = async (batchSize = 20) => {
  try {
    const papers = await Paper.find({
      $or: [
        { embedding: { $exists: false } },
        { embedding: { $size: 0 } },
      ],
    })
      .select('+embedding title abstract')
      .limit(batchSize)
      .lean();

    if (papers.length === 0) {
      logger.info('All papers already have embeddings');
      return 0;
    }

    const texts = papers.map((p) => `${p.title}. ${p.abstract || ''}`);
    const embeddings = await getEmbeddingBatch(texts);

    let updated = 0;
    for (let i = 0; i < papers.length; i++) {
      await Paper.findByIdAndUpdate(papers[i]._id, { embedding: embeddings[i] });
      updated++;
    }

    logger.info(`Updated embeddings for ${updated} papers`);
    return updated;
  } catch (error) {
    logger.error(`Batch embedding update error: ${error.message}`);
    return 0;
  }
};
