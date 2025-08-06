import { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useConfigManager } from '../hooks/useConfigManager';
import { ThemeMode, ThemeColors } from '../types/config';

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
    h1: '#dc2626',
    h2: '#ea580c',
    h3: '#d97706',
    h4: '#65a30d',
    h5: '#059669',
    h6: '#0891b2',
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
    h1: '#f87171',
    h2: '#fb923c',
    h3: '#fbbf24',
    h4: '#a3e635',
    h5: '#34d399',
    h6: '#22d3ee',
  },
};

interface AppearanceState {
  themeMode: ThemeMode;
  fontSize: number;
  fontFamily: string;
  vimMode: boolean;
  showLineNumbers: boolean;
  highlightCurrentLine: boolean;
  readOnly: boolean;
  effectiveTheme: 'light' | 'dark';
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
    case 'SYNC_FROM_CONFIG':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppearanceContextType extends AppearanceState {
  currentTheme: ThemeColors;
  isLoading: boolean;
  updateAppearance: (updates: { theme?: ThemeMode; fontSize?: number; fontFamily?: string }) => Promise<void>;
  updateWorkspace: (updates: { vimMode?: boolean; showLineNumbers?: boolean; highlightCurrentLine?: boolean; readOnly?: boolean }) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

interface AppearanceProviderProps {
  children: ReactNode;
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const { appearanceConfig, workspaceConfig, updateAppearanceConfig, updateWorkspaceConfig, isLoading } = useConfigManager();
  const [state, dispatch] = useReducer(appearanceReducer, initialState);

  useEffect(() => {
    if (appearanceConfig || workspaceConfig) {
      dispatch({
        type: 'SYNC_FROM_CONFIG',
        payload: {
          themeMode: appearanceConfig?.theme || 'light',
          fontSize: appearanceConfig?.['font-size'] || 14,
          fontFamily: appearanceConfig?.['font-family'] || 'Inter, system-ui, sans-serif',
          vimMode: workspaceConfig?.vimMode || false,
          showLineNumbers: workspaceConfig?.showLineNumbers !== false,
          highlightCurrentLine: workspaceConfig?.highlightCurrentLine !== false,
          readOnly: workspaceConfig?.readOnly || false,
        }
      });
    }
  }, [appearanceConfig, workspaceConfig]);

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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', state.effectiveTheme);
    root.className = root.className.replace(/theme-\w+/g, '');
    root.classList.add(`theme-${state.effectiveTheme}`);
    root.style.setProperty('--inkdown-editor-font-size', `${state.fontSize}px`);
    root.style.setProperty('--inkdown-editor-font-family', state.fontFamily);
    if (state.fontFamily.includes('Mono') || state.fontFamily.includes('monospace')) {
      root.style.setProperty('--inkdown-editor-mono-font-family', state.fontFamily);
    }
  }, [state.effectiveTheme, state.fontSize, state.fontFamily]);

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading) return;
    window.dispatchEvent(new CustomEvent('inkdown-config-change', {
      detail: { appearance: appearanceConfig, workspace: workspaceConfig }
    }));
  }, [appearanceConfig, workspaceConfig, isLoading]);

  const updateAppearance = useCallback(async (updates: { theme?: ThemeMode; fontSize?: number; fontFamily?: string }) => {
    if (updates.theme !== undefined) dispatch({ type: 'SET_THEME_MODE', payload: updates.theme });
    if (updates.fontSize !== undefined) dispatch({ type: 'SET_FONT_SIZE', payload: updates.fontSize });
    if (updates.fontFamily !== undefined) dispatch({ type: 'SET_FONT_FAMILY', payload: updates.fontFamily });
    
    const appearanceUpdates: any = {};
    if (updates.theme !== undefined) appearanceUpdates.theme = updates.theme;
    if (updates.fontSize !== undefined) appearanceUpdates['font-size'] = updates.fontSize;
    if (updates.fontFamily !== undefined) appearanceUpdates['font-family'] = updates.fontFamily;
    
    if (Object.keys(appearanceUpdates).length > 0) {
      try {
        await updateAppearanceConfig(appearanceUpdates);
      } catch (error) {
        if (appearanceConfig) {
          dispatch({
            type: 'SYNC_FROM_CONFIG',
            payload: {
              themeMode: appearanceConfig.theme || 'light',
              fontSize: appearanceConfig['font-size'] || 14,
              fontFamily: appearanceConfig['font-family'] || 'Inter, system-ui, sans-serif',
            }
          });
        }
      }
    }
  }, [updateAppearanceConfig, appearanceConfig]);

  const updateWorkspace = useCallback(async (updates: { vimMode?: boolean; showLineNumbers?: boolean; highlightCurrentLine?: boolean; readOnly?: boolean }) => {
    if (updates.vimMode !== undefined) dispatch({ type: 'SET_VIM_MODE', payload: updates.vimMode });
    if (updates.showLineNumbers !== undefined) dispatch({ type: 'SET_LINE_NUMBERS', payload: updates.showLineNumbers });
    if (updates.highlightCurrentLine !== undefined) dispatch({ type: 'SET_HIGHLIGHT_LINE', payload: updates.highlightCurrentLine });
    if (updates.readOnly !== undefined) dispatch({ type: 'SET_READ_ONLY', payload: updates.readOnly });
    
    try {
      await updateWorkspaceConfig(updates);
    } catch (error) {
      if (workspaceConfig) {
        dispatch({
          type: 'SYNC_FROM_CONFIG',
          payload: {
            vimMode: workspaceConfig.vimMode || false,
            showLineNumbers: workspaceConfig.showLineNumbers !== false,
            highlightCurrentLine: workspaceConfig.highlightCurrentLine !== false,
            readOnly: workspaceConfig.readOnly || false,
          }
        });
      }
    }
  }, [updateWorkspaceConfig, workspaceConfig]);

  const currentTheme = useMemo(() => 
    state.effectiveTheme === 'dark' ? defaultDarkTheme : defaultLightTheme,
    [state.effectiveTheme]
  );

  return (
    <AppearanceContext.Provider value={{
      ...state,
      currentTheme,
      isLoading,
      updateAppearance,
      updateWorkspace,
    }}>
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