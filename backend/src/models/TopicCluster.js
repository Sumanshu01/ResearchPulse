import mongoose from 'mongoose';

const topicClusterSchema = new mongoose.Schema(
  {
    clusterName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    topics: {
      type: [String],
      default: [],
    },
    paperCount: {
      type: Number,
      default: 0,
      index: true,
    },
    totalCitations: {
      type: Number,
      default: 0,
    },
    growthPercent: {
      type: Number,
      default: 0,
    },
    researchGaps: {
      type: [String],
      default: [],
    },
    suggestedDirections: {
      type: [String],
      default: [],
    },
    isEmerging: {
      type: Boolean,
      default: false,
      index: true,
    },
    trendScore: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const TopicCluster = mongoose.model('TopicCluster', topicClusterSchema);
export default TopicCluster;
