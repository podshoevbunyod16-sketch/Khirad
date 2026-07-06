// ai-chat-hub/backend/src/routes/memory.js

import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const memories = await prisma.memory.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json({ memories });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { content, category } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const memory = await prisma.memory.create({
      data: {
        userId: req.userId,
        content,
        category: category || 'general'
      }
    });

    res.status(201).json({ memory });
  } catch (error) {
    console.error('Create memory error:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.memory.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Memory not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete memory error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await prisma.memory.deleteMany({
      where: { userId: req.userId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Clear memories error:', error);
    res.status(500).json({ error: 'Failed to clear memories' });
  }
});

export default router;
