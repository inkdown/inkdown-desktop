import { useEffect, useRef, useMemo } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  onOpenSettings?: () => void;
}

export function useKeyboardShortcuts({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview, onOpenSettings }: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview, onOpenSettings });
  handlersRef.current = { onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview, onOpenSettings };

  // Memoize platform check
  const isMac = useMemo(() => /Mac/.test(navigator.platform), []);

  // Memoize key mapping for better performance (excluding toggleSidebar which has special handling)
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

      // Special case for toggleSidebar which now requires Shift
      if (key === 'b' && event.shiftKey) {
        handlersRef.current.onToggleSidebar?.();
        event.preventDefault();
        return;
      }

      // Regular shortcuts (without shift)
      if (event.shiftKey) return;

      const handlerName = keyMap.get(key);
      if (handlerName) {
        const handler = handlersRef.current[handlerName as keyof typeof handlersRef.current];
        if (handler) {
          handler();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => document.removeEventListener('keydown', handleKeyDown, { passive: false } as any);
  }, [isMac, keyMap]);
}