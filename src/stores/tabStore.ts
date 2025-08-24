import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { TabData, TabSession, CreateTabOptions, CursorPosition, ScrollPosition } from '../types/tabs';

export interface TabState {
  // Session data
  session: TabSession | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // UI state
  contextMenu: { x: number; y: number; tabId: string } | null;
  draggedTab: string | null;
  isInitialized: boolean;
  
  // Cache management
  contentCache: Map<string, string>;
  lastSaveTime: Map<string, number>;
  
}

export interface TabActions {
  // Tab lifecycle
  createTab: (options?: CreateTabOptions) => Promise<string>;
  closeTab: (tabId: string) => Promise<void>;
  setActiveTab: (tabId: string) => Promise<void>;
  
  // Content management
  updateTabContent: (tabId: string, content: string, isDirty?: boolean) => Promise<void>;
  updateTabFile: (tabId: string, filePath: string) => Promise<void>;
  saveTabState: (tabId: string, cursor?: CursorPosition, scroll?: ScrollPosition) => Promise<void>;
  
  // Session management
  loadSession: (workspacePath?: string) => Promise<void>;
  saveSession: () => Promise<void>;
  
  // UI actions
  setContextMenu: (menu: { x: number; y: number; tabId: string } | null) => void;
  setDraggedTab: (tabId: string | null) => void;
  
  // Cache management
  preloadTabContent: (tabId: string) => Promise<void>;
  cleanupCache: () => void;
  
  // Utilities
  getTabById: (tabId: string) => TabData | undefined;
  getTabByFilePath: (filePath: string) => TabData | undefined;
  getActiveTab: () => TabData | undefined;
  getTabsCount: () => number;
  hasUnsavedChanges: () => boolean;
  
