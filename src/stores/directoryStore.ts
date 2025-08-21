import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig } from '../types/config';
import { cacheUtils } from '../utils/localStorage';
import { useConfigStore } from './configStore';

export interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
}

export interface DirectoryState {
  currentDirectory: string | null;
  fileTree: FileNode | null;
  isLoading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Cache management
  fileTreeCache: Map<string, FileNode>;
  lastRefreshCache: Map<string, number>;
}

export interface DirectoryActions {
  // Directory operations
  setDirectory: (path: string) => Promise<void>;
  clearDirectory: () => Promise<void>;
  refreshFileTree: (forceRefresh?: boolean, deletedPath?: string) => Promise<void>;
  
  // Initialization
  initializeWorkspace: () => Promise<void>;
  
  // Cache management
  clearCache: () => void;
  
  // State setters
  setCurrentDirectory: (path: string | null) => void;
  setFileTree: (tree: FileNode | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export type DirectoryStore = DirectoryState & DirectoryActions;

export const useDirectoryStore = create<DirectoryStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentDirectory: null,
    fileTree: null,
    isLoading: false,
    error: null,
    initialized: false,
    fileTreeCache: new Map(),
    lastRefreshCache: new Map(),

    // State setters
    setCurrentDirectory: (path) => set({ currentDirectory: path }),
    setFileTree: (tree) => set({ fileTree: tree }),
    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // Initialize workspace
    initializeWorkspace: async () => {
      const { initialized } = get();
      if (initialized) return;

      set({ isLoading: true, error: null, initialized: true });

      try {
        let workspacePath = cacheUtils.getWorkspacePath();

        if (!workspacePath) {
          try {
            const configStore = useConfigStore.getState();
            await configStore.initialize();
            
            const { workspaceConfig } = configStore;
            if (workspaceConfig?.workspace_path) {
              workspacePath = workspaceConfig.workspace_path;
              cacheUtils.setWorkspacePath(workspacePath);
            }
          } catch (error) {
            const savedDirectory = localStorage.getItem("inkdown-directory");
            if (savedDirectory) {
              workspacePath = savedDirectory;
              cacheUtils.setWorkspacePath(workspacePath);
            }
          }
        }

        if (workspacePath) {
          set({ currentDirectory: workspacePath });
          
          try {
            const result = await invoke<FileNode>("scan_directory", {
              path: workspacePath,
            });
            set({ fileTree: result });
          } catch (err) {
            const errorMessage =
              err instanceof Error ? err.message : "Erro ao escanear diretório";
            set({ error: errorMessage });
          }
        }
      } catch (error) {
        set({ error: "Erro ao carregar workspace" });
      } finally {
        set({ isLoading: false });
      }
    },

    // Set directory
    setDirectory: async (path) => {
      set({ isLoading: true, error: null });

      try {
        const result = await invoke<FileNode>("scan_directory", { path });
        set({ 
          currentDirectory: path, 
          fileTree: result 
        });

        // Update cache
        const { fileTreeCache } = get();
        fileTreeCache.set(path, result);

        try {
          await invoke("save_workspace_config", { workspacePath: path });
          cacheUtils.setWorkspacePath(path);
          localStorage.removeItem("inkdown-directory");
        } catch (saveError) {
          localStorage.setItem("inkdown-directory", path);
          cacheUtils.setWorkspacePath(path);
        }
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : "Erro ao escanear diretório",
        });
      } finally {
        set({ isLoading: false });
      }
    },

    // Refresh file tree with intelligent caching
    refreshFileTree: async (forceRefresh = false, deletedPath?: string) => {
      const { currentDirectory, fileTreeCache, lastRefreshCache } = get();
      if (!currentDirectory) return;

      // Handle deleted file cache invalidation
      if (deletedPath) {
        const parentDir = deletedPath.substring(0, deletedPath.lastIndexOf('/'));
        fileTreeCache.delete(parentDir);
        fileTreeCache.delete(currentDirectory);
        lastRefreshCache.delete(parentDir);
        lastRefreshCache.delete(currentDirectory);
      }

      const lastRefresh = lastRefreshCache.get(currentDirectory) || 0;
      const now = Date.now();
      
      if (!forceRefresh && !deletedPath && now - lastRefresh < 2000) {
        const cached = fileTreeCache.get(currentDirectory);
        if (cached) {
          set({ fileTree: cached });
          return;
        }
      }

      try {
        const result = await invoke<FileNode>("scan_directory", {
          path: currentDirectory,
        });
        
        // Manage cache size (keep only 5 most recent)
        if (fileTreeCache.size > 5) {
          const oldestKey = Array.from(fileTreeCache.keys())[0];
          fileTreeCache.delete(oldestKey);
          lastRefreshCache.delete(oldestKey);
        }
        
        fileTreeCache.set(currentDirectory, result);
        lastRefreshCache.set(currentDirectory, now);
        
        set({ fileTree: result });
      } catch (err) {
      }
    },

    // Clear directory
    clearDirectory: async () => {
      const { fileTreeCache, lastRefreshCache } = get();
      
      set({ 
        currentDirectory: null, 
        fileTree: null, 
        error: null,
        initialized: false
      });
      
      // Clear caches
      fileTreeCache.clear();
      lastRefreshCache.clear();

      // Clear persistent caches
      cacheUtils.invalidateWorkspace();
      localStorage.removeItem("inkdown-directory");

      try {
        await invoke("clear_workspace_config");
      } catch (clearError) {
        console.warn("Failed to clear workspace config:", clearError);
      }
    },

    // Clear cache
    clearCache: () => {
      const { fileTreeCache, lastRefreshCache } = get();
      fileTreeCache.clear();
      lastRefreshCache.clear();
    },
  }))
);

// Optimized selectors
export const useCurrentDirectory = () => useDirectoryStore((state) => state.currentDirectory);
export const useFileTree = () => useDirectoryStore((state) => state.fileTree);
export const useDirectoryLoading = () => useDirectoryStore((state) => state.isLoading);
export const useDirectoryError = () => useDirectoryStore((state) => state.error);
export const useDirectoryInitialized = () => useDirectoryStore((state) => state.initialized);