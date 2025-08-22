import { useState, useCallback, useRef, DragEvent, useMemo, useEffect } from "react";
import { useFileOperations } from "./useFileOperations";
import { platform } from "@tauri-apps/plugin-os";

interface DragData {
  path: string;
  isDirectory: boolean;
  name: string;
}

interface PlatformInfo {
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
}

export function useDragAndDrop(onFileSelect?: (path: string) => void) {
  const [draggedItem, setDraggedItem] = useState<DragData | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isWindows: false,
    isMacOS: false,
    isLinux: false
  });
  const dragCounterRef = useRef(0);
  const onFileSelectRef = useRef(onFileSelect);
  const { moveFileOrDirectory, getLastError } = useFileOperations();
  const platformDetectedRef = useRef(false);

  onFileSelectRef.current = onFileSelect;

  useEffect(() => {
    const detectPlatform = async () => {
      if (platformDetectedRef.current) return;
      
      try {
        if (typeof window !== 'undefined' && window.__TAURI__) {
          const currentPlatform = await platform();
          setPlatformInfo({
            isWindows: currentPlatform === 'windows',
            isMacOS: currentPlatform === 'macos',
            isLinux: currentPlatform === 'linux'
          });
        } else {
          // Fallback detection for development
          const userAgent = navigator.userAgent.toLowerCase();
          setPlatformInfo({
            isWindows: userAgent.includes('windows'),
            isMacOS: userAgent.includes('mac'),
            isLinux: userAgent.includes('linux')
          });
        }
        platformDetectedRef.current = true;
      } catch (error) {
        console.warn('Could not detect platform:', error);
        // Safe defaults
        setPlatformInfo({
          isWindows: false,
          isMacOS: false,
          isLinux: true
        });
        platformDetectedRef.current = true;
      }
    };

    detectPlatform();
  }, []);

  const handleDragStart = useCallback((e: DragEvent, path: string, isDirectory: boolean, name: string) => {
    const dragData: DragData = { path, isDirectory, name };
    setDraggedItem(dragData);
    
    // Prevent drag if platform not detected yet
    if (!platformDetectedRef.current) {
      e.preventDefault();
      return;
    }
    
    // Cross-platform data transfer setup
    const dataJSON = JSON.stringify(dragData);
    
    try {
      // Set multiple data formats for maximum compatibility
      e.dataTransfer.setData("text/plain", dataJSON);
      e.dataTransfer.setData("application/json", dataJSON);
      
      // Platform-specific optimizations
      if (platformInfo.isWindows) {
        // Windows WebView2 requires specific handling
        e.dataTransfer.effectAllowed = "all";
        e.dataTransfer.setData("text/uri-list", `file://${path}`);
      } else if (platformInfo.isMacOS) {
        // macOS prefers move operations
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/uri-list", `file://${path}`);
      } else {
        // Linux/generic
        e.dataTransfer.effectAllowed = "move";
      }
      
      // Custom data key for internal tracking
      e.dataTransfer.setData("application/x-inkdown-item", dataJSON);
      
    } catch (error) {
      console.warn('Error setting drag data:', error);
      // Fallback - at least set text/plain
      e.dataTransfer.setData("text/plain", dataJSON);
    }
    
    // Visual feedback with platform-specific handling
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.classList.add('opacity-50');
      
      // Create custom drag image for better cross-platform appearance
      try {
        const dragImage = document.createElement('div');
        dragImage.textContent = name;
        dragImage.style.cssText = `
          position: absolute;
          top: -1000px;
          left: -1000px;
          padding: 4px 8px;
          background: var(--theme-background);
          border: 1px solid var(--theme-border);
          border-radius: 4px;
          font-size: 12px;
          color: var(--theme-foreground);
          pointer-events: none;
          z-index: 9999;
        `;
        
        document.body.appendChild(dragImage);
        
        // Platform-specific drag image positioning
        const offsetX = platformInfo.isMacOS ? 0 : 10;
        const offsetY = platformInfo.isMacOS ? 0 : 10;
        
        e.dataTransfer.setDragImage(dragImage, offsetX, offsetY);
        
        // Clean up drag image after a delay
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
          }
        }, 100);
        
      } catch (error) {
        console.warn('Error creating custom drag image:', error);
      }
    }
  }, [platformInfo]);

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
    
    // Cross-platform drag enter handling
    if (platformInfo.isWindows) {
      e.dataTransfer.dropEffect = "copy";
    } else if (platformInfo.isMacOS) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
    
    if (isTargetDirectory && (draggedItem || e.dataTransfer.types.length > 0)) {
      dragCounterRef.current++;
      setDragOverTarget(targetPath);
    }
  }, [draggedItem, platformInfo]);

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
    
    // Check if we have valid drag data
    const hasDragData = draggedItem || e.dataTransfer.types.includes("application/x-inkdown-item") || 
                       e.dataTransfer.types.includes("application/json") || 
                       e.dataTransfer.types.includes("text/plain");
    
    if (!hasDragData || !isTargetDirectory) {
      e.dataTransfer.dropEffect = "none";
      return;
    }

    // Get drag data for validation
    let currentDragData = draggedItem;
    if (!currentDragData) {
      try {
        const dataString = e.dataTransfer.getData("application/x-inkdown-item") ||
                          e.dataTransfer.getData("application/json") ||
                          e.dataTransfer.getData("text/plain");
        if (dataString) {
          currentDragData = JSON.parse(dataString);
        }
      } catch (error) {
        // Invalid data, reject drop
        e.dataTransfer.dropEffect = "none";
        return;
      }
    }

    if (currentDragData) {
      // Prevent dropping on self
      if (currentDragData.path === targetPath) {
        e.dataTransfer.dropEffect = "none";
        setDragOverTarget(null);
        return;
      }

      // Prevent dropping directory into its own subdirectory
      if (currentDragData.isDirectory && targetPath.startsWith(currentDragData.path + "/")) {
        e.dataTransfer.dropEffect = "none";
        setDragOverTarget(null);
        return;
      }
    }

    // Platform-specific drop effects
    if (platformInfo.isWindows) {
      e.dataTransfer.dropEffect = "copy";
    } else if (platformInfo.isMacOS) {
      e.dataTransfer.dropEffect = "move";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
    
    setDragOverTarget(targetPath);
  }, [draggedItem, platformInfo]);

  const handleDrop = useCallback(async (e: DragEvent, targetPath: string, isTargetDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    dragCounterRef.current = 0;

    // Try to get drag data from multiple sources with fallbacks
    let dragData: DragData | null = draggedItem;
    
    if (!dragData) {
      try {
        // Try multiple data formats in order of preference
        const dataString = e.dataTransfer.getData("application/x-inkdown-item") ||
                          e.dataTransfer.getData("application/json") ||
                          e.dataTransfer.getData("text/plain");
        
        if (dataString) {
          dragData = JSON.parse(dataString);
        }
      } catch (error) {
        console.warn("Could not parse drag data:", error);
        
        // Final fallback: try to extract from text/uri-list
        try {
          const uriList = e.dataTransfer.getData("text/uri-list");
          if (uriList) {
            const uri = uriList.split('\n')[0].trim();
            if (uri.startsWith('file://')) {
              const filePath = decodeURIComponent(uri.substring(7));
              // Create basic drag data from URI
              dragData = {
                path: filePath,
                isDirectory: false, // Conservative assumption
                name: filePath.split(/[/\\]/).pop() || 'unknown'
              };
            }
          }
        } catch (uriError) {
          console.warn("Could not parse URI list:", uriError);
          return;
        }
      }
    }

    if (!dragData || !isTargetDirectory) {
      return;
    }

    // Validation checks
    if (dragData.path === targetPath) {
      return;
    }

    if (dragData.isDirectory && targetPath.startsWith(dragData.path + "/")) {
      return;
    }

    try {
      console.log(`Moving ${dragData.path} to ${targetPath}`);
      const newPath = await moveFileOrDirectory(dragData.path, targetPath);
      
      if (newPath) {
        console.log(`Successfully moved to ${newPath}`);
        // Update file selection if it's a file
        if (!dragData.isDirectory && onFileSelectRef.current) {
          onFileSelectRef.current(newPath);
        }
      } else {
        const error = getLastError();
        console.error("Failed to move file:", error);
      }
    } catch (error) {
      console.error("Error during drag and drop:", error);
    }

    // Always clean up state
    setDraggedItem(null);
  }, [draggedItem, moveFileOrDirectory, getLastError]);

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