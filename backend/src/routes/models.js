// ai-chat-hub/backend/src/routes/models.js

import { Router } from 'express';
import { fetchOpenRouterModels, getGroqModels } from '../services/llmClient.js';

const router = Router();

const modelsCache = {
  openrouter: null,
  timestamp: 0
};

const CACHE_TTL = 5 * 60 * 1000;

router.get('/', async (req, res) => {
  try {
    let openrouterModels = [];

    if (modelsCache.openrouter && Date.now() - modelsCache.timestamp < CACHE_TTL) {
      openrouterModels = modelsCache.openrouter;
    } else {
      openrouterModels = await fetchOpenRouterModels();
      modelsCache.openrouter = openrouterModels;
      modelsCache.timestamp = Date.now();
    }

    const groqModels = getGroqModels();

    const models = [
      ...groqModels.map(m => ({ ...m, provider: 'groq' })),
      ...openrouterModels
    ];

    res.json({ models });
  } catch (error) {
    console.error('Get models error:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

router.get('/groq', (req, res) => {
  res.json({ models: getGroqModels() });
});

router.get('/openrouter', async (req, res) => {
  try {
    const models = await fetchOpenRouterModels();
    res.json({ models });
  } catch (error) {
    console.error('Get OpenRouter models error:', error);
    res.status(500).json({ error: 'Failed to fetch OpenRouter models' });
  }
});

export default router;
