import { useState, useCallback, useRef, DragEvent, useMemo } from "react";
import { useFileOperations } from "./useFileOperations";
import { platform } from "@tauri-apps/plugin-os";

interface DragData {
  path: string;
  isDirectory: boolean;
  name: string;
}

export function useDragAndDrop(onFileSelect?: (path: string) => void) {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [isWindows, setIsWindows] = useState<boolean>(false);
  const dragCounterRef = useRef(0);
  const { moveFileOrDirectory, getLastError } = useFileOperations();

  // Detect Windows platform
  useMemo(async () => {
    try {
      const currentPlatform = await platform();
      setIsWindows(currentPlatform === 'windows');
    } catch (error) {
      console.warn('Could not detect platform:', error);
    }
  }, []);

  const handleDragStart = useCallback((e: DragEvent, path: string, isDirectory: boolean, name: string) => {
    const dragData: DragData = { path, isDirectory, name };
    setDraggedItem(dragData);
    
    // Windows-specific drag settings
    if (isWindows) {
      e.dataTransfer.effectAllowed = "all";
      e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
      e.dataTransfer.setData("application/json", JSON.stringify(dragData));
      // Add fallback data for Windows compatibility
      e.dataTransfer.setData("text/uri-list", path);
    } else {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", JSON.stringify(dragData));
    }
    
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50');
      // Windows WebView2 fix: prevent default drag image issues
      if (isWindows) {
        const dragImage = e.currentTarget.cloneNode(true) as HTMLElement;
        dragImage.style.transform = 'rotate(0deg)';
        e.dataTransfer.setDragImage(dragImage, 10, 10);
      }
    }
  }, [isWindows]);

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
    e.stopPropagation();
    
    // Windows WebView2 fix: ensure proper drag enter handling
    if (isWindows) {
      e.dataTransfer.dropEffect = "move";
    }
    
    if (isTargetDirectory && draggedItem) {
      dragCounterRef.current++;
      setDragOverTarget(targetPath);
    }
  }, [draggedItem, isWindows]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    
    if (dragCounterRef.current <= 0) {
      setDragOverTarget(null);
      dragCounterRef.current = 0;
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    
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

    // Windows WebView2 fix: explicitly set allowed drop effect
    e.dataTransfer.dropEffect = isWindows ? "copy" : "move";
    setDragOverTarget(targetPath);
  }, [draggedItem, isWindows]);

  const handleDrop = useCallback(async (e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    dragCounterRef.current = 0;

    // Windows WebView2 fix: get data with fallback
    let dragData: DragData | null = draggedItem;
    
    if (isWindows && !dragData) {
      try {
        const jsonData = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (jsonData) {
          dragData = JSON.parse(jsonData);
        }
      } catch (error) {
        console.warn("Could not parse drag data:", error);
        return;
      }
    }

    if (!dragData || !isTargetDirectory) {
      return;
    }

    if (dragData.path === targetPath) {
      return;
    }

    if (dragData.isDirectory && targetPath.startsWith(dragData.path + "/")) {
      return;
    }

    try {
      const newPath = await moveFileOrDirectory(dragData.path, targetPath);
      if (newPath) {
        if (!dragData.isDirectory && onFileSelect) {
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
  }, [draggedItem, moveFileOrDirectory, getLastError, onFileSelect, isWindows]);

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