import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useConfigManager } from '../hooks/useConfigManager';

interface SimpleThemeContextType {
  themeMode: 'light' | 'dark' | 'auto';
  effectiveTheme: 'light' | 'dark';
}

const SimpleThemeContext = createContext<SimpleThemeContextType | undefined>(undefined);

interface SimpleThemeProviderProps {
  children: ReactNode;
}

export function SimpleThemeProvider({ children }: SimpleThemeProviderProps) {
  const { appearanceConfig } = useConfigManager();
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  const themeMode = appearanceConfig?.theme || 'light';

  useEffect(() => {
    let newTheme: 'light' | 'dark' = 'light';

    if (themeMode === 'auto') {
      try {
        if (typeof window !== 'undefined' && window.matchMedia) {
          newTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
      } catch (error) {
        console.warn('Error checking system theme:', error);
        newTheme = 'light';
      }
    } else {
      newTheme = themeMode as 'light' | 'dark';
    }

    setEffectiveTheme(newTheme);

    // Aplicar ao DOM
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
      document.documentElement.classList.add(`theme-${newTheme}`);
    }
  }, [themeMode]);

  // Aplicar configurações de fonte
  useEffect(() => {
    if (typeof document === 'undefined' || !appearanceConfig) return;

    const root = document.documentElement;
    
    if (appearanceConfig['font-size']) {
      root.style.setProperty('--inkdown-editor-font-size', `${appearanceConfig['font-size']}px`);
    }
    
    if (appearanceConfig['font-family']) {
      root.style.setProperty('--inkdown-editor-font-family', appearanceConfig['font-family']);
      
      if (appearanceConfig['font-family'].includes('Mono') || 
          appearanceConfig['font-family'].includes('monospace')) {
        root.style.setProperty('--inkdown-editor-mono-font-family', appearanceConfig['font-family']);
      }
    }
  }, [appearanceConfig]);

  // Listener para mudanças do sistema quando auto
  useEffect(() => {
    if (themeMode === 'auto') {
      try {
        if (typeof window !== 'undefined' && window.matchMedia) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            const newTheme = mediaQuery.matches ? 'dark' : 'light';
            setEffectiveTheme(newTheme);
            
            if (typeof document !== 'undefined') {
              document.documentElement.setAttribute('data-theme', newTheme);
              document.documentElement.className = document.documentElement.className.replace(/theme-\w+/g, '');
              document.documentElement.classList.add(`theme-${newTheme}`);
            }
          };
          
          mediaQuery.addEventListener('change', handleChange);
          return () => mediaQuery.removeEventListener('change', handleChange);
        }
      } catch (error) {
        console.warn('Error setting up media query listener:', error);
      }
    }
  }, [themeMode]);

  return (
    <SimpleThemeContext.Provider value={{
      themeMode,
      effectiveTheme,
    }}>
      {children}
    </SimpleThemeContext.Provider>
  );
}

export function useSimpleTheme() {
  const context = useContext(SimpleThemeContext);
  if (context === undefined) {
    throw new Error('useSimpleTheme deve ser usado dentro de um SimpleThemeProvider');
  }
  return context;
}