// ai-chat-hub/backend/src/routes/mcp.js

import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { mcpManager } from '../services/mcpClientManager.js';

const router = Router();

router.get('/servers', async (req, res) => {
  try {
    const servers = await prisma.mcpServer.findMany({
      orderBy: { createdAt: 'asc' }
    });

    const status = mcpManager.getStatus();

    const serversWithStatus = servers.map(server => {
      const liveStatus = status.find(s => s.id === server.id);
      return {
        ...server,
        args: JSON.parse(server.args || '[]'),
        env: JSON.parse(server.env || '{}'),
        connected: liveStatus?.connected || false,
        toolCount: liveStatus?.toolCount || 0,
        tools: liveStatus?.tools || []
      };
    });

    res.json({ servers: serversWithStatus });
  } catch (error) {
    console.error('Get MCP servers error:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

router.post('/servers', async (req, res) => {
  try {
    const { name, command, args, env } = req.body;

    if (!name || !command) {
      return res.status(400).json({ error: 'name and command are required' });
    }

    const result = await mcpManager.addServer({
      name,
      command,
      args: args || [],
      env: env || {}
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Add MCP server error:', error);
    res.status(500).json({ error: 'Failed to add MCP server' });
  }
});

router.delete('/servers/:id', async (req, res) => {
  try {
    await mcpManager.removeServer(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove MCP server error:', error);
    res.status(500).json({ error: 'Failed to remove MCP server' });
  }
});

router.post('/servers/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    const result = await mcpManager.toggleServer(req.params.id, enabled);
    res.json(result);
  } catch (error) {
    console.error('Toggle MCP server error:', error);
    res.status(500).json({ error: 'Failed to toggle MCP server' });
  }
});

router.post('/servers/:id/reconnect', async (req, res) => {
  try {
    const server = await prisma.mcpServer.findUnique({
      where: { id: req.params.id }
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const result = await mcpManager.connectServer(server);
    res.json(result);
  } catch (error) {
    console.error('Reconnect MCP server error:', error);
    res.status(500).json({ error: 'Failed to reconnect MCP server' });
  }
});

router.get('/tools', (req, res) => {
  try {
    const tools = mcpManager.getAllTools();
    res.json({ tools });
  } catch (error) {
    console.error('Get MCP tools error:', error);
    res.status(500).json({ error: 'Failed to get MCP tools' });
  }
});

router.post('/tools/call', async (req, res) => {
  try {
    const { toolName, args } = req.body;

    if (!toolName) {
      return res.status(400).json({ error: 'toolName is required' });
    }

    const result = await mcpManager.callTool(toolName, args || {});
    res.json({ result });
  } catch (error) {
    console.error('Call MCP tool error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
