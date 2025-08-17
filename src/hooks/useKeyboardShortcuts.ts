import { useEffect, useRef, useMemo } from 'react';
import { pluginManager } from '../services/pluginManager';

interface UseKeyboardShortcutsOptions {
  onToggleSidebar?: () => void;
  onSave?: () => void;
  onOpenNotePalette?: () => void;
  onTogglePreview?: () => void;
  onOpenSettings?: () => void;
}

// Helper function to normalize keyboard shortcuts
function normalizeShortcut(shortcut: string, isMac: boolean): string {
  return shortcut
    .toLowerCase()
    .replace(/cmd|command/g, isMac ? 'meta' : 'ctrl')
    .replace(/\+/g, '+')
    .trim();
}

// Helper function to check if event matches shortcut
function matchesShortcut(event: KeyboardEvent, shortcut: string, isMac: boolean): boolean {
  const normalized = normalizeShortcut(shortcut, isMac);
  const parts = normalized.split('+').map(p => p.trim());
  
  const hasCtrl = parts.includes('ctrl');
  const hasMeta = parts.includes('meta') || parts.includes('cmd');
  const hasShift = parts.includes('shift');
  const hasAlt = parts.includes('alt');
  
  const key = parts.find(p => !['ctrl', 'meta', 'cmd', 'shift', 'alt'].includes(p)) || '';
  
  const eventKey = event.key.toLowerCase();
  const actualCtrl = isMac ? false : event.ctrlKey;
  const actualMeta = isMac ? event.metaKey : false;
  const actualCmd = isMac ? event.metaKey : event.ctrlKey;
  
  return (
    eventKey === key &&
    ((hasCtrl && actualCtrl) || (!hasCtrl && !actualCtrl)) &&
    ((hasMeta && actualMeta) || (!hasMeta && !actualMeta)) &&
    ((hasCtrl || hasMeta) ? actualCmd : true) &&
    event.shiftKey === hasShift &&
    event.altKey === hasAlt
  );
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
    const handleKeyDown = async (event: KeyboardEvent) => {
      // First try plugin shortcuts (they have priority)
      const pluginShortcuts = pluginManager.getAllPluginShortcuts();
      for (const shortcut of pluginShortcuts) {
        if (matchesShortcut(event, shortcut.shortcut, isMac)) {
          try {
            if (!shortcut.condition || shortcut.condition()) {
              await shortcut.execute();
              event.preventDefault();
              return;
            }
          } catch (error) {
            console.error(`Plugin shortcut error:`, error);
          }
        }
      }
      
      // Then handle built-in shortcuts
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