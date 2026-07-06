// ai-chat-hub/frontend/src/store/useStore.js

import { create } from 'zustand';
import { api, streamChat } from '../utils/api';

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/register', { email, password, name });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, token: data.token, isLoading: false });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  }
}));

export const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isStreaming: false,
  currentModel: 'llama-3.3-70b-versatile',
  currentProvider: 'groq',
  temperature: 0.7,
  maxTokens: 4096,
  chainOfThought: false,
  models: [],
  modelsLoaded: false,
  sidebarOpen: true,
  mcpPanelOpen: false,
  settingsOpen: false,
  toolCalls: [],

  setModel: (model, provider) => set({ currentModel: model, currentProvider: provider }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setChainOfThought: (chainOfThought) => set({ chainOfThought }),
  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleMcpPanel: () => set(state => ({ mcpPanelOpen: !state.mcpPanelOpen })),
  toggleSettings: () => set(state => ({ settingsOpen: !state.settingsOpen })),

  fetchModels: async () => {
    try {
      const data = await api.get('/models');
      set({ models: data.models, modelsLoaded: true });
    } catch (error) {
      console.error('Failed to fetch models:', error);
      set({
        models: [
          { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq' },
          { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq' },
          { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq' }
        ],
        modelsLoaded: true
      });
    }
  },

  fetchConversations: async () => {
    try {
      const data = await api.get('/conversations');
      set({ conversations: data.conversations });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  },

  selectConversation: async (id) => {
    try {
      const data = await api.get(`/conversations/${id}`);
      const conv = data.conversation;
      set({
        currentConversation: conv,
        messages: conv.messages,
        currentModel: conv.model,
        currentProvider: conv.provider,
        toolCalls: []
      });
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  },

  newConversation: () => {
    set({
      currentConversation: null,
      messages: [],
      toolCalls: []
    });
  },

  deleteConversation: async (id) => {
    try {
      await api.delete(`/conversations/${id}`);
      const state = get();
      const filtered = state.conversations.filter(c => c.id !== id);
      set({ conversations: filtered });
      if (state.currentConversation?.id === id) {
        set({ currentConversation: null, messages: [], toolCalls: [] });
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  },

  renameConversation: async (id, title) => {
    try {
      await api.patch(`/conversations/${id}`, { title });
      const state = get();
      set({
        conversations: state.conversations.map(c =>
          c.id === id ? { ...c, title } : c
        )
      });
    } catch (error) {
      console.error('Failed to rename conversation:', error);
    }
  },

  sendMessage: (content) => {
    const state = get();
    if (state.isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };

    set(state => ({
      messages: [...state.messages, userMessage],
      isStreaming: true,
      toolCalls: []
    }));

    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString()
    };

    set(state => ({
      messages: [...state.messages, assistantMessage]
    }));

    streamChat(
      {
        conversationId: state.currentConversation?.id,
        message: content,
        model: state.currentModel,
        provider: state.currentProvider,
        temperature: state.temperature,
        maxTokens: state.maxTokens,
        chainOfThought: state.chainOfThought
      },
      // onToken
      (token) => {
        set(state => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (last && last.role === 'assistant') {
            messages[messages.length - 1] = { ...last, content: last.content + token };
          }
          return { messages };
        });
      },
      // onDone
      (data) => {
        set(state => {
          const convId = data.conversationId;
          const conversations = state.conversations;
          const existing = conversations.find(c => c.id === convId);

          let updated;
          if (existing) {
            updated = conversations.map(c =>
              c.id === convId ? { ...c, updatedAt: new Date().toISOString() } : c
            );
          } else {
            const newConv = {
              id: convId,
              title: content.substring(0, 100),
              model: state.currentModel,
              provider: state.currentProvider,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              _count: { messages: state.messages.length + 1 }
            };
            updated = [newConv, ...conversations];
          }

          return {
            isStreaming: false,
            currentConversation: { id: convId },
            conversations: updated
          };
        });
      },
      // onError
      (error) => {
        set(state => {
          const messages = [...state.messages];
          const last = messages[messages.length - 1];
          if (last && last.role === 'assistant' && !last.content) {
            messages[messages.length - 1] = {
              ...last,
              content: `Error: ${error.message}`,
              isError: true
            };
          }
          return { messages, isStreaming: false };
        });
      },
      // onToolCall
      (data) => {
        set(state => ({
          toolCalls: [...state.toolCalls, { ...data, status: 'calling' }]
        }));
      },
      // onToolResult
      (data) => {
        set(state => ({
          toolCalls: state.toolCalls.map(tc =>
            tc.name === data.name ? { ...tc, status: 'done', result: data.result } : tc
          )
        }));
      },
      // onConversationCreated
      (data) => {
        set({ currentConversation: { id: data.id } });
      }
    );
  }
}));
