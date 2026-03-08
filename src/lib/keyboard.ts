import { useEffect } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

export function useKeyboard(handlers: Record<string, KeyHandler>, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handle = (e: KeyboardEvent) => {
      const key = e.key;
      if (handlers[key]) {
        handlers[key](e);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers, enabled]);
}
