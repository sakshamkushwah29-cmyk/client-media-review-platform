import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config';
import { initDatabase } from './db';
import { seedDatabase } from './db/seed';

import authRoutes from './routes/auth';
import orgRoutes from './routes/org';
import projectRoutes from './routes/projects';
import assetRoutes from './routes/assets';
import reviewRoutes from './routes/review';
import commentRoutes from './routes/comments';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-review-passphrase', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Disposition'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.path.includes('/media')) {
      console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/organization', orgRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', assetRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/comments', commentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend build in production if available
const clientDist = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // Express 5 compatible catch-all fallback
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api') && (req.method === 'GET' || req.method === 'HEAD')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
    });
  }
});

// Bootstrapping
async function bootstrap() {
  try {
    initDatabase();
    await seedDatabase();

    app.listen(CONFIG.PORT, '0.0.0.0', () => {
      console.log(`\n========================================================`);
      console.log(`🚀 Client Media Review Platform API Server running!`);
      console.log(`📡 Backend API:     http://localhost:${CONFIG.PORT}`);
      console.log(`💻 Web Application:  http://localhost:${CONFIG.PORT}`);
      console.log(`🎬 Sample Review:   http://localhost:${CONFIG.PORT}/review/sharma-wedding-teaser-review`);
      console.log(`========================================================\n`);
    });
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

bootstrap();
