import mongoose from 'mongoose';
import logger from './logger.js';

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/research_pulse';
    const conn = await mongoose.connect(connStr, {
      autoIndex: true, // Auto-build indexes in development; might disable in high production loads
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};
