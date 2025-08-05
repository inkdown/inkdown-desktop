import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ThemeMode, CustomTheme, ThemeColors, AppearanceConfig } from '../types/config';

const defaultLightTheme: ThemeColors = {
  primary: '#6366f1',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f8fafc',
  mutedForeground: '#64748b',
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  border: '#e2e8f0',
  input: '#ffffff',
  ring: '#6366f1',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  sidebar: {
    background: '#f8fafc',
    foreground: '#334155',
    border: '#e2e8f0',
    hover: '#f1f5f9',
    active: '#e2e8f0',
  },
  editor: {
    background: '#ffffff',
    foreground: '#24292f',
    selection: '#6366f133',
    cursor: '#24292f',
    border: '#e2e8f0',
    lineNumber: '#8c959f',
    activeLine: '#f6f8fa',
    scrollbar: '#e2e8f0',
  },
  headings: {
    h1: '#dc2626', // Red
    h2: '#ea580c', // Orange
    h3: '#d97706', // Amber
    h4: '#65a30d', // Lime
    h5: '#059669', // Emerald
    h6: '#0891b2', // Cyan
  },
};

const defaultDarkTheme: ThemeColors = {
  primary: '#6366f1',
  primaryForeground: '#ffffff',
  secondary: '#1e293b',
  secondaryForeground: '#f8fafc',
  background: '#0f172a',
  foreground: '#f8fafc',
  muted: '#1e293b',
  mutedForeground: '#94a3b8',
  accent: '#1e293b',
  accentForeground: '#f8fafc',
  border: '#334155',
  input: '#1e293b',
  ring: '#6366f1',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  sidebar: {
    background: '#1e293b',
    foreground: '#cbd5e1',
    border: '#334155',
    hover: '#334155',
    active: '#475569',
  },
  editor: {
    background: '#0d1117',
    foreground: '#e6edf3',
    selection: '#6366f133',
    cursor: '#e6edf3',
    border: '#30363d',
    lineNumber: '#7d8590',
    activeLine: '#161b22',
    scrollbar: '#30363d',
  },
  headings: {
    h1: '#f87171', // Red - lighter for dark theme
    h2: '#fb923c', // Orange
    h3: '#fbbf24', // Amber
    h4: '#a3e635', // Lime
    h5: '#34d399', // Emerald
    h6: '#22d3ee', // Cyan
  },
};

const builtinThemes: CustomTheme[] = [
  {
    id: 'default-light',
    name: 'Default Light',
    mode: 'light',
    colors: defaultLightTheme,
  },
  {
    id: 'default-dark',
    name: 'Default Dark',
    mode: 'dark',
    colors: defaultDarkTheme,
  },
];

interface ThemeContextType {
  themeMode: ThemeMode;
  currentTheme: CustomTheme;
  customThemes: CustomTheme[];
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setCustomTheme: (themeId: string) => Promise<void>;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (themeId: string) => void;
  getAllThemes: () => CustomTheme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [customThemeId, setCustomThemeId] = useState<string>('default-light');
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);

  const getCurrentTheme = (): CustomTheme => {
    const allThemes = [...builtinThemes, ...customThemes];
    const theme = allThemes.find(t => t.id === customThemeId);
    
    if (theme) return theme;

    if (themeMode === 'auto') {
      // Safe check for window.matchMedia availability
      try {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia 
          ? window.matchMedia('(prefers-color-scheme: dark)').matches 
          : false;
        return prefersDark ? builtinThemes[1] : builtinThemes[0];
      } catch (error) {
        console.warn('Error accessing matchMedia:', error);
        return builtinThemes[0]; // Default to light theme
      }
    }

    return themeMode === 'dark' ? builtinThemes[1] : builtinThemes[0];
  };

  const currentTheme = getCurrentTheme();

  const applyThemeToDOM = (theme: CustomTheme) => {
    try {
      if (typeof document === 'undefined') return;
      
      const root = document.documentElement;
      
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          root.style.setProperty(`--theme-${key}`, value);
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            root.style.setProperty(`--theme-${key}-${subKey}`, subValue);
          });
        }
      });

      root.setAttribute('data-theme', theme.mode);
      root.className = root.className.replace(/theme-\w+/g, '');
      root.classList.add(`theme-${theme.id}`);
    } catch (error) {
      console.warn('Error applying theme to DOM:', error);
    }
  };

  const loadThemeFromConfig = async () => {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && window.__TAURI__) {
        const configStr = await invoke<string>('load_appearance_config');
        const config = JSON.parse(configStr);
        
        if (config.theme) {
          setThemeModeState(config.theme);
        }
        return;
      }
      throw new Error('Tauri not available');
    } catch (error) {
      console.warn('Failed to load theme from config, using localStorage fallback:', error);
      try {
        const savedTheme = localStorage.getItem('inkdown-theme-mode');
        const savedCustomTheme = localStorage.getItem('inkdown-custom-theme');
        
        if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
          setThemeModeState(savedTheme as ThemeMode);
        }
        
        if (savedCustomTheme) {
          setCustomThemeId(savedCustomTheme);
        }
      } catch (localStorageError) {
        console.warn('Failed to load theme from localStorage:', localStorageError);
        // Use default values already set in useState
      }
    }
  };

  const saveThemeToConfig = async (mode: ThemeMode, customTheme?: string) => {
    try {
      // Check if we're in a Tauri environment
      if (typeof window !== 'undefined' && window.__TAURI__) {
        // Load current appearance config
        const configStr = await invoke<string>('load_appearance_config');
        const currentConfig = JSON.parse(configStr);
        
        // Update with new theme
        const newConfig = {
          ...currentConfig,
          theme: mode,
        };
        
        await invoke('save_appearance_config', { 
          config: JSON.stringify(newConfig)
        });
      } else {
        throw new Error('Tauri not available');
      }
    } catch (error) {
      console.warn('Failed to save theme to appearance config, using localStorage:', error);
      try {
        localStorage.setItem('inkdown-theme-mode', mode);
        if (customTheme) {
          localStorage.setItem('inkdown-custom-theme', customTheme);
        }
      } catch (localStorageError) {
        console.warn('Failed to save to localStorage:', localStorageError);
      }
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveThemeToConfig(mode);
  };

  const setCustomTheme = async (themeId: string) => {
    setCustomThemeId(themeId);
    await saveThemeToConfig(themeMode, themeId);
  };

  const addCustomTheme = (theme: CustomTheme) => {
    setCustomThemes(prev => [...prev.filter(t => t.id !== theme.id), theme]);
  };

  const removeCustomTheme = (themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    if (customThemeId === themeId) {
      setCustomThemeId('default-light');
    }
  };

  const getAllThemes = (): CustomTheme[] => {
    return [...builtinThemes, ...customThemes];
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load theme asynchronously but don't wait for it
      loadThemeFromConfig().catch(error => {
        console.warn('Failed to load theme config in useEffect:', error);
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyThemeToDOM(currentTheme);
    }
  }, [currentTheme]);

  // Remove polling - we'll sync via ConfigManager

  useEffect(() => {
    if (themeMode === 'auto') {
      try {
        if (typeof window !== 'undefined' && window.matchMedia) {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
          const handleChange = () => {
            applyThemeToDOM(getCurrentTheme());
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
    <ThemeContext.Provider value={{
      themeMode,
      currentTheme,
      customThemes,
      setThemeMode,
      setCustomTheme,
      addCustomTheme,
      removeCustomTheme,
      getAllThemes,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}