import mongoose from 'mongoose';

const topicSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    followersCount: {
      type: Number,
      default: 0,
      index: true,
    },
    paperCount: {
      type: Number,
      default: 0,
      index: true,
    },
    weeklyGrowth: {
      type: Number,
      default: 0,
    },
    monthlyGrowth: {
      type: Number,
      default: 0,
    },
    trendScore: {
      type: Number,
      default: 0,
      index: true,
    },
    isEmergingTopic: {
      type: Boolean,
      default: false,
      index: true,
    },
    totalCitations: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Topic = mongoose.model('Topic', topicSchema);
export default Topic;
