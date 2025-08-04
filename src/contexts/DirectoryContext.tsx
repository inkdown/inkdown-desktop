import { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig } from '../types/config';

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
}

const DirectoryContext = createContext<DirectoryContextType | undefined>(undefined);

interface DirectoryProviderProps {
  children: ReactNode;
}

export function DirectoryProvider({ children }: DirectoryProviderProps) {
  const [currentDirectory, setCurrentDirectory] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  const initializeWorkspace = async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    try {
      const configStr = await invoke<string>('load_workspace_config');
      const config = JSON.parse(configStr) as WorkspaceConfig;
      
      if (config.workspace_path) {
        setIsLoading(true);
        setError(null);
        
        try {
          const result = await invoke<FileNode>('scan_directory', { path: config.workspace_path });
          setCurrentDirectory(config.workspace_path);
          setFileTree(result);
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Erro ao escanear diretório';
          setError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      const savedDirectory = localStorage.getItem('inkdown-directory');
      if (savedDirectory) {
        try {
          setIsLoading(true);
          const result = await invoke<FileNode>('scan_directory', { path: savedDirectory });
          setCurrentDirectory(savedDirectory);
          setFileTree(result);
        } catch (e) {
          setError('Erro ao carregar diretório');
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  const setDirectory = async (path: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await invoke<FileNode>('scan_directory', { path });
      setCurrentDirectory(path);
      setFileTree(result);
      
      invoke('save_workspace_config', { workspacePath: path }).catch(() => {
        localStorage.setItem('inkdown-directory', path);
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao escanear diretório');
    } finally {
      setIsLoading(false);
    }
  };

  const clearDirectory = async () => {
    setCurrentDirectory(null);
    setFileTree(null);
    setError(null);
    
    invoke('clear_workspace_config').catch(() => {});
    localStorage.removeItem('inkdown-directory');
    localStorage.removeItem('inkdown-file-tree');
  };

  return (
    <DirectoryContext.Provider value={{
      currentDirectory,
      fileTree,
      isLoading,
      error,
      setDirectory,
      clearDirectory,
      initializeWorkspace
    }}>
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectory() {
  const context = useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error('useDirectory deve ser usado dentro de um DirectoryProvider');
  }
  return context;
}