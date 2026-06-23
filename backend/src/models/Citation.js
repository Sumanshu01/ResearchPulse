import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    citedByPaperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    citationDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'citations',
  }
);

// Compound index to ensure uniqueness of citation linkages
citationSchema.index({ paperId: 1, citedByPaperId: 1 }, { unique: true });

const Citation = mongoose.model('Citation', citationSchema);
export default Citation;
