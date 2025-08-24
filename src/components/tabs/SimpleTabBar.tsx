import { memo, useCallback, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { useTabStore } from '../../stores/tabStore';

interface SimpleTabBarProps {
  onNewTab?: () => void;
}

const TabItem = memo<{
  id: string;
  title: string;
  isActive: boolean;
  isDirty: boolean;
  onActivate: () => void;
  onClose: () => void;
}>(({ title, isActive, isDirty, onActivate, onClose }) => {
  const handleClose = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  }, [onClose]);

  const displayName = title.length > 20 ? `${title.substring(0, 17)}...` : title;

  return (
    <div
      className={`
        group flex items-center gap-2 px-3 min-w-0 max-w-48 cursor-pointer 
        border-r transition-colors duration-150 h-full
        ${isActive 
          ? 'bg-[var(--theme-background)] text-[var(--theme-foreground)]' 
          : 'bg-[var(--theme-editor-background)] text-[var(--theme-muted-foreground)] hover:bg-opacity-80'
        }
      `}
      style={{ borderColor: 'var(--theme-border)' }}
      onClick={onActivate}
      title={title}
    >
      {isDirty && (
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        />
      )}
      
      <span className="text-xs font-medium truncate flex-1 min-w-0">
        {displayName}
      </span>
      
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-opacity-20 hover:bg-current transition-opacity duration-150"
        title="Close tab"
      >
        <X size={12} />
      </button>
    </div>
  );
});

TabItem.displayName = 'TabItem';

export const SimpleTabBar = memo<SimpleTabBarProps>(({ onNewTab }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const setActiveTab = useTabStore(state => state.setActiveTab);
  const closeTab = useTabStore(state => state.closeTab);
  const createTab = useTabStore(state => state.createTab);
  
  const session = useTabStore(state => state.session);
  const tabs = session?.tabs || [];
  const activeTabId = session?.active_tab_id;

  const handleNewTab = useCallback(() => {
    if (onNewTab) {
      onNewTab();
    } else {
      createTab().catch(console.error);
    }
  }, [onNewTab, createTab]);

  const handleActivateTab = useCallback((tabId: string) => {
    if (activeTabId !== tabId) {
      setActiveTab(tabId).catch(console.error);
    }
  }, [activeTabId, setActiveTab]);

  const handleCloseTab = useCallback((tabId: string) => {
    closeTab(tabId).catch(console.error);
  }, [closeTab]);

  return (
    <div 
      className="flex items-stretch w-full h-8"
      style={{ 
        backgroundColor: 'var(--theme-editor-background)',
        borderColor: 'var(--theme-border)' 
      }}
    >
      <div 
        ref={containerRef}
        className="flex-1 flex items-stretch overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            id={tab.id}
            title={tab.title}
            isActive={activeTabId === tab.id}
            isDirty={tab.is_dirty}
            onActivate={() => handleActivateTab(tab.id)}
            onClose={() => handleCloseTab(tab.id)}
          />
        ))}
      </div>
      
      <div className="flex-shrink-0 border-l" style={{ borderColor: 'var(--theme-border)' }}>
        <button
          onClick={handleNewTab}
          className="flex items-center justify-center w-8 h-full hover:bg-opacity-10 hover:bg-current transition-colors duration-150"
          style={{ color: 'var(--theme-muted-foreground)' }}
          title="New tab (Ctrl+T)"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
});

SimpleTabBar.displayName = 'SimpleTabBar';