  // Internal state management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type TabStore = TabState & TabActions;

// Debounce utility for performance
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const useTabStore = create<TabStore>()(
  subscribeWithSelector((set, get) => {
    // Debounced auto-save function
    const debouncedSave = debounce(async () => {
      const { session } = get();
      if (session) {
        try {
          await invoke('save_tab_session_to_disk', { 
            workspacePath: session.workspace_path 
          });
        } catch (error) {
          console.warn('Failed to auto-save tab session:', error);
        }
      }
    }, 2000);

    return {
      // Initial state
      session: null,
      loading: false,
      error: null,
      contextMenu: null,
      draggedTab: null,
      isInitialized: false,
      contentCache: new Map(),
      lastSaveTime: new Map(),

      // State setters
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setContextMenu: (contextMenu) => set({ contextMenu }),
      setDraggedTab: (draggedTab) => set({ draggedTab }),

      // Tab lifecycle
      createTab: async (options = {}) => {
        const { session } = get();
        if (!session) {
          throw new Error('No active session');
        }

        set({ loading: true, error: null });

        try {
          const newTab = await invoke<TabData>('create_tab', {
            workspacePath: session.workspace_path,
            filePath: options.file_path || null,
          });

          // Update local session
          const updatedTabs = [...session.tabs, newTab];
          const updatedSession = {
            ...session,
            tabs: updatedTabs,
            active_tab_id: newTab.id,
            last_updated: Date.now(),
          };

          set({ 
            session: updatedSession,
            loading: false
          });

          // Auto-save
          debouncedSave();

          return newTab.id;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create tab';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      closeTab: async (tabId) => {
        const { session } = get();
        if (!session) return;

        set({ loading: true, error: null });

        try {
          const newActiveId = await invoke<string | null>('close_tab', {
            workspacePath: session.workspace_path,
            tabId,
          });

          // Update local session
          const updatedTabs = session.tabs.filter(tab => tab.id !== tabId);
          const updatedSession = {
            ...session,
            tabs: updatedTabs,
            active_tab_id: newActiveId,
            last_updated: Date.now(),
          };

          set({ 
            session: updatedSession,
            loading: false
          });

          // Clean up cache for closed tab
          const { contentCache, lastSaveTime } = get();
          contentCache.delete(tabId);
          lastSaveTime.delete(tabId);

          // Auto-save
          debouncedSave();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to close tab';
          set({ error: errorMessage, loading: false });
          throw error;
        }
      },

      setActiveTab: async (tabId) => {
        const { session } = get();
        if (!session || session.active_tab_id === tabId) return;

        // Quick local update for responsiveness
        const updatedSession = {
          ...session,
          active_tab_id: tabId,
          last_updated: Date.now(),
        };
        set({ 
          session: updatedSession
        });

        try {
          await invoke('set_active_tab', {
            workspacePath: session.workspace_path,
            tabId,
          });

          // Auto-save
          debouncedSave();
        } catch (error) {
          console.warn('Failed to sync active tab with backend:', error);
        }
      },

      updateTabContent: async (tabId, content, isDirty = true) => {
        const { session, contentCache } = get();
        if (!session) return;

        // Update cache immediately for responsiveness
        contentCache.set(tabId, content);

        // Update local session
        const updatedTabs = session.tabs.map(tab =>
          tab.id === tabId
            ? { 
                ...tab, 
                content, 
                is_dirty: isDirty,
                last_accessed: Date.now()
              }
            : tab
        );

        const updatedSession = {
          ...session,
          tabs: updatedTabs,
          last_updated: Date.now(),
        };

        set({ 
          session: updatedSession
        });

        try {
          await invoke('update_tab_content', {
            workspacePath: session.workspace_path,
            tabId,
            content,
            isDirty,
          });

          get().lastSaveTime.set(tabId, Date.now());
        } catch (error) {
          console.warn('Failed to sync tab content with backend:', error);
        }
      },

      updateTabFile: async (tabId, filePath) => {
        const { session } = get();
        if (!session) return;

        try {
          // Update Rust backend
          await invoke('update_tab_file', {
            workspacePath: session.workspace_path,
            tabId,
            filePath,
          });

          // Update local state immediately for better performance
          const updatedTabs = session.tabs.map(tab => {
            if (tab.id === tabId) {
              // Extract filename from path (keep extension)
              const fileName = filePath.split(/[/\\]/).pop() || 'Untitled';
              return {
                ...tab,
                file_path: filePath,
                title: fileName,
                is_dirty: false,
                last_accessed: Date.now(),
              };
            }
            return tab;
          });

          const updatedSession = {
            ...session,
            tabs: updatedTabs,
            last_updated: Date.now(),
          };

          set({ session: updatedSession });
        } catch (error) {
          console.warn('Failed to update tab file:', error);
          throw error;
        }
      },

      saveTabState: async (tabId, cursor, scroll) => {
        const { session } = get();
        if (!session) return;

        try {
          await invoke('save_tab_state', {
            workspacePath: session.workspace_path,
            tabId,
            cursorPosition: cursor || null,
            scrollPosition: scroll || null,
          });

          // Update local session
          const updatedTabs = session.tabs.map(tab =>
            tab.id === tabId
              ? { 
                  ...tab, 
                  cursor_position: cursor || tab.cursor_position,
                  scroll_position: scroll || tab.scroll_position,
                  last_accessed: Date.now()
                }
              : tab
          );

          const updatedSession = {
            ...session,
            tabs: updatedTabs,
            last_updated: Date.now(),
          };

          set({ 
            session: updatedSession,
            lastUpdate: Date.now()
          });
        } catch (error) {
          console.warn('Failed to save tab state:', error);
        }
      },

      loadSession: async (workspacePath?: string) => {
        if (!workspacePath) {
          set({ error: 'No workspace path provided' });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Try to load from disk first
          let session = await invoke<TabSession | null>('load_tab_session_from_disk', {
            workspacePath,
          });

          // If no saved session, create a new one
          if (!session) {
            session = await invoke<TabSession>('get_tab_session', {
              workspacePath,
            });
          }

          set({ 
            session, 
            loading: false, 
            isInitialized: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
          set({ error: errorMessage, loading: false, isInitialized: true });
        }
      },

      saveSession: async () => {
        const { session } = get();
        if (!session) return;

        try {
          await invoke('save_tab_session_to_disk', {
            workspacePath: session.workspace_path,
          });
        } catch (error) {
          console.warn('Failed to save session:', error);
        }
      },

      preloadTabContent: async (tabId) => {
        const { session, contentCache } = get();
        if (!session || contentCache.has(tabId)) return;

        try {
          const content = await invoke<string | null>('get_tab_content', {
            workspacePath: session.workspace_path,
            tabId,
          });

          if (content !== null) {
            contentCache.set(tabId, content);
          }
        } catch (error) {
          console.warn('Failed to preload tab content:', error);
        }
      },

      cleanupCache: () => {
        const { contentCache, lastSaveTime, session } = get();
        
        if (!session) {
          contentCache.clear();
          lastSaveTime.clear();
          return;
        }

        const activeTabIds = new Set(session.tabs.map(tab => tab.id));
        
        // Remove cache entries for tabs that no longer exist
        for (const [tabId] of contentCache) {
          if (!activeTabIds.has(tabId)) {
            contentCache.delete(tabId);
            lastSaveTime.delete(tabId);
          }
        }

        // Invoke Rust cleanup
        invoke('cleanup_tab_cache').catch(error => {
          console.warn('Failed to cleanup Rust cache:', error);
        });
      },

      // Utility functions
      getTabById: (tabId) => {
        const { session } = get();
        return session?.tabs.find(tab => tab.id === tabId);
      },

      getTabByFilePath: (filePath) => {
        const { session } = get();
        return session?.tabs.find(tab => tab.file_path === filePath);
      },

      getActiveTab: () => {
        const { session } = get();
        if (!session?.active_tab_id) return undefined;
        return session.tabs.find(tab => tab.id === session.active_tab_id);
      },

      getTabsCount: () => {
        const { session } = get();
        return session?.tabs.length || 0;
      },

      hasUnsavedChanges: () => {
        const { session } = get();
        return session?.tabs.some(tab => tab.is_dirty) || false;
      },
    };
  })
);

// Optimized selectors for performance with shallow equality
export const useTabSession = () => useTabStore((state) => state.session, 
  (a, b) => a?.last_updated === b?.last_updated
);

export const useActiveTab = () => useTabStore((state) => {
  if (!state.session?.active_tab_id) return undefined;
  return state.session.tabs.find(tab => tab.id === state.session!.active_tab_id);
}, (a, b) => a?.id === b?.id && a?.last_accessed === b?.last_accessed);

export const useTabsArray = () => useTabStore((state) => state.session?.tabs || [],
  (a, b) => a.length === b.length && a.every((tab, i) => tab.id === b[i]?.id)
);

export const useTabLoading = () => useTabStore((state) => state.loading);
export const useTabError = () => useTabStore((state) => state.error);
export const useTabsCount = () => useTabStore((state) => state.session?.tabs.length || 0);
export const useHasUnsavedChanges = () => useTabStore((state) => 
  state.session?.tabs.some(tab => tab.is_dirty) || false
);

// Selector factory for individual tabs (prevents unnecessary re-renders)
export const createTabSelector = (tabId: string) => 
  (state: TabStore) => state.session?.tabs.find(tab => tab.id === tabId);