import Institution from '../models/Institution.js';
import Author from '../models/Author.js';

// @desc    Get all institutions with search and pagination
// @route   GET /api/institutions
// @access  Public
export const getInstitutions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const institutions = await Institution.find(filter)
      .sort({ citations: -1, publicationCount: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Institution.countDocuments(filter);

    res.json({
      institutions,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get institution profile, top authors, and citation metrics
// @route   GET /api/institutions/:id
// @access  Public
export const getInstitutionById = async (req, res, next) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      res.status(404);
      throw new Error('Institution not found');
    }

    // Dynamic aggregation: find authors linked with this institution
    const topAuthors = await Author.find({ institutions: institution._id })
      .sort({ citations: -1, publicationsCount: -1 })
      .limit(10);

    res.json({
      institution,
      topAuthors,
    });
  } catch (error) {
    next(error);
  }
};
