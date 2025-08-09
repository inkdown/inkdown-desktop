import { useEffect, useRef, useMemo } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
}

export function useKeyboardShortcuts({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview }: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview });
  handlersRef.current = { onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview };

  // Memoize platform check
  const isMac = useMemo(() => /Mac/.test(navigator.platform), []);

  // Memoize key mapping for better performance
  const keyMap = useMemo(() => new Map([
    ['s', 'onSave'],
    ['b', 'onToggleSidebar'], 
    ['o', 'onOpenNotePalette'],
    ['e', 'onTogglePreview']
  ]), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      if (!isCtrlOrCmd) return;

      const handlerName = keyMap.get(event.key);
      if (handlerName) {
        const handler = handlersRef.current[handlerName as keyof typeof handlersRef.current];
        if (handler) {
          event.preventDefault();
          handler();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isMac, keyMap]);
}