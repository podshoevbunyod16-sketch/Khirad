// ai-chat-hub/frontend/src/components/settings/SettingsDialog.jsx

import { useState, useEffect } from 'react';
import { useChatStore } from '../../store/useStore';
import { api } from '../../utils/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Switch } from '../common/Switch';

export function SettingsDialog() {
  const { toggleSettings, temperature, setTemperature, maxTokens, setMaxTokens, chainOfThought, setChainOfThought } = useChatStore();
  const [activeTab, setActiveTab] = useState('general');
  const [apiKeys, setApiKeys] = useState({ groq: '', openrouter: '', serper: '' });
  const [memories, setMemories] = useState([]);
  const [newMemory, setNewMemory] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    try {
      const data = await api.get('/memory');
      setMemories(data.memories);
    } catch {
      // Ignore
    }
  };

  const handleSaveApiKey = async (provider) => {
    const key = apiKeys[provider];
    if (!key) return;

    setSaving(true);
    try {
      await api.put('/settings/api-keys', { provider, key });
      setMessage(`${provider} API key saved`);
      setApiKeys(prev => ({ ...prev, [provider]: '' }));
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    try {
      await api.post('/memory', { content: newMemory.trim() });
      setNewMemory('');
      await loadMemories();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await api.delete(`/memory/${id}`);
      await loadMemories();
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'api-keys', label: 'API Keys' },
    { id: 'memory', label: 'Memory' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={toggleSettings}>
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button className="p-1 hover:bg-accent rounded-lg" onClick={toggleSettings}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {message && (
            <div className={`mb-4 p-3 rounded-lg text-sm ${
              message.startsWith('Error') ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-600'
            }`}>
              {message}
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Temperature: {temperature.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Max Tokens: {maxTokens}
                </label>
                <input
                  type="range"
                  min="256"
                  max="16384"
                  step="256"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>256</span>
                  <span>16384</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Chain of Thought</p>
                  <p className="text-xs text-muted-foreground">Show AI reasoning in collapsible blocks</p>
                </div>
                <Switch checked={chainOfThought} onCheckedChange={setChainOfThought} />
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                API keys are encrypted and stored securely. User-level keys override .env defaults.
              </p>

              {[
                { provider: 'groq', label: 'Groq API Key', placeholder: 'gsk_...', url: 'https://console.groq.com/keys' },
                { provider: 'openrouter', label: 'OpenRouter API Key', placeholder: 'sk-or-...', url: 'https://openrouter.ai/keys' },
                { provider: 'serper', label: 'Serper API Key', placeholder: 'Your key...', url: 'https://serper.dev/api-key' }
              ].map(({ provider, label, placeholder, url }) => (
                <div key={provider} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{label}</label>
                    <a href={url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                      Get key →
                    </a>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder={placeholder}
                      value={apiKeys[provider]}
                      onChange={(e) => setApiKeys(prev => ({ ...prev, [provider]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSaveApiKey(provider)}
                      disabled={!apiKeys[provider] || saving}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'memory' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Memories are included in the AI's context for all conversations.
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="Add a memory..."
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                />
                <Button size="sm" onClick={handleAddMemory} disabled={!newMemory.trim()}>
                  Add
                </Button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {memories.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">No memories saved</p>
                ) : (
                  memories.map((memory) => (
                    <div key={memory.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{memory.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {memory.category} • {new Date(memory.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded flex-shrink-0"
                        onClick={() => handleDeleteMemory(memory.id)}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
