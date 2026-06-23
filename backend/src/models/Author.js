import mongoose from 'mongoose';

const collaborationSchema = new mongoose.Schema({
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Author',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    orcid: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows null/missing values but enforces uniqueness when present
    },
    citations: {
      type: Number,
      default: 0,
      index: true,
    },
    publicationsCount: {
      type: Number,
      default: 0,
      index: true,
    },
    institutions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Institution',
      },
    ],
    collaborationHistory: [collaborationSchema],
  },
  {
    timestamps: true,
  }
);

// Compound index for performance
authorSchema.index({ citations: -1, publicationsCount: -1 });

const Author = mongoose.model('Author', authorSchema);
export default Author;
