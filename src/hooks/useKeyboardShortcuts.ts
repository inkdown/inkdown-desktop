import { useEffect, useRef, useMemo } from 'react';
import { usePluginStore } from '../stores/pluginStore';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  onOpenSettings?: () => void;
  onCreateNewNote?: () => void;
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
    let debounceTimer: number | undefined;
    
    const handleKeyDown = async (event: KeyboardEvent) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      debounceTimer = window.setTimeout(async () => {
        if (executeShortcutRef.current) {
          const shortcutStr = buildShortcutString(event, isMac);
          
          if (shortcutStr) {
            const handled = await executeShortcutRef.current(shortcutStr, event);
            if (handled) {
              return;
            }
          }
        }
        
        const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
        
        if (!isCtrlOrCmd) return;

        const key = event.key.toLowerCase();

        if (key === 'b' && event.shiftKey) {
          optionsRef.current.onToggleSidebar?.();
          event.preventDefault();
          return;
        }

        if (key === 'n' && event.shiftKey) {
          optionsRef.current.onCreateNewNote?.();
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
      }, 10);
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [isMac, keyMap]);
}