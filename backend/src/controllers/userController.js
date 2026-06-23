import User from '../models/User.js';
import SavedPaper from '../models/SavedPaper.js';
import Paper from '../models/Paper.js';
import Author from '../models/Author.js';
import Topic from '../models/Topic.js';

// @desc    Bookmark/Save a paper to a collection
// @route   POST /api/users/saved
// @access  Private
export const savePaper = async (req, res, next) => {
  try {
    const { paperId, collectionName } = req.body;
    const userId = req.user._id;

    // Verify paper exists
    const paper = await Paper.findById(paperId);
    if (!paper) {
      res.status(404);
      throw new Error('Paper not found');
    }

    const collName = collectionName || 'Bookmarks';

    // Check if already saved in this collection
    const existing = await SavedPaper.findOne({
      userId,
      paperId,
      collectionName: collName,
    });

    if (existing) {
      return res.status(400).json({ message: 'Paper already saved in this collection' });
    }

    const saved = await SavedPaper.create({
      userId,
      paperId,
      collectionName: collName,
    });

    res.status(201).json({
      message: 'Paper bookmarked successfully',
      saved,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's saved papers list
// @route   GET /api/users/saved
// @access  Private
export const getSavedPapers = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const saved = await SavedPaper.find({ userId })
      .populate('paperId')
      .sort({ createdAt: -1 });

    res.json(saved);
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a saved paper
// @route   DELETE /api/users/saved/:paperId
// @access  Private
export const deleteSavedPaper = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { paperId } = req.params;
    const { collectionName } = req.query; // Optional filter

    const filter = { userId, paperId };
    if (collectionName) {
      filter.collectionName = collectionName;
    }

    const deleted = await SavedPaper.findOneAndDelete(filter);

    if (!deleted) {
      res.status(404);
      throw new Error('Bookmark not found');
    }

    res.json({ message: 'Paper bookmark removed successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Follow/Unfollow a topic
// @route   POST /api/users/follow-topic
// @access  Private
export const toggleFollowTopic = async (req, res, next) => {
  try {
    const { topicName } = req.body;
    const userId = req.user._id;

    // Find the topic by name
    let topic = await Topic.findOne({ name: topicName });
    if (!topic) {
      topic = await Topic.create({
        name: topicName,
        description: `${topicName} research tag`,
      });
    }

    const user = await User.findById(userId);
    const index = user.followedTopics.indexOf(topic._id);

    let isFollowing = false;
    if (index > -1) {
      // Unfollow
      user.followedTopics.splice(index, 1);
      topic.followersCount = Math.max(0, topic.followersCount - 1);
    } else {
      // Follow
      user.followedTopics.push(topic._id);
      topic.followersCount += 1;
      isFollowing = true;
    }

    await user.save();
    await topic.save();

    res.json({
      message: isFollowing ? 'Topic followed successfully' : 'Topic unfollowed successfully',
      isFollowing,
      topicName,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Follow/Unfollow an author
// @route   POST /api/users/follow-author
// @access  Private
export const toggleFollowAuthor = async (req, res, next) => {
  try {
    const { authorId } = req.body;
    const userId = req.user._id;

    const author = await Author.findById(authorId);
    if (!author) {
      res.status(404);
      throw new Error('Author not found');
    }

    const user = await User.findById(userId);
    const index = user.followedAuthors.indexOf(author._id);

    let isFollowing = false;
    if (index > -1) {
      user.followedAuthors.splice(index, 1);
    } else {
      user.followedAuthors.push(author._id);
      isFollowing = true;
    }

    await user.save();

    res.json({
      message: isFollowing ? 'Author followed successfully' : 'Author unfollowed successfully',
      isFollowing,
      authorId,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's profile summary (followed topics/authors, saved lists)
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followedTopics', 'name description followersCount')
      .populate('followedAuthors', 'name citations publicationsCount')
      .select('-password');

    const savedCount = await SavedPaper.countDocuments({ userId: req.user._id });

    res.json({
      user,
      savedCount,
    });
  } catch (error) {
    next(error);
  }
};
