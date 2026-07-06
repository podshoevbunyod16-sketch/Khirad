// ai-chat-hub/backend/src/services/llmClient.js

import { prisma } from '../utils/prisma.js';
import { decrypt } from '../utils/encryption.js';

const PROVIDER_CONFIGS = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultKeyEnv: 'GROQ_API_KEY',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    })
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultKeyEnv: 'OPENROUTER_API_KEY',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ai-chat-hub.local',
      'X-Title': 'AI Chat Hub'
    })
  }
};

export async function getApiKey(provider, userId = null) {
  if (userId) {
    const userKey = await prisma.apiKey.findUnique({
      where: { userId_provider: { userId, provider } }
    });
    if (userKey) {
      try {
        return decrypt(userKey.key);
      } catch {
        // Fall through to env key
      }
    }
  }
  
  const envKey = process.env[PROVIDER_CONFIGS[provider]?.defaultKeyEnv];
  if (!envKey || envKey.includes('placeholder')) {
    throw new Error(`No API key configured for ${provider}. Set it in Settings or .env`);
  }
  return envKey;
}

export async function streamChatCompletion({ provider, model, messages, tools, userId, temperature = 0.7, maxTokens = 4096 }) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const apiKey = await getApiKey(provider, userId);

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }

    if (response.status === 429) {
      throw new Error(`Rate limited by ${provider}: ${errorMessage}. Please wait and try again.`);
    }
    if (response.status === 401) {
      throw new Error(`Invalid API key for ${provider}. Check your settings.`);
    }
    if (response.status === 402) {
      throw new Error(`Insufficient credits on ${provider}: ${errorMessage}`);
    }
    throw new Error(`${provider} API error (${response.status}): ${errorMessage}`);
  }

  return response;
}

export async function chatCompletion({ provider, model, messages, tools, userId, temperature = 0.7, maxTokens = 4096 }) {
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const apiKey = await getApiKey(provider, userId);

  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: false
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: config.headers(apiKey),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error?.message || errorJson.error || errorText;
    } catch {
      errorMessage = errorText;
    }
    throw new Error(`${provider} API error (${response.status}): ${errorMessage}`);
  }

  const data = await response.json();
  return data;
}

export async function fetchOpenRouterModels() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) {
    return [];
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch OpenRouter models:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data.map(m => ({
      id: m.id,
      name: m.name,
      provider: 'openrouter',
      contextLength: m.context_length,
      pricing: m.pricing
    }));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

export function getGroqModels() {
  return [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', contextLength: 131072 },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq', contextLength: 131072 },
    { id: 'llama3-70b-8192', name: 'Llama 3 70B', provider: 'groq', contextLength: 8192 },
    { id: 'llama3-8b-8192', name: 'Llama 3 8B', provider: 'groq', contextLength: 8192 },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', contextLength: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', provider: 'groq', contextLength: 8192 },
    { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', provider: 'groq', contextLength: 131072 },
    { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 70B', provider: 'groq', contextLength: 131072 }
  ];
}
