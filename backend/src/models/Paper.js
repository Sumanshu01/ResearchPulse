import mongoose from 'mongoose';

const paperAuthorSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    index: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
});

const paperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authors: [paperAuthorSchema],
    abstract: {
      type: String,
      default: '',
    },
    categories: {
      type: [String],
      default: [],
      index: true,
    },
    publicationDate: {
      type: Date,
      required: true,
      index: true,
    },
    source: {
      type: String,
      required: true,
      index: true,
    },
    doi: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    citationCount: {
      type: Number,
      default: 0,
      index: true,
    },
    url: {
      type: String,
      trim: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    relatedPapers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Paper',
      },
    ],
    // AI & Analytics fields
    embedding: {
      type: [Number],
      default: undefined,
      select: false, // exclude from default queries for perf
    },
    aiSummaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AiSummary',
      default: null,
    },
    trendScore: {
      type: Number,
      default: 0,
      index: true,
    },
    topicCluster: {
      type: String,
      default: null,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Full text index on title and abstract for advanced search
paperSchema.index(
  { title: 'text', abstract: 'text' },
  { weights: { title: 10, abstract: 2 } }
);

// Indexing compound queries
paperSchema.index({ publicationDate: -1, citationCount: -1 });

const Paper = mongoose.model('Paper', paperSchema);
export default Paper;
