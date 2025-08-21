import { useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useDirectoryStore } from "../stores/directoryStore";

export function useFileOperations() {
  const errorRef = useRef<string | null>(null);

  const { refreshFileTree: refreshTree } = useDirectoryStore();

  const createDirectory = useCallback(
    async (parentPath: string, name?: string): Promise<string | null> => {
      try {
        const newPath = await invoke<string>("create_directory", {
          parentPath,
          name: name || null,
        });

        refreshTree(true);
        return newPath;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return null;
      }
    },
    [refreshTree],
  );

  const createFile = useCallback(
    async (parentPath: string, name?: string): Promise<string | null> => {
      try {
        const newPath = await invoke<string>("create_file", {
          parentPath,
          name: name || null,
        });

        refreshTree(true);
        return newPath;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return null;
      }
    },
    [refreshTree],
  );

  const deleteFileOrDirectory = useCallback(
    async (path: string): Promise<boolean> => {
      try {
        await invoke("delete_file_or_directory", { path });
        refreshTree(true, path);
        return true;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return false;
      }
    },
    [refreshTree],
  );

  const renameFileOrDirectory = useCallback(
    async (oldPath: string, newName: string): Promise<string | null> => {
      try {
        const newPath = await invoke<string>("rename_file_or_directory", {
          oldPath,
          newName,
        });

        refreshTree(true);
        return newPath;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return null;
      }
    },
    [refreshTree],
  );

  const createNestedPath = useCallback(
    async (workspacePath: string, pathInput: string): Promise<string | null> => {
      try {
        const newPath = await invoke<string>("create_nested_path", {
          workspacePath,
          pathInput,
        });

        refreshTree(true);
        return newPath;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return null;
      }
    },
    [refreshTree],
  );

  const moveFileOrDirectory = useCallback(
    async (sourcePath: string, targetParentPath: string): Promise<string | null> => {
      try {
        const newPath = await invoke<string>("move_file_or_directory", {
          sourcePath,
          targetParentPath,
        });

        refreshTree(true);
        return newPath;
      } catch (err) {
        errorRef.current = err instanceof Error ? err.message : String(err);
        return null;
      }
    },
    [refreshTree],
  );

  const getLastError = useCallback(() => errorRef.current, []);
  const clearError = useCallback(() => {
    errorRef.current = null;
  }, []);

  return {
    createDirectory,
    createFile,
    createNestedPath,
    deleteFileOrDirectory,
    renameFileOrDirectory,
    moveFileOrDirectory,
    getLastError,
    clearError,
  };
}
