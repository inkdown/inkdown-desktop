import { useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDirectory } from '../contexts/DirectoryContext';

export function useFileOperations() {
  const { setDirectory, currentDirectory } = useDirectory();
  const errorRef = useRef<string | null>(null);

  const refreshFileTree = useCallback(async () => {
    if (currentDirectory) {
      await setDirectory(currentDirectory).catch(() => {});
    }
  }, [currentDirectory, setDirectory]);

  const createDirectory = useCallback(async (parentPath: string, name?: string): Promise<string | null> => {
    try {
      const newPath = await invoke<string>('create_directory', {
        parentPath,
        name: name || null
      });
      
      await refreshFileTree();
      return newPath;
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : String(err);
      return null;
    }
  }, [refreshFileTree]);

  const createFile = useCallback(async (parentPath: string, name?: string): Promise<string | null> => {
    try {
      const newPath = await invoke<string>('create_file', {
        parentPath,
        name: name || null
      });
      
      await refreshFileTree();
      return newPath;
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : String(err);
      return null;
    }
  }, [refreshFileTree]);

  const deleteFileOrDirectory = useCallback(async (path: string): Promise<boolean> => {
    try {
      await invoke('delete_file_or_directory', { path });
      await refreshFileTree();
      return true;
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : String(err);
      return false;
    }
  }, [refreshFileTree]);

  const renameFileOrDirectory = useCallback(async (oldPath: string, newName: string): Promise<string | null> => {
    try {
      const newPath = await invoke<string>('rename_file_or_directory', {
        oldPath,
        newName
      });
      
      await refreshFileTree();
      return newPath;
    } catch (err) {
      errorRef.current = err instanceof Error ? err.message : String(err);
      return null;
    }
  }, [refreshFileTree]);

  const getLastError = useCallback(() => errorRef.current, []);
  const clearError = useCallback(() => { errorRef.current = null; }, []);

  return {
    createDirectory,
    createFile,
    deleteFileOrDirectory,
    renameFileOrDirectory,
    getLastError,
    clearError
  };
}