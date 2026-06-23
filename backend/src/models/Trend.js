import mongoose from 'mongoose';

const trendSchema = new mongoose.Schema(
  {
    topicName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    period: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      required: true,
      index: true,
    },
    publicationCount: {
      type: Number,
      default: 0,
    },
    previousCount: {
      type: Number,
      default: 0,
    },
    growthPercent: {
      type: Number,
      default: 0,
    },
    citationGrowth: {
      type: Number,
      default: 0,
    },
    totalCitations: {
      type: Number,
      default: 0,
    },
    trendScore: {
      type: Number,
      default: 0,
      index: true,
    },
    status: {
      type: String,
      enum: ['emerging', 'growing', 'stable', 'declining'],
      default: 'stable',
      index: true,
    },
    snapshotDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Historical data points for sparklines
    history: [
      {
        date: Date,
        count: Number,
        citations: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for unique period snapshots per topic
trendSchema.index({ topicName: 1, period: 1, snapshotDate: -1 });

const Trend = mongoose.model('Trend', trendSchema);
export default Trend;
