import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export function useOptimizedNavigation() {
  const navigate = useNavigate();

  const prefetchRoute = useCallback((route: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
    
    setTimeout(() => {
      document.head.removeChild(link);
    }, 5000);
  }, []);

  const navigateWithPrefetch = useCallback((route: string, options?: { replace?: boolean }) => {
    navigate(route, { replace: options?.replace || false });
  }, [navigate]);

  const handleMouseEnter = useCallback((route: string) => {
    prefetchRoute(route);
  }, [prefetchRoute]);

  return {
    navigate: navigateWithPrefetch,
    prefetchRoute,
    handleMouseEnter
  };
}