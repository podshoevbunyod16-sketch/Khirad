// ai-chat-hub/frontend/src/components/chat/ToolCallsBar.jsx

import { useChatStore } from '../../store/useStore';
import { cn } from '../../utils/cn';

export function ToolCallsBar() {
  const { toolCalls } = useChatStore();

  if (toolCalls.length === 0) return null;

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-2">
      <div className="max-w-3xl mx-auto flex flex-wrap gap-2">
        {toolCalls.map((tc, i) => (
          <div
            key={i}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors',
              tc.status === 'calling'
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-green-500/30 bg-green-500/5 text-green-600'
            )}
          >
            {tc.status === 'calling' ? (
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="font-mono">{tc.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
