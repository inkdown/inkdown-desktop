import { useState, useRef, useCallback } from 'react';

interface FPSMetrics {
  fps: number;
  avgFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number;
  samples: number;
}

export function useFPS() {
  const [metrics, setMetrics] = useState<FPSMetrics>({
    fps: 0,
    avgFps: 0,
    minFps: Infinity,
    maxFps: 0,
    frameTime: 0,
    samples: 0
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const animationIdRef = useRef<number>();
  const runningRef = useRef(false);

  const measureFPS = useCallback((currentTime: number) => {
    frameCountRef.current++;
    
    if (currentTime - lastTimeRef.current >= 1000) {
      const currentFPS = Math.round((frameCountRef.current * 1000) / (currentTime - lastTimeRef.current));
      const frameTime = (currentTime - lastTimeRef.current) / frameCountRef.current;
      
      fpsHistoryRef.current.push(currentFPS);
      if (fpsHistoryRef.current.length > 60) {
        fpsHistoryRef.current.shift();
      }
      
      const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
      const minFps = Math.min(...fpsHistoryRef.current);
      const maxFps = Math.max(...fpsHistoryRef.current);
      
      setMetrics({
        fps: currentFPS,
        avgFps: Math.round(avgFps * 100) / 100,
        minFps,
        maxFps,
        frameTime: Math.round(frameTime * 100) / 100,
        samples: fpsHistoryRef.current.length
      });
      
      frameCountRef.current = 0;
      lastTimeRef.current = currentTime;
    }
    
    if (runningRef.current) {
      animationIdRef.current = requestAnimationFrame(measureFPS);
    }
  }, []);

  const startMeasuring = useCallback(() => {
    if (runningRef.current) return;
    
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    animationIdRef.current = requestAnimationFrame(measureFPS);
  }, [measureFPS]);

  const stopMeasuring = useCallback(() => {
    runningRef.current = false;
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
  }, []);

  const resetMetrics = useCallback(() => {
    fpsHistoryRef.current = [];
    frameCountRef.current = 0;
    lastTimeRef.current = performance.now();
    setMetrics({
      fps: 0,
      avgFps: 0,
      minFps: Infinity,
      maxFps: 0,
      frameTime: 0,
      samples: 0
    });
  }, []);

  return { metrics, resetMetrics, startMeasuring, stopMeasuring };
}