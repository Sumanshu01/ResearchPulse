import mongoose from 'mongoose';

const savedPaperSchema = new mongoose.Schema(
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
    collectionName: {
      type: String,
      default: 'Bookmarks',
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'saved_papers',
  }
);

// Compound index to prevent saving the same paper multiple times in the same collection
savedPaperSchema.index({ userId: 1, paperId: 1, collectionName: 1 }, { unique: true });

const SavedPaper = mongoose.model('SavedPaper', savedPaperSchema);
export default SavedPaper;
