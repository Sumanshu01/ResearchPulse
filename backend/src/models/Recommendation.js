import mongoose from 'mongoose';

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    reasons: {
      type: [String],
      enum: ['reading_history', 'saved_papers', 'followed_topic', 'followed_author', 'semantic_similarity', 'trending'],
      default: [],
    },
    topicMatch: {
      type: [String],
      default: [],
    },
    isViewed: {
      type: Boolean,
      default: false,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique recommendation per user-paper pair
recommendationSchema.index({ userId: 1, paperId: 1 }, { unique: true });
recommendationSchema.index({ userId: 1, score: -1 });

const Recommendation = mongoose.model('Recommendation', recommendationSchema);
export default Recommendation;
