import { useEffect, useRef } from 'react';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  shortcuts?: { name: string; shortcut: string }[];
}

export function useKeyboardShortcuts({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview }: UseKeyboardShortcutsOptions) {
  const handlersRef = useRef({ onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview });
  handlersRef.current = { onToggleSidebar, onSave, onOpenNotePalette, onTogglePreview };

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
      
      if (isCtrlOrCmd && event.key === 'e' && handlersRef.current.onTogglePreview) {
        event.preventDefault();
        handlersRef.current.onTogglePreview();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}