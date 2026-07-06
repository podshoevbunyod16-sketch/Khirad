// ai-chat-hub/backend/src/services/internalTools.js

import { prisma } from '../utils/prisma.js';

export const internalTools = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Returns relevant results with titles, URLs, and snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: 'Save an important piece of information to long-term memory. Use this when the user asks you to remember something, or when you identify important information worth remembering for future conversations.',
      parameters: {
        type: 'object',
        properties: {
          content: {
            type: 'string',
            description: 'The information to remember'
          },
          category: {
            type: 'string',
            description: 'Category for the memory (e.g., "preference", "fact", "instruction")',
            enum: ['general', 'preference', 'fact', 'instruction', 'personal']
          }
        },
        required: ['content']
      }
    }
  }
];

export async function executeWebSearch(args) {
  const { query } = args;
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey || apiKey === 'placeholder') {
    return {
      content: 'Web search is not configured. Please set SERPER_API_KEY in your environment or settings. Get a free key at https://serper.dev/api-key',
      isError: false
    };
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 5 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Serper API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const results = (data.organic || []).slice(0, 5).map((r, i) => 
      `[${i + 1}] ${r.title}\n${r.link}\n${r.snippet}`
    ).join('\n\n');

    return {
      content: results || 'No results found.',
      isError: false
    };
  } catch (error) {
    return {
      content: `Web search error: ${error.message}`,
      isError: true
    };
  }
}

export async function executeSaveMemory(args, userId) {
  const { content, category = 'general' } = args;

  if (!userId) {
    return {
      content: 'Cannot save memory: no user context.',
      isError: true
    };
  }

  try {
    const memory = await prisma.memory.create({
      data: {
        userId,
        content,
        category
      }
    });

    return {
      content: `Memory saved successfully (ID: ${memory.id}). I will remember this in future conversations.`,
      isError: false
    };
  } catch (error) {
    return {
      content: `Failed to save memory: ${error.message}`,
      isError: true
    };
  }
}

export async function getUserMemories(userId, limit = 20) {
  if (!userId) return '';

  try {
    const memories = await prisma.memory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    if (memories.length === 0) return '';

    const memoryText = memories.map(m => `- [${m.category}] ${m.content}`).join('\n');
    return `\n\n<remembered_facts>\n${memoryText}\n</remembered_facts>`;
  } catch {
    return '';
  }
}

export async function executeInternalTool(toolName, args, userId) {
  switch (toolName) {
    case 'web_search':
      return executeWebSearch(args);
    case 'save_memory':
      return executeSaveMemory(args, userId);
    default:
      return {
        content: `Unknown internal tool: ${toolName}`,
        isError: true
      };
  }
}
