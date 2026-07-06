// ai-chat-hub/backend/src/routes/conversations.js

import { Router } from 'express';
import { prisma } from '../utils/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        model: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } }
      }
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, model, provider } = req.body;

    const conversation = await prisma.conversation.create({
      data: {
        userId: req.userId,
        title: title || 'New Chat',
        model: model || 'llama-3.3-70b-versatile',
        provider: provider || 'groq'
      }
    });

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { title } = req.body;

    const conversation = await prisma.conversation.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { title }
    });

    if (conversation.count === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await prisma.conversation.deleteMany({
      where: { id: req.params.id, userId: req.userId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router;
