import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { WorkspaceConfig } from "../types/config";
import { cacheUtils } from "../utils/localStorage";

export interface FileNode {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileNode[];
}

interface DirectoryContextType {
  currentDirectory: string | null;
  fileTree: FileNode | null;
  isLoading: boolean;
  error: string | null;
  setDirectory: (path: string) => Promise<void>;
  clearDirectory: () => void;
  initializeWorkspace: () => Promise<void>;
  refreshFileTree: () => Promise<void>;
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(
  undefined,
);

interface DirectoryProviderProps {
  children: ReactNode;
}

export function DirectoryProvider({ children }: DirectoryProviderProps) {
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const fileTreeCacheRef = useRef<Map<string, FileNode>>(new Map());
  const lastRefreshRef = useRef<Map<string, number>>(new Map());

  const initializeWorkspace = async () => {
    if (initializedRef.current) return;

    initializedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Try to get workspace path from cache first
      let workspacePath = cacheUtils.getWorkspacePath();

      // If not in cache, load from Rust config
      if (!workspacePath) {
        try {
          const configStr = await invoke<string>("load_workspace_config");
          const config = JSON.parse(configStr) as WorkspaceConfig;
          
          if (config.workspace_path) {
            workspacePath = config.workspace_path;
            cacheUtils.setWorkspacePath(workspacePath);
          }
        } catch (error) {
          // Fallback to old localStorage method
          const savedDirectory = localStorage.getItem("inkdown-directory");
          if (savedDirectory) {
            workspacePath = savedDirectory;
            cacheUtils.setWorkspacePath(workspacePath);
          }
        }
      }

      if (workspacePath) {
        try {
          const result = await invoke<FileNode>("scan_directory", {
            path: workspacePath,
          });
          setCurrentDirectory(workspacePath);
          setFileTree(result);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : "Erro ao escanear diretório";
          setError(errorMessage);
        }
      }
    } catch (error) {
      setError("Erro ao carregar workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const setDirectory = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await invoke<FileNode>("scan_directory", { path });
      setCurrentDirectory(path);
      setFileTree(result);

      // Save to Tauri config
      try {
        await invoke("save_workspace_config", { workspacePath: path });
        // Remove localStorage fallback if Tauri save was successful
        localStorage.removeItem("inkdown-directory");
      } catch (saveError) {
        console.warn("Failed to save workspace config to Tauri, using localStorage fallback:", saveError);
        localStorage.setItem("inkdown-directory", path);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao escanear diretório",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFileTree = useCallback(async (forceRefresh = false) => {
    if (!currentDirectory) return;

    // Cache with 1 second debounce to avoid excessive refreshes
    const lastRefresh = lastRefreshRef.current.get(currentDirectory) || 0;
    const now = Date.now();
    
    if (!forceRefresh && now - lastRefresh < 1000) {
      const cached = fileTreeCacheRef.current.get(currentDirectory);
      if (cached) {
        setFileTree(cached);
        return;
      }
    }

    try {
      const result = await invoke<FileNode>("scan_directory", {
        path: currentDirectory,
      });
      
      // Update cache
      fileTreeCacheRef.current.set(currentDirectory, result);
      lastRefreshRef.current.set(currentDirectory, now);
      
      setFileTree(result);
    } catch (err) {
      console.error("Error refreshing file tree:", err);
    }
  }, [currentDirectory]);

  const clearDirectory = useCallback(async () => {
    setCurrentDirectory(null);
    setFileTree(null);
    setError(null);
    
    // Clear memory caches
    fileTreeCacheRef.current.clear();
    lastRefreshRef.current.clear();
    initializedRef.current = false;

    // Clear persistent caches
    cacheUtils.invalidateWorkspace();
    localStorage.removeItem("inkdown-directory");

    try {
      await invoke("clear_workspace_config");
    } catch (clearError) {
      console.warn("Failed to clear workspace config:", clearError);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      currentDirectory,
      fileTree,
      isLoading,
      error,
      setDirectory,
      clearDirectory,
      initializeWorkspace,
      refreshFileTree,
    }),
    [
      currentDirectory,
      fileTree,
      isLoading,
      error,
      setDirectory,
      clearDirectory,
      refreshFileTree,
    ],
  );

  return (
    <DirectoryContext.Provider value={contextValue}>
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectory() {
  const context = useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error(
      "useDirectory deve ser usado dentro de um DirectoryProvider",
    );
  }
  return context;
}
