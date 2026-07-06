// ai-chat-hub/frontend/src/components/mcp/McpPanel.jsx

import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Switch } from '../common/Switch';
import { cn } from '../../utils/cn';

export function McpPanel() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchServers = async () => {
    try {
      const data = await api.get('/mcp/servers');
      setServers(data.servers);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const handleToggle = async (id, enabled) => {
    try {
      await api.post(`/mcp/servers/${id}/toggle`, { enabled });
      await fetchServers();
    } catch (error) {
      console.error('Failed to toggle server:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/mcp/servers/${id}`);
      await fetchServers();
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const handleReconnect = async (id) => {
    try {
      await api.post(`/mcp/servers/${id}/reconnect`);
      await fetchServers();
    } catch (error) {
      console.error('Failed to reconnect server:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">MCP Servers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Model Context Protocol</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ Add'}
        </Button>
      </div>

      {showAdd && (
        <AddServerForm
          onAdded={() => {
            setShowAdd(false);
            fetchServers();
          }}
        />
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-8">Loading...</p>
        ) : servers.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <p className="text-sm text-muted-foreground">No MCP servers configured</p>
            <p className="text-xs text-muted-foreground mt-1">Click "+ Add" to connect a server</p>
          </div>
        ) : (
          servers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              expanded={expandedId === server.id}
              onToggle={() => setExpandedId(expandedId === server.id ? null : server.id)}
              onEnableToggle={(enabled) => handleToggle(server.id, enabled)}
              onDelete={() => handleDelete(server.id)}
              onReconnect={() => handleReconnect(server.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ServerCard({ server, expanded, onToggle, onEnableToggle, onDelete, onReconnect }) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={onToggle}>
        <div className={cn(
          'w-2 h-2 rounded-full flex-shrink-0',
          server.connected ? 'bg-green-500' : 'bg-muted-foreground/30'
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{server.name}</p>
          <p className="text-xs text-muted-foreground truncate">{server.command}</p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {server.toolCount} tools
        </span>
        <Switch
          checked={server.enabled}
          onCheckedChange={(e) => {
            e.stopPropagation?.();
            onEnableToggle(!server.enabled);
          }}
        />
      </div>

      {expanded && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onReconnect} className="flex-1">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reconnect
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>

          {server.tools && server.tools.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Available Tools:</p>
              <div className="space-y-1.5">
                {server.tools.map((tool, i) => (
                  <div key={i} className="p-2 rounded bg-muted/50 text-xs">
                    <p className="font-mono font-medium">{tool.name}</p>
                    {tool.description && (
                      <p className="text-muted-foreground mt-0.5">{tool.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddServerForm({ onAdded }) {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [
    {
      name: 'Filesystem',
      command: 'npx',
      args: '-y @modelcontextprotocol/server-filesystem /tmp/mcp-files'
    },
    {
      name: 'Fetch',
      command: 'npx',
      args: '-y @modelcontextprotocol/server-fetch'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const argsArray = args.trim() ? args.split(' ').map(a => a.trim()).filter(Boolean) : [];
      await api.post('/mcp/servers', {
        name,
        command,
        args: argsArray,
        env: {}
      });
      onAdded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-border p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className="px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-accent transition-colors"
              onClick={() => {
                setName(preset.name);
                setCommand(preset.command);
                setArgs(preset.args);
              }}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <Input
          placeholder="Server name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          placeholder="Command (e.g., npx, node, python)"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          required
        />
        <Input
          placeholder="Arguments (space-separated)"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
        />

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" size="sm" className="w-full" disabled={loading}>
          {loading ? 'Connecting...' : 'Add Server'}
        </Button>
      </form>
    </div>
  );
}
