import { useState, useCallback, useRef } from 'react';

export function useSidebarResize(initialWidth = 280) {
  const [sidebarWidth, setSidebarWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    resizingRef.current = true;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    
    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    resizingRef.current = false;
  }, []);

  const startResizing = useCallback(() => {
    if (resizingRef.current) return;

    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => {
      handleMouseUp();
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [handleMouseMove, handleMouseUp]);

  return {
    sidebarWidth,
    isResizing,
    handleMouseDown: useCallback((e: React.MouseEvent) => {
      handleMouseDown(e);
      startResizing();
    }, [handleMouseDown, startResizing])
  };
}