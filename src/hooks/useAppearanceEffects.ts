import { useEffect } from 'react';
import { useConfigManager } from './useConfigManager';

export function useAppearanceEffects() {
  const { appearanceConfig, isLoading } = useConfigManager();

  useEffect(() => {
    if (typeof document === 'undefined' || !appearanceConfig || isLoading) return;

    const root = document.documentElement;
    
    // Aplicar tamanho da fonte
    if (appearanceConfig['font-size']) {
      root.style.setProperty('--inkdown-editor-font-size', `${appearanceConfig['font-size']}px`);
    }
    
    // Aplicar família da fonte
    if (appearanceConfig['font-family']) {
      root.style.setProperty('--inkdown-editor-font-family', appearanceConfig['font-family']);
      
      // Aplicar família da fonte monospacada se for uma fonte mono
      if (appearanceConfig['font-family'].includes('Mono') || 
          appearanceConfig['font-family'].includes('monospace')) {
        root.style.setProperty('--inkdown-editor-mono-font-family', appearanceConfig['font-family']);
      }
    }
    
  }, [appearanceConfig, isLoading]);
}