import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import authRoutes from './routes/auth.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint (accessible via /api/health and /health)
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Tech For You - Certificate Management & Verification API',
    database: db.getDatabaseStatus(),
    environment: process.env.VERCEL ? 'vercel-serverless' : 'node-runtime',
  });
});

// Primary API routes (prefixed with /api)
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', publicRoutes); // for /api/certificates/verify and /api/certificates/search
app.use('/api/admin', adminRoutes);

// Fallback direct routes for environments where /api might be stripped
app.use('/auth', authRoutes);
app.use('/public', publicRoutes);
app.use('/admin', adminRoutes);

export default app;
