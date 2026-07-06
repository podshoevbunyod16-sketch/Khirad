// ai-chat-hub/frontend/src/components/common/Select.jsx

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils/cn';

export function Select({ value, onValueChange, children, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {typeof children === 'function' ? children({ open, setOpen, value, onValueChange }) : children}
    </div>
  );
}

export function SelectTrigger({ children, className, onClick }) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={onClick}
    >
      {children}
      <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export function SelectValue({ placeholder, children }) {
  return <span>{children || placeholder}</span>;
}

export function SelectContent({ children, open, className }) {
  if (!open) return null;

  return (
    <div className={cn(
      'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md animate-fade-in',
      className
    )}>
      {children}
    </div>
  );
}

export function SelectItem({ value, children, onSelect, isSelected }) {
  return (
    <div
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-2.5 px-3 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
        isSelected && 'bg-accent text-accent-foreground'
      )}
      onClick={() => onSelect?.(value)}
    >
      {children}
    </div>
  );
}
