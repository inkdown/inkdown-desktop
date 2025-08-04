import { useState, useRef, useCallback } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetrics {
  memory: MemoryInfo | null;
  loadTime: number;
  domNodes: number;
  timestamp: number;
}

declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }
}

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memory: null,
    loadTime: 0,
    domNodes: 0,
    timestamp: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const loadTimeRef = useRef<number>(
    performance.timing ? 
      performance.timing.loadEventEnd - performance.timing.navigationStart : 
      0
  );

  const updateMetrics = useCallback(() => {
    const memory = performance.memory ? {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    } : null;

    setMetrics({
      memory,
      loadTime: loadTimeRef.current,
      domNodes: document.querySelectorAll('*').length,
      timestamp: Date.now()
    });
  }, []);

  const startMonitoring = useCallback(() => {
    if (intervalRef.current) return;
    
    updateMetrics();
    intervalRef.current = setInterval(updateMetrics, 2000);
  }, [updateMetrics]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return { metrics, formatBytes, startMonitoring, stopMonitoring };
}