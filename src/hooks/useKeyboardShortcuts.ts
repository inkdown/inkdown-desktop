import { useEffect, useRef, useMemo } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  onOpenSettings?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const isMac = useMemo(() => /Mac/.test(navigator.platform), []);

  const keyMap = useMemo(() => new Map([
    ['s', 'onSave'],
    ['o', 'onOpenNotePalette'],
    ['e', 'onTogglePreview'],
    ['p', 'onOpenSettings']
  ]), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      if (!isCtrlOrCmd) return;

      const key = event.key.toLowerCase();

      if (key === 'b' && event.shiftKey) {
        optionsRef.current.onToggleSidebar?.();
        event.preventDefault();
        return;
      }

      if (event.shiftKey) return;

      const handlerName = keyMap.get(key);
      if (handlerName) {
        const handler = optionsRef.current[handlerName as keyof typeof optionsRef.current];
        if (handler) {
          handler();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMac, keyMap]);
}