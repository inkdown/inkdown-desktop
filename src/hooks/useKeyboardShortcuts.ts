import { useEffect, useRef } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  shortcuts?: { name: string; shortcut: string }[];
}

export function useKeyboardShortcuts({ onToggleSidebar, onSave, onOpenNotePalette }: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onToggleSidebar, onSave, onOpenNotePalette });
  handlersRef.current = { onToggleSidebar, onSave, onOpenNotePalette };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = /Mac/.test(navigator.platform);
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      if (isCtrlOrCmd && event.key === 's' && handlersRef.current.onSave) {
        event.preventDefault();
        handlersRef.current.onSave();
        return;
      }
      
      if (isCtrlOrCmd && event.key === 'b' && handlersRef.current.onToggleSidebar) {
        event.preventDefault();
        handlersRef.current.onToggleSidebar();
        return;
      }
      
      if (isCtrlOrCmd && event.key === 'o' && handlersRef.current.onOpenNotePalette) {
        event.preventDefault();
        handlersRef.current.onOpenNotePalette();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}