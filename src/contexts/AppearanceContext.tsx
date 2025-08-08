import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConfigManager } from '../hooks/useConfigManager';
import { ThemeMode, CustomTheme } from '../types/config';

interface AppearanceState {
  themeMode: ThemeMode;
  fontSize: number;
  fontFamily: string;
  vimMode: boolean;
  showLineNumbers: boolean;
  highlightCurrentLine: boolean;
  readOnly: boolean;
  effectiveTheme: 'light' | 'dark';
  customThemes: CustomTheme[];
  currentCustomThemeId: string | null;
  customThemesLoading: boolean;
}

type AppearanceAction =
  | { type: 'SET_THEME_MODE'; payload: ThemeMode }
  | { type: 'SET_FONT_SIZE'; payload: number }
  | { type: 'SET_FONT_FAMILY'; payload: string }
  | { type: 'SET_VIM_MODE'; payload: boolean }
  | { type: 'SET_LINE_NUMBERS'; payload: boolean }
  | { type: 'SET_HIGHLIGHT_LINE'; payload: boolean }
  | { type: 'SET_READ_ONLY'; payload: boolean }
  | { type: 'SET_EFFECTIVE_THEME'; payload: 'light' | 'dark' }
  | { type: 'SET_CUSTOM_THEMES'; payload: CustomTheme[] }
  | { type: 'SET_CUSTOM_THEME_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_CUSTOM_THEME'; payload: string | null }
  | { type: 'SYNC_FROM_CONFIG'; payload: Partial<AppearanceState> };

const initialState: AppearanceState = {
  themeMode: 'light',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  vimMode: false,
  showLineNumbers: true,
  highlightCurrentLine: true,
  readOnly: false,
  effectiveTheme: 'light',
  customThemes: [],
  currentCustomThemeId: null,
  customThemesLoading: false,
};

