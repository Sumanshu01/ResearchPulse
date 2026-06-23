import Paper from '../models/Paper.js';
import Author from '../models/Author.js';
import Institution from '../models/Institution.js';

// @desc    Advanced search for research papers
// @route   GET /api/search
// @access  Public
export const searchPapers = async (req, res, next) => {
  try {
    const {
      q,          // Text search query
      author,     // Author name search
      institution,// Institution name search
      year,       // Specific publication year (YYYY)
      yearMin,    // Minimum year (YYYY)
      yearMax,    // Maximum year (YYYY)
      topic,      // Category / Topic tag
      citations,  // Min citation count
      source,     // Ingestion source
      sortBy,     // 'relevance' | 'newest' | 'citations'
      page,
      limit,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // 1. Text Index Search
    if (q) {
      query.$text = { $search: q };
    }

    // 2. Author filtering
    if (author) {
      // Find matching authors
      const matchedAuthors = await Author.find({
        name: { $regex: author, $options: 'i' },
      }).select('_id');
      
      const authorIds = matchedAuthors.map((a) => a._id);
      query.$or = [
        { 'authors.authorId': { $in: authorIds } },
        { 'authors.name': { $regex: author, $options: 'i' } } // Fallback for name matching
      ];
    }

    // 3. Institution filtering
    if (institution) {
      const matchedInsts = await Institution.find({
        name: { $regex: institution, $options: 'i' },
      }).select('_id');

      const instIds = matchedInsts.map((i) => i._id);
      const linkedAuthors = await Author.find({
        institutions: { $in: instIds },
      }).select('_id');

      const authorIdsFromInst = linkedAuthors.map((a) => a._id);
      if (query.$or) {
        // If author condition already exists, intersect or add
        query.$and = [
          { $or: query.$or },
          { 'authors.authorId': { $in: authorIdsFromInst } }
        ];
        delete query.$or;
      } else {
        query['authors.authorId'] = { $in: authorIdsFromInst };
      }
    }

    // 4. Topic/Category filtering
    if (topic) {
      query.categories = { $regex: topic, $options: 'i' };
    }

    // 5. Source filtering
    if (source) {
      query.source = { $regex: `^${source}$`, $options: 'i' };
    }

    // 6. Citation count minimum
    if (citations) {
      const minCitations = parseInt(citations);
      if (!isNaN(minCitations)) {
        query.citationCount = { $gte: minCitations };
      }
    }

    // 7. Year range filtering
    const dateQuery = {};
    if (year) {
      const y = parseInt(year);
      if (!isNaN(y)) {
        dateQuery.$gte = new Date(`${y}-01-01`);
        dateQuery.$lte = new Date(`${y}-12-31T23:59:59.999Z`);
      }
    } else {
      if (yearMin) {
        const yMin = parseInt(yearMin);
        if (!isNaN(yMin)) dateQuery.$gte = new Date(`${yMin}-01-01`);
      }
      if (yearMax) {
        const yMax = parseInt(yearMax);
        if (!isNaN(yMax)) dateQuery.$lte = new Date(`${yMax}-12-31T23:59:59.999Z`);
      }
    }

    if (Object.keys(dateQuery).length > 0) {
      query.publicationDate = dateQuery;
    }

    // Determine sorting logic
    let sort = {};
    let project = {};

    if (q && (!sortBy || sortBy === 'relevance')) {
      // Sort by text score search relevance
      project = { score: { $meta: 'textScore' } };
      sort = { score: { $meta: 'textScore' } };
    } else if (sortBy === 'newest') {
      sort = { publicationDate: -1 };
    } else if (sortBy === 'citations') {
      sort = { citationCount: -1 };
    } else {
      sort = { publicationDate: -1 }; // Default fallback
    }

    let papers = await Paper.find(query, project)
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    let total = await Paper.countDocuments(query);

    // ── Fallback: if text index returned 0 results, retry with regex on title/abstract ──
    if (q && total === 0) {
      const words = q.trim().split(/\s+/).filter(Boolean);
      const regexParts = words.map((w) => `(?=.*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`).join('');
      const regexPattern = new RegExp(regexParts, 'i');

      const fallbackQuery = { ...query };
      delete fallbackQuery.$text;

      // Match title OR abstract with the combined regex
      const textCondition = {
        $or: [
          { title: { $regex: regexPattern } },
          { abstract: { $regex: regexPattern } },
        ],
      };

      if (fallbackQuery.$and) {
        fallbackQuery.$and.push(textCondition);
      } else if (fallbackQuery.$or) {
        fallbackQuery.$and = [{ $or: fallbackQuery.$or }, textCondition];
        delete fallbackQuery.$or;
      } else {
        Object.assign(fallbackQuery, textCondition);
      }

      const fallbackSort = sortBy === 'newest'
        ? { publicationDate: -1 }
        : sortBy === 'citations'
          ? { citationCount: -1 }
          : { citationCount: -1, publicationDate: -1 };

      papers = await Paper.find(fallbackQuery)
        .sort(fallbackSort)
        .skip(skip)
        .limit(limitNum);

      total = await Paper.countDocuments(fallbackQuery);
    }

    res.json({
      papers,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      total,
    });
  } catch (error) {
    next(error);
  }
};
