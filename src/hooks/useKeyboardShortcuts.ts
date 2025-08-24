import { useEffect, useRef, useMemo } from 'react';
import { usePluginStore } from '../stores/pluginStore';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  onOpenSettings?: () => void;
  onCreateNewNote?: () => void;
  onCreateNewTab?: () => void;
  onCloseActiveTab?: () => void;
}

function buildShortcutString(event: KeyboardEvent, isMac: boolean): string {
  const parts: string[] = [];
  
  if (isMac) {
    if (event.metaKey) parts.push('Cmd');
    if (event.ctrlKey) parts.push('Ctrl');
  } else {
    if (event.ctrlKey) parts.push('Ctrl');
  }
  
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  
  const key = event.key.toLowerCase();
  if (key && key !== 'meta' && key !== 'control' && key !== 'alt' && key !== 'shift') {
    parts.push(key.charAt(0).toUpperCase() + key.slice(1));
  }
  
  return parts.length > 1 ? parts.join('+') : '';
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

  const { executeShortcut } = usePluginStore();
  const executeShortcutRef = useRef(executeShortcut);
  executeShortcutRef.current = executeShortcut;

  useEffect(() => {
    const handleKeyDown = async (event: KeyboardEvent) => {
      // Skip processing only for specific input elements, NOT CodeMirror
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Skip only for elements that are explicitly text inputs (not CodeMirror)
      if (target.contentEditable === 'true' && !target.classList.contains('cm-content')) {
        return;
      }

      // Check plugins first (but without debounce for better performance)
      if (executeShortcutRef.current) {
        const shortcutStr = buildShortcutString(event, isMac);
        
        if (shortcutStr) {
          const handled = await executeShortcutRef.current(shortcutStr, event);
          if (handled) {
            event.preventDefault();
            return;
          }
        }
      }
      
      const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
      
      if (!isCtrlOrCmd) return;

      const key = event.key.toLowerCase();

      // Handle tab shortcuts with highest priority (Ctrl+T, Ctrl+W)
      if (key === 't' && !event.shiftKey) {
        event.preventDefault();
        optionsRef.current.onCreateNewTab?.();
        return;
      }

      if (key === 'w' && !event.shiftKey) {
        event.preventDefault();
        optionsRef.current.onCloseActiveTab?.();
        return;
      }

      // Handle Ctrl+N (new note) - no shift needed
      if (key === 'n' && !event.shiftKey) {
        event.preventDefault();
        optionsRef.current.onCreateNewNote?.();
        return;
      }

      // Handle other shortcuts with Shift  
      if (key === 'b' && event.shiftKey) {
        event.preventDefault();
        optionsRef.current.onToggleSidebar?.();
        return;
      }

      const handlerName = keyMap.get(key);
      if (handlerName) {
        const handler = optionsRef.current[handlerName as keyof typeof optionsRef.current];
        if (handler) {
          event.preventDefault();
          handler();
        }
      }
    };

    // Use capture phase to ensure shortcuts work even when titlebar is focused
    document.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isMac, keyMap]);
}