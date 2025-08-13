import { useState, useCallback, useRef, DragEvent, useMemo } from "react";
import { useFileOperations } from "./useFileOperations";

interface DragData {
  path: string;
  isDirectory: boolean;
  name: string;
}

export function useDragAndDrop(onFileSelect?: (path: string) => void) {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const dragCounterRef = useRef(0);
  const { moveFileOrDirectory, getLastError } = useFileOperations();

  const handleDragStart = useCallback((e: DragEvent, path: string, isDirectory: boolean, name: string) => {
    const dragData: DragData = { path, isDirectory, name };
    setDraggedItem(dragData);
    
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50');
    }
  }, []);

  const handleDragEnd = useCallback((e: DragEvent) => {
    setDraggedItem(null);
    setDragOverTarget(null);
    dragCounterRef.current = 0;
    
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.remove('opacity-50');
    }
  }, []);

  const handleDragEnter = useCallback((e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    
    if (isTargetDirectory && draggedItem) {
      dragCounterRef.current++;
      setDragOverTarget(targetPath);
    }
  }, [draggedItem]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    
    if (dragCounterRef.current <= 0) {
      setDragOverTarget(null);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    
    if (!draggedItem || !isTargetDirectory) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    if (draggedItem.path === targetPath) {
      e.dataTransfer.dropEffect = "none";
      setDragOverTarget(null);
      return;
    }

    if (draggedItem.isDirectory && targetPath.startsWith(draggedItem.path + "/")) {
      e.dataTransfer.dropEffect = "none";
      setDragOverTarget(null);
      return;
    }

    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetPath);
  }, [draggedItem]);

  const handleDrop = useCallback(async (e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    setDragOverTarget(null);
    dragCounterRef.current = 0;

    if (!draggedItem || !isTargetDirectory) {
      return;
    }

    if (draggedItem.path === targetPath) {
      return;
    }

    if (draggedItem.isDirectory && targetPath.startsWith(draggedItem.path + "/")) {
      return;
    }

    try {
      const newPath = await moveFileOrDirectory(draggedItem.path, targetPath);
      if (newPath) {
        if (!draggedItem.isDirectory && onFileSelect) {
          onFileSelect(newPath);
        }
      } else {
        const error = getLastError();
        console.error("Failed to move file:", error);
      }
    } catch (error) {
      console.error("Error during drag and drop:", error);
    }

    setDraggedItem(null);
  }, [draggedItem, moveFileOrDirectory, getLastError, onFileSelect]);

  const isDraggedOver = useCallback((path: string) => {
    return dragOverTarget === path;
  }, [dragOverTarget]);

  const isDragging = useCallback((path: string) => {
    return draggedItem?.path === path;
  }, [draggedItem]);

  return useMemo(() => ({
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDraggedOver,
    isDragging,
  }), [
    draggedItem,
    dragOverTarget,
    handleDragStart,
    handleDragEnd,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    isDraggedOver,
    isDragging,
  ]);
}