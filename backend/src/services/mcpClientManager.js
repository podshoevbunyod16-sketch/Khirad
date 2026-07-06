// ai-chat-hub/backend/src/services/mcpClientManager.js

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { prisma } from '../utils/prisma.js';

class McpClientManager {
  constructor() {
    this.clients = new Map();
    this.tools = new Map();
  }

  async initialize() {
    try {
      const servers = await prisma.mcpServer.findMany({
        where: { enabled: true }
      });

      for (const server of servers) {
        await this.connectServer(server);
      }

      console.log(`MCP: Initialized ${this.clients.size} server(s)`);
    } catch (error) {
      console.error('MCP initialization error:', error);
    }
  }

  async connectServer(serverConfig) {
    const { id, name, command, args, env } = serverConfig;

    if (this.clients.has(id)) {
      await this.disconnectServer(id);
    }

    try {
      const argsArray = args ? JSON.parse(args) : [];
      const envObject = env ? JSON.parse(env) : {};

      const mergedEnv = { ...process.env, ...envObject };

      const transport = new StdioClientTransport({
        command,
        args: argsArray,
        env: mergedEnv
      });

      const client = new Client(
        { name: 'ai-chat-hub', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );

      await client.connect(transport);

      const toolsResult = await client.listTools();
      const serverTools = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema || { type: 'object', properties: {} },
        serverId: id,
        serverName: name
      }));

      this.clients.set(id, { client, transport, config: serverConfig });
      this.tools.set(id, serverTools);

      console.log(`MCP: Connected to "${name}" with ${serverTools.length} tool(s)`);

      await prisma.mcpServer.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      return { success: true, tools: serverTools };
    } catch (error) {
      console.error(`MCP: Failed to connect to "${name}":`, error.message);
      return { success: false, error: error.message };
    }
  }

  async disconnectServer(serverId) {
    const entry = this.clients.get(serverId);
    if (!entry) return;

    try {
      await entry.client.close();
    } catch (error) {
      console.error(`MCP: Error closing client ${serverId}:`, error.message);
    }

    this.clients.delete(serverId);
    this.tools.delete(serverId);
  }

  async addServer(config) {
    const server = await prisma.mcpServer.create({
      data: {
        name: config.name,
        command: config.command,
        args: JSON.stringify(config.args || []),
        env: JSON.stringify(config.env || {}),
        enabled: true
      }
    });

    const result = await this.connectServer(server);
    return { server, ...result };
  }

  async removeServer(serverId) {
    await this.disconnectServer(serverId);
    await prisma.mcpServer.delete({ where: { id: serverId } });
  }

  async toggleServer(serverId, enabled) {
    if (enabled) {
      const server = await prisma.mcpServer.update({
        where: { id: serverId },
        data: { enabled: true }
      });
      return this.connectServer(server);
    } else {
      await this.disconnectServer(serverId);
      await prisma.mcpServer.update({
        where: { id: serverId },
        data: { enabled: false }
      });
      return { success: true };
    }
  }

  getAllTools() {
    const allTools = [];
    for (const [serverId, tools] of this.tools) {
      for (const tool of tools) {
        allTools.push({
          type: 'function',
          function: {
            name: `${tool.serverName}__${tool.name}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            description: `[${tool.serverName}] ${tool.description}`,
            parameters: tool.inputSchema
          },
          _mcp: {
            serverId: tool.serverId,
            serverName: tool.serverName,
            originalName: tool.name
          }
        });
      }
    }
    return allTools;
  }

  getToolsForProvider() {
    return this.getAllTools().map(t => ({
      type: t.type,
      function: t.function
    }));
  }

  async callTool(functionName, args) {
    let targetServerId = null;
    let targetToolName = null;

    for (const [serverId, tools] of this.tools) {
      for (const tool of tools) {
        const mappedName = `${tool.serverName}__${tool.name}`.replace(/[^a-zA-Z0-9_]/g, '_');
        if (mappedName === functionName) {
          targetServerId = serverId;
          targetToolName = tool.name;
          break;
        }
      }
      if (targetServerId) break;
    }

    if (!targetServerId || !targetToolName) {
      throw new Error(`Tool not found: ${functionName}`);
    }

    const entry = this.clients.get(targetServerId);
    if (!entry) {
      throw new Error(`MCP server not connected for tool: ${functionName}`);
    }

    try {
      const result = await entry.client.callTool({
        name: targetToolName,
        arguments: args
      });
      return result;
    } catch (error) {
      console.error(`MCP: Tool call failed (${functionName}):`, error.message);
      throw error;
    }
  }

  getStatus() {
    const servers = [];
    for (const [id, entry] of this.clients) {
      const tools = this.tools.get(id) || [];
      servers.push({
        id,
        name: entry.config.name,
        command: entry.config.command,
        connected: true,
        toolCount: tools.length,
        tools: tools.map(t => ({ name: t.name, description: t.description }))
      });
    }
    return servers;
  }

  async shutdown() {
    for (const [id] of this.clients) {
      await this.disconnectServer(id);
    }
    console.log('MCP: All clients disconnected');
  }
}

export const mcpManager = new McpClientManager();
