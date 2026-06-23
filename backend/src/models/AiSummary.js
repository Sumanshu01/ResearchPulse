import mongoose from 'mongoose';

const aiSummarySchema = new mongoose.Schema(
  {
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      unique: true,
      index: true,
    },
    executiveSummary: {
      type: String,
      default: '',
    },
    keyContributions: {
      type: [String],
      default: [],
    },
    mainFindings: {
      type: [String],
      default: [],
    },
    limitations: {
      type: [String],
      default: [],
    },
    futureWork: {
      type: [String],
      default: [],
    },
    methodology: {
      type: String,
      default: '',
    },
    model: {
      type: String,
      default: 'gemini-1.5-flash',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const AiSummary = mongoose.model('AiSummary', aiSummarySchema);
export default AiSummary;
