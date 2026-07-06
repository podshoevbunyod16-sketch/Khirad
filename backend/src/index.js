// ai-chat-hub/backend/src/index.js

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import conversationRoutes from './routes/conversations.js';
import modelRoutes from './routes/models.js';
import mcpRoutes from './routes/mcp.js';
import settingsRoutes from './routes/settings.js';
import memoryRoutes from './routes/memory.js';
import { authMiddleware } from './middleware/auth.js';
import { prisma } from './utils/prisma.js';
import { mcpManager } from './services/mcpClientManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean);

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/conversations', authMiddleware, conversationRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/mcp', authMiddleware, mcpRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/memory', authMiddleware, memoryRoutes);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = join(__dirname, '../../frontend/dist');
  console.log('Serving frontend from:', frontendPath);
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(join(frontendPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    await mcpManager.initialize();
    console.log('MCP Manager initialized');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mcpManager.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  await mcpManager.shutdown();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
