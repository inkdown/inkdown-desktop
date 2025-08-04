import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Hook para navegação otimizada com prefetch
export function useOptimizedNavigation() {
  const navigate = useNavigate();

  const prefetchRoute = useCallback((route: string) => {
    // Prefetch da rota para carregar recursos antecipadamente
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
    
    // Remove o link após um tempo para não poluir o DOM
    setTimeout(() => {
      document.head.removeChild(link);
    }, 5000);
  }, []);

  const navigateWithPrefetch = useCallback((route: string, options?: { replace?: boolean }) => {
    // Usa replace para evitar acúmulo no history
    navigate(route, { replace: options?.replace || false });
  }, [navigate]);

  const handleMouseEnter = useCallback((route: string) => {
    // Prefetch quando o mouse passa por cima de um link
    prefetchRoute(route);
  }, [prefetchRoute]);

  return {
    navigate: navigateWithPrefetch,
    prefetchRoute,
    handleMouseEnter
  };
}