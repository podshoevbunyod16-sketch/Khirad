// ai-chat-hub/backend/src/routes/chat.js

import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { streamChatCompletion, chatCompletion, getApiKey } from '../services/llmClient.js';
import { mcpManager } from '../services/mcpClientManager.js';
import { internalTools, executeInternalTool, getUserMemories } from '../services/internalTools.js';

const router = Router();

const MAX_TOOL_ITERATIONS = 10;

function buildSystemPrompt(options = {}) {
  const { chainOfThought = false, memories = '' } = options;

  let prompt = `You are a helpful, knowledgeable AI assistant integrated into AI Chat Hub. You can engage in natural conversation, answer questions, write code, and help with various tasks.`;

  if (chainOfThought) {
    prompt += `\n\nWhen thinking through complex problems, wrap your internal reasoning in <thinking> tags. Example:\n<thinking>\nLet me break this down...\n</thinking>\n\nYour final answer should be clear and concise, without the thinking tags.`;
  }

  if (memories) {
    prompt += memories;
  }

  return prompt;
}

router.post('/', async (req, res) => {
  const { conversationId, message, model, provider, temperature, maxTokens, chainOfThought } = req.body;

  if (!message || !model || !provider) {
    return res.status(400).json({ error: 'message, model, and provider are required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let convId = conversationId;

    if (!convId) {
      const conversation = await prisma.conversation.create({
        data: {
          userId: req.userId,
          title: message.substring(0, 100),
          model,
          provider
        }
      });
      convId = conversation.id;
      sendEvent('conversation_created', { id: convId, title: conversation.title });
    }

    await prisma.message.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: message
      }
    });

    const memories = await getUserMemories(req.userId);
    const systemPrompt = buildSystemPrompt({ chainOfThought, memories });

    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 50
    });

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.filter(m => !m.toolCallId).map(m => ({
        role: m.role,
        content: m.content
      }))
    ];

    const mcpTools = mcpManager.getToolsForProvider();
    const allTools = [...internalTools, ...mcpTools];

    const tools = allTools.length > 0 ? allTools : undefined;

    let iterations = 0;
    let fullResponse = '';
    let totalTokens = 0;

    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await streamChatCompletion({
        provider,
        model,
        messages,
        tools,
        userId: req.userId,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 4096
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentContent = '';
      let toolCalls = [];
      let currentToolCall = null;
      let finishReason = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            const choice = chunk.choices?.[0];

            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }

            if (chunk.usage) {
              totalTokens = chunk.usage.total_tokens || 0;
            }

            if (delta?.content) {
              currentContent += delta.content;
              fullResponse += delta.content;
              sendEvent('token', { content: delta.content });
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (tc.index !== undefined) {
                  if (!toolCalls[tc.index]) {
                    toolCalls[tc.index] = {
                      id: tc.id || '',
                      type: 'function',
                      function: { name: '', arguments: '' }
                    };
                  }
                  const current = toolCalls[tc.index];
                  if (tc.id) current.id = tc.id;
                  if (tc.function?.name) current.function.name += tc.function.name;
                  if (tc.function?.arguments) current.function.arguments += tc.function.arguments;
                }
              }
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      if (toolCalls.length > 0 && finishReason === 'tool_calls') {
        if (currentContent) {
          await prisma.message.create({
            data: {
              conversationId: convId,
              role: 'assistant',
              content: currentContent,
              model,
              provider,
              tokensUsed: totalTokens
            }
          });
        }

        messages.push({
          role: 'assistant',
          content: currentContent || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }))
        });

        for (const toolCall of toolCalls) {
          const { name, arguments: argsStr } = toolCall.function;
          let args;
          try {
            args = JSON.parse(argsStr);
          } catch {
            args = {};
          }

          sendEvent('tool_call', { name, args });

          let result;
          const isInternal = internalTools.some(t => t.function.name === name);

          if (isInternal) {
            result = await executeInternalTool(name, args, req.userId);
          } else {
            try {
              result = await mcpManager.callTool(name, args);
            } catch (error) {
              result = { content: `Tool error: ${error.message}`, isError: true };
            }
          }

          const resultContent = typeof result.content === 'string'
            ? result.content
            : JSON.stringify(result.content || result);

          sendEvent('tool_result', {
            name,
            result: resultContent.substring(0, 2000)
          });

          await prisma.message.create({
            data: {
              conversationId: convId,
              role: 'tool',
              content: resultContent,
              toolCallId: toolCall.id,
              toolName: name
            }
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultContent
          });
        }

        continue;
      }

      break;
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      const errorMsg = 'Reached maximum tool call iterations (10). Stopping to prevent infinite loop.';
      sendEvent('error', { message: errorMsg });
      fullResponse += '\n\n[Note: ' + errorMsg + ']';
    }

    await prisma.message.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: fullResponse,
        model,
        provider,
        tokensUsed: totalTokens
      }
    });

    sendEvent('done', {
      conversationId: convId,
      tokensUsed: totalTokens
    });

  } catch (error) {
    console.error('Chat error:', error);
    sendEvent('error', { message: error.message });
  } finally {
    res.end();
  }
});

export default router;