function appearanceReducer(state: AppearanceState, action: AppearanceAction): AppearanceState {
  switch (action.type) {
    case 'SET_THEME_MODE':
      return { ...state, themeMode: action.payload };
    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.payload };
    case 'SET_FONT_FAMILY':
      return { ...state, fontFamily: action.payload };
    case 'SET_VIM_MODE':
      return { ...state, vimMode: action.payload };
    case 'SET_LINE_NUMBERS':
      return { ...state, showLineNumbers: action.payload };
    case 'SET_HIGHLIGHT_LINE':
      return { ...state, highlightCurrentLine: action.payload };
    case 'SET_READ_ONLY':
      return { ...state, readOnly: action.payload };
    case 'SET_EFFECTIVE_THEME':
      return { ...state, effectiveTheme: action.payload };
    case 'SET_CUSTOM_THEMES':
      return { ...state, customThemes: action.payload };
    case 'SET_CUSTOM_THEME_LOADING':
      return { ...state, customThemesLoading: action.payload };
    case 'SET_CURRENT_CUSTOM_THEME':
      return { ...state, currentCustomThemeId: action.payload };
    case 'SYNC_FROM_CONFIG':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppearanceContextType extends AppearanceState {
  isLoading: boolean;
  updateAppearance: (updates: { theme?: ThemeMode; fontSize?: number; fontFamily?: string }) => Promise<void>;
  updateWorkspace: (updates: { vimMode?: boolean; showLineNumbers?: boolean; highlightCurrentLine?: boolean; readOnly?: boolean }) => Promise<void>;
  refreshCustomThemes: () => Promise<void>;
  applyCustomTheme: (themeId: string) => Promise<void>;
  removeCustomTheme: () => void;
  applyTheme: (themeId: string) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

interface AppearanceProviderProps {
  children: ReactNode;
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const { appearanceConfig, workspaceConfig, updateAppearanceConfig, updateWorkspaceConfig, isLoading } = useConfigManager();
  const [state, dispatch] = useReducer(appearanceReducer, initialState);
  const themeAppliedRef = useRef<string | null>(null);

  // Apply theme to DOM
  const applyThemeToDOM = useCallback((themeId: string, isCustom: boolean = false) => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Clean existing
    root.className = root.className.replace(/theme-\w+/g, '');
    const existingStyle = document.getElementById('custom-theme-style');
    if (existingStyle) existingStyle.remove();
    
    if (isCustom) {
      root.setAttribute('data-theme', themeId);
    } else {
      const effectiveTheme = themeId === 'auto' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : themeId;
      root.setAttribute('data-theme', effectiveTheme);
      root.classList.add(`theme-${effectiveTheme}`);
    }
  }, []);

  // Sync from config
  useEffect(() => {
    if (appearanceConfig || workspaceConfig) {
      const combinedConfig = {
        themeMode: appearanceConfig?.theme || 'light',
        fontSize: appearanceConfig?.['font-size'] || 14,
        fontFamily: appearanceConfig?.['font-family'] || 'Inter, system-ui, sans-serif',
        vimMode: workspaceConfig?.vimMode || false,
        showLineNumbers: workspaceConfig?.showLineNumbers !== false,
        highlightCurrentLine: workspaceConfig?.highlightCurrentLine !== false,
        readOnly: workspaceConfig?.readOnly || false,
      };

      dispatch({
        type: 'SYNC_FROM_CONFIG',
        payload: combinedConfig
      });

      if (appearanceConfig?.['custom-theme']) {
        dispatch({ type: 'SET_CURRENT_CUSTOM_THEME', payload: appearanceConfig['custom-theme'] });
      }
    }
  }, [appearanceConfig, workspaceConfig]);

  // Calculate effective theme
  useEffect(() => {
    const calculateTheme = () => {
      if (state.themeMode === 'auto') {
        try {
          const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
          return prefersDark ? 'dark' : 'light';
        } catch {
          return 'light';
        }
      }
      return state.themeMode as 'light' | 'dark';
    };

    const newTheme = calculateTheme();
    if (newTheme !== state.effectiveTheme) {
      dispatch({ type: 'SET_EFFECTIVE_THEME', payload: newTheme });
    }

    if (state.themeMode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const theme = mediaQuery.matches ? 'dark' : 'light';
        dispatch({ type: 'SET_EFFECTIVE_THEME', payload: theme });
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [state.themeMode, state.effectiveTheme]);

  // Apply theme styles
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    root.style.setProperty('--inkdown-editor-font-size', `${state.fontSize}px`);
    root.style.setProperty('--inkdown-editor-font-family', state.fontFamily);
    
    if (state.fontFamily.includes('Mono') || state.fontFamily.includes('monospace')) {
      root.style.setProperty('--inkdown-editor-mono-font-family', state.fontFamily);
    }
    
    // Only apply default theme if no custom theme
    if (!state.currentCustomThemeId) {
      applyThemeToDOM(state.effectiveTheme);
    }
  }, [state.effectiveTheme, state.fontSize, state.fontFamily, state.currentCustomThemeId, applyThemeToDOM]);

  // Config change event
  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    window.dispatchEvent(new CustomEvent('inkdown-config-change', {
      detail: { appearance: appearanceConfig, workspace: workspaceConfig }
    }));
  }, [appearanceConfig, workspaceConfig, isLoading]);

  const updateAppearance = useCallback(async (updates: { theme?: ThemeMode; fontSize?: number; fontFamily?: string }) => {
    // Update state
    if (updates.theme !== undefined) {
      dispatch({ type: 'SET_THEME_MODE', payload: updates.theme });
      dispatch({ type: 'SET_CURRENT_CUSTOM_THEME', payload: null });
      applyThemeToDOM(updates.theme);
    }
    if (updates.fontSize !== undefined) dispatch({ type: 'SET_FONT_SIZE', payload: updates.fontSize });
    if (updates.fontFamily !== undefined) dispatch({ type: 'SET_FONT_FAMILY', payload: updates.fontFamily });
    
    // Save config
    const configUpdates: any = {};
    if (updates.theme !== undefined) configUpdates.theme = updates.theme;
    if (updates.fontSize !== undefined) configUpdates['font-size'] = updates.fontSize;
    if (updates.fontFamily !== undefined) configUpdates['font-family'] = updates.fontFamily;
    
    if (Object.keys(configUpdates).length > 0) {
      try {
        await updateAppearanceConfig(configUpdates);
      } catch (error) {
        console.error('Failed to save appearance config:', error);
      }
    }
    
    // Clear custom theme
    if (updates.theme !== undefined) {
      localStorage.removeItem('custom-theme-id');
      updateAppearanceConfig({ 'custom-theme': undefined }).catch(console.error);
    }
  }, [updateAppearanceConfig, applyThemeToDOM]);

  const updateWorkspace = useCallback(async (updates: { vimMode?: boolean; showLineNumbers?: boolean; highlightCurrentLine?: boolean; readOnly?: boolean }) => {
    if (updates.vimMode !== undefined) dispatch({ type: 'SET_VIM_MODE', payload: updates.vimMode });
    if (updates.showLineNumbers !== undefined) dispatch({ type: 'SET_LINE_NUMBERS', payload: updates.showLineNumbers });
    if (updates.highlightCurrentLine !== undefined) dispatch({ type: 'SET_HIGHLIGHT_LINE', payload: updates.highlightCurrentLine });
    if (updates.readOnly !== undefined) dispatch({ type: 'SET_READ_ONLY', payload: updates.readOnly });
    
    try {
      await updateWorkspaceConfig(updates);
    } catch (error) {
      console.error('Failed to save workspace config:', error);
    }
  }, [updateWorkspaceConfig]);

  const refreshCustomThemes = useCallback(async () => {
    if (state.customThemesLoading) return;
    
    dispatch({ type: 'SET_CUSTOM_THEME_LOADING', payload: true });
    
    try {
      const customThemes = await invoke<CustomTheme[]>('get_custom_themes');
      dispatch({ type: 'SET_CUSTOM_THEMES', payload: customThemes });
    } catch (err) {
      console.error('Failed to load custom themes:', err);
    } finally {
      dispatch({ type: 'SET_CUSTOM_THEME_LOADING', payload: false });
    }
  }, [state.customThemesLoading]);

  const applyCustomTheme = useCallback(async (themeId: string) => {
    if (state.currentCustomThemeId === themeId) return;

    try {
      const cssContent = await invoke<string>('get_theme_css', { themeId });
      
      applyThemeToDOM(themeId, true);
      
      const style = document.createElement('style');
      style.id = 'custom-theme-style';
      style.textContent = cssContent;
      document.head.appendChild(style);
      
      dispatch({ type: 'SET_CURRENT_CUSTOM_THEME', payload: themeId });
      
      localStorage.setItem('custom-theme-id', themeId);
      updateAppearanceConfig({ 'custom-theme': themeId }).catch(console.error);
      
    } catch (err) {
      console.error('Failed to apply theme:', err);
    }
  }, [state.currentCustomThemeId, applyThemeToDOM, updateAppearanceConfig]);

  const removeCustomTheme = useCallback(() => {
    dispatch({ type: 'SET_CURRENT_CUSTOM_THEME', payload: null });
    applyThemeToDOM(state.effectiveTheme);
    
    localStorage.removeItem('custom-theme-id');
    updateAppearanceConfig({ 'custom-theme': undefined }).catch(console.error);
  }, [state.effectiveTheme, applyThemeToDOM, updateAppearanceConfig]);

  const applyTheme = useCallback(async (themeId: string) => {
    if (['light', 'dark', 'auto'].includes(themeId)) {
      await updateAppearance({ theme: themeId as ThemeMode });
    } else {
      await applyCustomTheme(themeId);
    }
  }, [updateAppearance, applyCustomTheme]);


  // Load custom themes on mount
  const themesLoadedRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !themesLoadedRef.current) {
      themesLoadedRef.current = true;
      refreshCustomThemes();
    }
  }, [isLoading, refreshCustomThemes]);

  // Apply saved custom theme
  useEffect(() => {
    const applySavedTheme = async () => {
      const savedThemeId = state.currentCustomThemeId || appearanceConfig?.['custom-theme'];
      
      if (!savedThemeId || themeAppliedRef.current === savedThemeId) {
        return;
      }
      
      if (state.customThemes.length > 0) {
        const themeExists = state.customThemes.some(theme => 
          theme.variants.some(variant => variant.id === savedThemeId)
        );
        
        if (themeExists) {
          try {
            await applyCustomTheme(savedThemeId);
            themeAppliedRef.current = savedThemeId;
          } catch (err) {
            console.error('Failed to apply saved theme:', err);
          }
        } else {
          console.warn(`Saved theme '${savedThemeId}' no longer exists`);
          localStorage.removeItem('custom-theme-id');
          updateAppearanceConfig({ 'custom-theme': undefined }).catch(console.error);
          dispatch({ type: 'SET_CURRENT_CUSTOM_THEME', payload: null });
        }
      }
    };

    if (state.customThemes.length > 0 && !isLoading) {
      applySavedTheme();
    }
  }, [state.customThemes.length, state.currentCustomThemeId, appearanceConfig?.['custom-theme'], isLoading, applyCustomTheme, updateAppearanceConfig]);

  const contextValue = useMemo(() => ({
    ...state,
    isLoading,
    updateAppearance,
    updateWorkspace,
    refreshCustomThemes,
    applyCustomTheme,
    removeCustomTheme,
    applyTheme,
  }), [state, isLoading, updateAppearance, updateWorkspace, refreshCustomThemes, applyCustomTheme, removeCustomTheme, applyTheme]);

  return (
    <AppearanceContext.Provider value={contextValue}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error('useAppearance deve ser usado dentro de um AppearanceProvider');
  }
  return context;
}