import Author from '../models/Author.js';
import Paper from '../models/Paper.js';

// @desc    Get all authors with search and pagination
// @route   GET /api/authors
// @access  Public
export const getAuthors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    const filter = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const authors = await Author.find(filter)
      .sort({ citations: -1, publicationsCount: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Author.countDocuments(filter);

    res.json({
      authors,
      page,
      pages: Math.ceil(total / limit),
      total,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get author profile by ID, publications, and collaboration metrics
// @route   GET /api/authors/:id
// @access  Public
export const getAuthorById = async (req, res, next) => {
  try {
    const author = await Author.findById(req.params.id)
      .populate('institutions', 'name location');

    if (!author) {
      res.status(404);
      throw new Error('Author not found');
    }

    // Dynamic retrieval of all papers authored by this researcher
    const publications = await Paper.find({ 'authors.authorId': author._id })
      .sort({ publicationDate: -1 });

    // Derive collaboration networks dynamically from their papers
    const coAuthorsMap = new Map();
    publications.forEach((paper) => {
      paper.authors.forEach((auth) => {
        if (auth.authorId && auth.authorId.toString() !== author._id.toString()) {
          const key = auth.authorId.toString();
          if (coAuthorsMap.has(key)) {
            const val = coAuthorsMap.get(key);
            val.count += 1;
            coAuthorsMap.set(key, val);
          } else {
            coAuthorsMap.set(key, {
              authorId: auth.authorId,
              name: auth.name,
              count: 1,
            });
          }
        }
      });
    });

    const collaborationHistory = Array.from(coAuthorsMap.values())
      .sort((a, b) => b.count - a.count);

    res.json({
      author: {
        _id: author._id,
        name: author.name,
        orcid: author.orcid,
        citations: author.citations,
        publicationsCount: author.publicationsCount,
        institutions: author.institutions,
        createdAt: author.createdAt,
      },
      publications,
      collaborationHistory,
    });
  } catch (error) {
    next(error);
  }
};
