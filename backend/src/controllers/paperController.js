import Paper from '../models/Paper.js';
import { triggerIngestionJob } from '../jobs/queue.js';
import { recordPaperView } from '../services/recommendationService.js';
import { seedDatabase } from '../services/ingestionService.js';
import logger from '../config/logger.js';


// @desc    Get paginated papers list with filters and sorting
// @route   GET /api/papers
// @access  Public
export const getPapers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) {
      filter.categories = req.query.category;
    }
    if (req.query.source) {
      filter.source = req.query.source;
    }

    let sort = { publicationDate: -1 }; // default: newest published
    if (req.query.sortBy === 'citations') {
      sort = { citationCount: -1 };
    } else if (req.query.sortBy === 'recent_added') {
      sort = { createdAt: -1 };
    }

    const papers = await Paper.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Paper.countDocuments(filter);

    res.json({
      papers,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single paper by ID with details and related papers
// @route   GET /api/papers/:id
// @access  Public
export const getPaperById = async (req, res, next) => {
  try {
    const paper = await Paper.findById(req.params.id)
      .populate('relatedPapers', 'title publicationDate source citationCount doi');

    if (!paper) {
      res.status(404);
      throw new Error('Paper not found');
    }

    if (req.user) {
      await recordPaperView(req.user._id, paper._id);
    }

    res.json(paper);
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger background paper ingestion (Manual override)
// @route   POST /api/papers/ingest
// @access  Private/Admin
export const triggerIngestion = async (req, res, next) => {
  try {
    logger.info(`Manual paper ingestion triggered by user: ${req.user.email}`);
    const jobDetails = await triggerIngestionJob();
    res.json({
      message: 'Ingestion job successfully triggered in the background',
      jobDetails,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Public seed endpoint — populates DB with papers across all topics
// @route   POST /api/papers/seed
// @access  Public (for development / first-run setup)
export const seedPapers = async (req, res, next) => {
  try {
    const paperCount = await Paper.countDocuments();
    if (paperCount >= 200) {
      return res.json({ message: `Database already has ${paperCount} papers. No seeding needed.`, count: paperCount });
    }
    logger.info('Public seed endpoint triggered. Starting background seeding...');
    // fire-and-forget so response returns immediately
    seedDatabase().catch((e) => logger.error(`Seed error: ${e.message}`));
    res.json({ message: 'Seeding started in background. This may take 2-5 minutes. Keep refreshing search.', paperCount });
  } catch (error) {
    next(error);
  }
};
