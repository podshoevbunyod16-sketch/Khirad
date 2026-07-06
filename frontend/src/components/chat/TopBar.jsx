// ai-chat-hub/frontend/src/components/chat/TopBar.jsx

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/useStore';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';

export function TopBar() {
  const {
    currentModel, currentProvider, models, setModel,
    toggleSidebar, toggleMcpPanel, toggleSettings,
    sidebarOpen, mcpPanelOpen
  } = useChatStore();

  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setModelSelectorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentModelData = models.find(m => m.id === currentModel && m.provider === currentProvider);
  const displayName = currentModelData?.name || currentModel;

  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  const groqModels = filteredModels.filter(m => m.provider === 'groq');
  const openrouterModels = filteredModels.filter(m => m.provider === 'openrouter');

  return (
    <header className="h-12 border-b border-border bg-card flex items-center px-3 gap-2 flex-shrink-0">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn('md:hidden', sidebarOpen && 'bg-accent')}
        title="Toggle sidebar"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>

      <div ref={ref} className="relative flex-1 max-w-md">
        <button
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-accent transition-colors text-sm w-full"
          onClick={() => setModelSelectorOpen(!modelSelectorOpen)}
        >
          <span className="truncate font-medium">{displayName}</span>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
            {currentProvider}
          </span>
          <svg className="w-4 h-4 ml-auto text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {modelSelectorOpen && (
          <div className="absolute top-full left-0 mt-1 w-80 max-h-96 overflow-auto rounded-lg border bg-popover shadow-lg z-50 animate-fade-in">
            <div className="p-2">
              <input
                className="w-full h-8 px-3 rounded-md bg-background border border-input text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="px-2 pb-2 overflow-y-auto max-h-80">
              {groqModels.length > 0 && (
                <div className="mb-2">
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Groq
                  </div>
                  {groqModels.map((model) => (
                    <ModelItem
                      key={`${model.provider}-${model.id}`}
                      model={model}
                      isSelected={model.id === currentModel && model.provider === currentProvider}
                      onSelect={() => {
                        setModel(model.id, model.provider);
                        setModelSelectorOpen(false);
                        setSearch('');
                      }}
                    />
                  ))}
                </div>
              )}

              {openrouterModels.length > 0 && (
                <div>
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    OpenRouter
                  </div>
                  {openrouterModels.slice(0, 50).map((model) => (
                    <ModelItem
                      key={`${model.provider}-${model.id}`}
                      model={model}
                      isSelected={model.id === currentModel && model.provider === currentProvider}
                      onSelect={() => {
                        setModel(model.id, model.provider);
                        setModelSelectorOpen(false);
                        setSearch('');
                      }}
                    />
                  ))}
                </div>
              )}

              {filteredModels.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">No models found</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSettings}
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMcpPanel}
          className={cn(mcpPanelOpen && 'bg-accent')}
          title="MCP Servers"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
          </svg>
        </Button>
      </div>
    </header>
  );
}

function ModelItem({ model, isSelected, onSelect }) {
  return (
    <button
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-accent transition-colors text-left',
        isSelected && 'bg-accent'
      )}
      onClick={onSelect}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium">{model.name}</div>
        <div className="text-xs text-muted-foreground truncate">{model.id}</div>
      </div>
      {model.contextLength && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {Math.round(model.contextLength / 1000)}k
        </span>
      )}
      {isSelected && (
        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
