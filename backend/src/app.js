import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import paperRoutes from './routes/paperRoutes.js';
import authorRoutes from './routes/authorRoutes.js';
import institutionRoutes from './routes/institutionRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { setupSwagger } from './routes/swagger.js';

dotenv.config();

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);

setupSwagger(app);

// Core routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/authors', authorRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/users', userRoutes);

// AI & Analytics routes
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to ResearchPulse AI Intelligence Platform',
    documentation: '/api/docs',
    features: ['trends', 'ai-summaries', 'semantic-search', 'recommendations', 'alerts', 'research-maps'],
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
