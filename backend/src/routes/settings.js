// ai-chat-hub/backend/src/routes/settings.js

import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const settings = await prisma.userSetting.findMany({
      where: { userId: req.userId }
    });

    const settingsMap = {};
    for (const s of settings) {
      if (s.key.endsWith('_key')) {
        settingsMap[s.key] = '***configured***';
      } else {
        settingsMap[s.key] = s.value;
      }
    }

    res.json({ settings: settingsMap });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      const processedValue = key.endsWith('_key') ? encrypt(value) : String(value);

      await prisma.userSetting.upsert({
        where: { userId_key: { userId: req.userId, key } },
        update: { value: processedValue },
        create: { userId: req.userId, key, value: processedValue }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    await prisma.userSetting.deleteMany({
      where: { userId: req.userId, key: req.params.key }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Failed to delete setting' });
  }
});

router.get('/api-keys', async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.userId },
      select: { id: true, provider: true, createdAt: true, updatedAt: true }
    });

    res.json({ keys });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Failed to get API keys' });
  }
});

router.put('/api-keys', async (req, res) => {
  try {
    const { provider, key } = req.body;

    if (!provider || !key) {
      return res.status(400).json({ error: 'provider and key are required' });
    }

    const encryptedKey = encrypt(key);

    await prisma.apiKey.upsert({
      where: { userId_provider: { userId: req.userId, provider } },
      update: { key: encryptedKey },
      create: { userId: req.userId, provider, key: encryptedKey }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Save API key error:', error);
    res.status(500).json({ error: 'Failed to save API key' });
  }
});

router.delete('/api-keys/:provider', async (req, res) => {
  try {
    await prisma.apiKey.deleteMany({
      where: { userId: req.userId, provider: req.params.provider }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
