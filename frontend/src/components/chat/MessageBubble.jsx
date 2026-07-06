// ai-chat-hub/frontend/src/components/chat/MessageBubble.jsx

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from '../../utils/cn';

export function MessageBubble({ message }) {
  const { role, content, isError, toolName, toolCallId } = message;

  if (role === 'tool') {
    return <ToolResultMessage message={message} />;
  }

  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  const processedContent = processThinkingBlocks(content || '');

  return (
    <div className={cn('flex gap-3 animate-fade-in', isUser && 'flex-row-reverse')}>
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground'
      )}>
        {isUser ? 'U' : 'AI'}
      </div>

      <div className={cn(
        'flex-1 min-w-0',
        isUser && 'flex flex-col items-end'
      )}>
        <div className={cn(
          'rounded-2xl px-4 py-3 max-w-full',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md max-w-[85%]'
            : 'bg-card border border-border rounded-tl-md w-full',
          isError && 'border-destructive/50 bg-destructive/5'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm">{content}</p>
          ) : (
            <div className="markdown-body text-sm">
              {processedContent.map((block, i) => {
                if (block.type === 'thinking') {
                  return <ThinkingBlock key={i} content={block.content} />;
                }
                return (
                  <ReactMarkdown
                    key={i}
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';

                        if (!inline && language) {
                          return (
                            <CodeBlock language={language} code={String(children).replace(/\n$/, '')} />
                          );
                        }

                        return (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {block.content}
                  </ReactMarkdown>
                );
              })}
            </div>
          )}
        </div>

        {isAssistant && message.model && (
          <div className="flex items-center gap-2 mt-1 px-2">
            <span className="text-xs text-muted-foreground">
              {message.model}
            </span>
            {message.tokensUsed && (
              <span className="text-xs text-muted-foreground">
                • {message.tokensUsed} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function processThinkingBlocks(content) {
  if (!content) return [{ type: 'text', content: '' }];

  const blocks = [];
  const regex = /<thinking>([\s\S]*?)<\/thinking>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    blocks.push({ type: 'thinking', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    blocks.push({ type: 'text', content: content.slice(lastIndex) });
  }

  if (blocks.length === 0) {
    blocks.push({ type: 'text', content });
  }

  return blocks;
}

function ThinkingBlock({ content }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-3 border-l-2 border-muted-foreground/30 pl-3">
      <button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <svg
          className={cn('w-4 h-4 transition-transform', expanded && 'rotate-90')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="italic">Thinking...</span>
      </button>
      {expanded && (
        <div className="mt-2 text-sm text-muted-foreground italic whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: 'transparent',
          fontSize: '0.875rem'
        }}
        showLineNumbers={code.split('\n').length > 5}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function ToolResultMessage({ message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex gap-3 pl-11 animate-fade-in">
      <div className="flex-1 min-w-0">
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="font-mono text-xs">{message.toolName}</span>
          <svg
            className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {expanded && (
          <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-x-auto max-h-48 overflow-y-auto">
            {message.content}
          </pre>
        )}
      </div>
    </div>
  );
}
