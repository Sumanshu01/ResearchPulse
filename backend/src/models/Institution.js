import mongoose from 'mongoose';

const institutionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    location: {
      type: String,
      trim: true,
    },
    publicationCount: {
      type: Number,
      default: 0,
      index: true,
    },
    citations: {
      type: Number,
      default: 0,
      index: true,
    },
    topAuthors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Author',
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Institution = mongoose.model('Institution', institutionSchema);
export default Institution;
