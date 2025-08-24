import { memo, useCallback, useMemo, useEffect, useRef } from 'react';
import { X, Copy, ArrowRight, RotateCcw } from 'lucide-react';
import { useTabStore, createTabSelector } from '../../stores/tabStore';

export const TabContextMenu = memo(() => {
  const { contextMenu, setContextMenu, closeTab, createTab, getTabById } = useTabStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Get the tab data for the context menu
  const tab = useMemo(() => {
    return contextMenu ? getTabById(contextMenu.tabId) : null;
  }, [contextMenu, getTabById]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [contextMenu, setContextMenu]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [contextMenu, setContextMenu]);

  // Menu action handlers
  const handleCloseTab = useCallback(() => {
    if (contextMenu) {
      closeTab(contextMenu.tabId);
      setContextMenu(null);
    }
  }, [contextMenu, closeTab, setContextMenu]);

  const handleCloseOthers = useCallback(() => {
    // Implementation would close all tabs except the selected one
    // For now, just close the menu
    setContextMenu(null);
  }, [setContextMenu]);

  const handleDuplicate = useCallback(async () => {
    if (contextMenu && tab) {
      try {
        await createTab({
          file_path: tab.file_path || undefined,
          content: tab.content || undefined,
          title: `${tab.title} (copy)`,
        });
        setContextMenu(null);
      } catch (error) {
        console.error('Failed to duplicate tab:', error);
      }
    }
  }, [contextMenu, tab, createTab, setContextMenu]);

  const handleReloadTab = useCallback(() => {
    // Implementation would reload the tab content from disk
    setContextMenu(null);
  }, [setContextMenu]);

  const handleCopyPath = useCallback(() => {
    if (tab?.file_path) {
      navigator.clipboard.writeText(tab.file_path).catch(error => {
        console.error('Failed to copy path:', error);
      });
    }
    setContextMenu(null);
  }, [tab, setContextMenu]);

  // Don't render if no context menu
  if (!contextMenu || !tab) {
    return null;
  }

  const menuStyles = useMemo(() => ({
    backgroundColor: 'var(--theme-background)',
    borderColor: 'var(--theme-border)',
    color: 'var(--theme-foreground)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  }), []);

  const menuItems = [
    {
      id: 'close',
      label: 'Close Tab',
      icon: X,
      onClick: handleCloseTab,
      disabled: false,
    },
    {
      id: 'close-others',
      label: 'Close Others',
      icon: ArrowRight,
      onClick: handleCloseOthers,
      disabled: false,
    },
    { id: 'separator-1', separator: true },
    {
      id: 'duplicate',
      label: 'Duplicate Tab',
      icon: Copy,
      onClick: handleDuplicate,
      disabled: false,
    },
    {
      id: 'reload',
      label: 'Reload',
      icon: RotateCcw,
      onClick: handleReloadTab,
      disabled: !tab.file_path,
    },
    { id: 'separator-2', separator: true },
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: Copy,
      onClick: handleCopyPath,
      disabled: !tab.file_path,
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 py-2 rounded-lg border shadow-lg"
      style={{
        ...menuStyles,
        left: contextMenu.x,
        top: contextMenu.y,
      }}
    >
      {menuItems.map((item) => {
        if ('separator' in item) {
          return (
            <div
              key={item.id}
              className="my-1 h-px"
              style={{ backgroundColor: 'var(--theme-border)' }}
            />
          );
        }

        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-3 px-4 py-2 text-sm text-left
              hover:bg-opacity-10 hover:bg-current transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
            style={{ color: 'inherit' }}
          >
            <Icon size={16} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
});

TabContextMenu.displayName = 'TabContextMenu';