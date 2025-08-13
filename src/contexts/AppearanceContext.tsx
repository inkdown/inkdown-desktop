import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { useConfigManager } from "../hooks/useConfigManager";
import { ThemeMode, CustomTheme } from "../types/config";
import { cacheUtils } from "../utils/localStorage";

interface AppearanceState {
  themeMode: ThemeMode;
  fontSize: number;
  fontFamily: string;
  vimMode: boolean;
  showLineNumbers: boolean;
  highlightCurrentLine: boolean;
  readOnly: boolean;
  githubMarkdown: boolean;
  pasteUrlsAsLinks: boolean;
  effectiveTheme: "light" | "dark";
  customThemes: CustomTheme[];
  currentCustomThemeId: string | null;
  customThemesLoading: boolean;
}

type AppearanceAction =
  | { type: "SET_THEME_MODE"; payload: ThemeMode }
  | { type: "SET_FONT_SIZE"; payload: number }
  | { type: "SET_FONT_FAMILY"; payload: string }
  | { type: "SET_VIM_MODE"; payload: boolean }
  | { type: "SET_LINE_NUMBERS"; payload: boolean }
  | { type: "SET_HIGHLIGHT_LINE"; payload: boolean }
  | { type: "SET_READ_ONLY"; payload: boolean }
  | { type: "SET_GITHUB_MARKDOWN"; payload: boolean }
  | { type: "SET_PASTE_URLS_AS_LINKS"; payload: boolean }
  | { type: "SET_EFFECTIVE_THEME"; payload: "light" | "dark" }
  | { type: "SET_CUSTOM_THEMES"; payload: CustomTheme[] }
  | { type: "SET_CUSTOM_THEME_LOADING"; payload: boolean }
  | { type: "SET_CURRENT_CUSTOM_THEME"; payload: string | null }
  | { type: "SYNC_FROM_CONFIG"; payload: Partial<AppearanceState> };

const initialState: AppearanceState = {
  themeMode: "light",
  fontSize: 14,
  fontFamily: "Inter, system-ui, sans-serif",
  vimMode: false,
  showLineNumbers: true,
  highlightCurrentLine: true,
  readOnly: false,
  githubMarkdown: false,
  pasteUrlsAsLinks: true,
  effectiveTheme: "light",
  customThemes: [],
  currentCustomThemeId: null,
  customThemesLoading: false,
};

function appearanceReducer(
  state: AppearanceState,
  action: AppearanceAction,
): AppearanceState {
  switch (action.type) {
    case "SET_THEME_MODE":
      return { ...state, themeMode: action.payload };
    case "SET_FONT_SIZE":
      return { ...state, fontSize: action.payload };
    case "SET_FONT_FAMILY":
      return { ...state, fontFamily: action.payload };
    case "SET_VIM_MODE":
      return { ...state, vimMode: action.payload };
    case "SET_LINE_NUMBERS":
      return { ...state, showLineNumbers: action.payload };
    case "SET_HIGHLIGHT_LINE":
      return { ...state, highlightCurrentLine: action.payload };
    case "SET_READ_ONLY":
      return { ...state, readOnly: action.payload };
    case "SET_GITHUB_MARKDOWN":
      return { ...state, githubMarkdown: action.payload };
    case "SET_PASTE_URLS_AS_LINKS":
      return { ...state, pasteUrlsAsLinks: action.payload };
    case "SET_EFFECTIVE_THEME":
      return { ...state, effectiveTheme: action.payload };
    case "SET_CUSTOM_THEMES":
      return { ...state, customThemes: action.payload };
    case "SET_CUSTOM_THEME_LOADING":
      return { ...state, customThemesLoading: action.payload };
    case "SET_CURRENT_CUSTOM_THEME":
      return { ...state, currentCustomThemeId: action.payload };
    case "SYNC_FROM_CONFIG":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

interface AppearanceContextType extends AppearanceState {
  isLoading: boolean;
  updateAppearance: (updates: {
    theme?: ThemeMode;
    fontSize?: number;
    fontFamily?: string;
  }) => Promise<void>;
  updateWorkspace: (updates: {
    vimMode?: boolean;
    showLineNumbers?: boolean;
    highlightCurrentLine?: boolean;
    readOnly?: boolean;
    githubMarkdown?: boolean;
    pasteUrlsAsLinks?: boolean;
  }) => Promise<void>;
  refreshCustomThemes: () => Promise<void>;
  applyCustomTheme: (themeId: string) => Promise<void>;
  removeCustomTheme: () => void;
  applyTheme: (themeId: string) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(
  undefined,
);

interface AppearanceProviderProps {
  children: ReactNode;
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const {
    appearanceConfig,
    workspaceConfig,
    updateAppearanceConfig,
    updateWorkspaceConfig,
    isLoading,
  } = useConfigManager();
  const [state, dispatch] = useReducer(appearanceReducer, initialState);
  const themeAppliedRef = useRef<string | null>(null);

  const applyThemeToDOM = useCallback(
    (themeId: string, isCustom: boolean = false) => {
      if (typeof document === "undefined") return;

      const root = document.documentElement;

      root.className = root.className.replace(/theme-\w+/g, "");
      const existingStyle = document.getElementById("custom-theme-style");
      if (existingStyle) existingStyle.remove();

      if (isCustom) {
        root.setAttribute("data-theme", themeId);
      } else {
        const effectiveTheme =
          themeId === "auto"
            ? window.matchMedia("(prefers-color-scheme: dark)").matches
              ? "dark"
              : "light"
            : themeId;
        root.setAttribute("data-theme", effectiveTheme);
        root.classList.add(`theme-${effectiveTheme}`);
      }
    },
    [],
  );

  useEffect(() => {
    if (appearanceConfig || workspaceConfig) {
      const combinedConfig = {
        themeMode: appearanceConfig?.theme || "light",
        fontSize: appearanceConfig?.["font-size"] || 14,
        fontFamily:
          appearanceConfig?.["font-family"] || "Inter, system-ui, sans-serif",
        vimMode: workspaceConfig?.vimMode || false,
        showLineNumbers: workspaceConfig?.showLineNumbers !== false,
        highlightCurrentLine: workspaceConfig?.highlightCurrentLine !== false,
        readOnly: workspaceConfig?.readOnly || false,
        githubMarkdown: workspaceConfig?.githubMarkdown || false,
        pasteUrlsAsLinks: workspaceConfig?.pasteUrlsAsLinks !== false,
      };

      dispatch({
        type: "SYNC_FROM_CONFIG",
        payload: combinedConfig,
      });

      if (appearanceConfig?.["custom-theme"]) {
        dispatch({
          type: "SET_CURRENT_CUSTOM_THEME",
          payload: appearanceConfig["custom-theme"],
        });
      }
    }
  }, [appearanceConfig, workspaceConfig]);

  useEffect(() => {
    const calculateTheme = () => {
      if (state.themeMode === "auto") {
        try {
          const prefersDark = window.matchMedia?.(
            "(prefers-color-scheme: dark)",
          ).matches;
          return prefersDark ? "dark" : "light";
        } catch {
          return "light";
        }
      }
      return state.themeMode as "light" | "dark";
    };

    const newTheme = calculateTheme();
    if (newTheme !== state.effectiveTheme) {
      dispatch({ type: "SET_EFFECTIVE_THEME", payload: newTheme });
    }

    if (state.themeMode === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const theme = mediaQuery.matches ? "dark" : "light";
        dispatch({ type: "SET_EFFECTIVE_THEME", payload: theme });
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [state.themeMode, state.effectiveTheme]);

  const applyStylesRef = useRef<number>();

  const previousStylesRef = useRef({
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    effectiveTheme: state.effectiveTheme,
    customThemeId: state.currentCustomThemeId,
  });
  
  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const current = {
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      effectiveTheme: state.effectiveTheme,
      customThemeId: state.currentCustomThemeId,
    };
    
    const hasChanged = Object.keys(current).some(
      key => current[key as keyof typeof current] !== previousStylesRef.current[key as keyof typeof current]
    );
    
    if (!hasChanged) return;

    if (applyStylesRef.current) {
      cancelAnimationFrame(applyStylesRef.current);
    }
    
    applyStylesRef.current = requestAnimationFrame(() => {
      const root = document.documentElement;
      
      if (previousStylesRef.current.fontSize !== current.fontSize) {
        root.style.setProperty("--inkdown-editor-font-size", `${current.fontSize}px`);
      }
      
      if (previousStylesRef.current.fontFamily !== current.fontFamily) {
        root.style.setProperty("--inkdown-editor-font-family", current.fontFamily);
        
        if (current.fontFamily.includes("Mono") || current.fontFamily.includes("monospace")) {
          root.style.setProperty("--inkdown-editor-mono-font-family", current.fontFamily);
        }
      }

      if (!current.customThemeId && 
          (previousStylesRef.current.effectiveTheme !== current.effectiveTheme || 
           previousStylesRef.current.customThemeId !== current.customThemeId)) {
        applyThemeToDOM(current.effectiveTheme);
      }
      
      previousStylesRef.current = current;
    });
  }, [state.effectiveTheme, state.fontSize, state.fontFamily, state.currentCustomThemeId, applyThemeToDOM]);

  useEffect(() => {
    if (typeof window === "undefined" || isLoading) return;
    window.dispatchEvent(
      new CustomEvent("inkdown-config-change", {
        detail: { appearance: appearanceConfig, workspace: workspaceConfig },
      }),
    );
  }, [appearanceConfig, workspaceConfig, isLoading]);

  const customThemesRef = useRef(state.customThemes);
  customThemesRef.current = state.customThemes; 

  const handleThemeDownloaded = useCallback((event: CustomEvent) => {
    const { theme } = event.detail;
    
    const exists = customThemesRef.current.some(t => t.name === theme.name && t.author === theme.author);
    if (exists) return;
    
    const convertedTheme: CustomTheme = {
      name: theme.name,
      author: theme.author,
      description: `Tema ${theme.name} criado por ${theme.author}`,
      version: "1.0.0",
      homepage: theme.repo ? `https://github.com/${theme.repo}` : undefined,
      variants: (theme.modes || []).map((mode: any) => ({
        id: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-${mode}`,
        name: `${theme.name} ${mode}`,
        mode: mode,
        cssFile: `${mode.toLowerCase()}.css`
      }))
    };
    
    const updatedThemes = [...customThemesRef.current, convertedTheme];
    dispatch({ type: "SET_CUSTOM_THEMES", payload: updatedThemes });
  }, []);

  const removeCustomTheme = useCallback(() => {
    dispatch({ type: "SET_CURRENT_CUSTOM_THEME", payload: null });
    applyThemeToDOM(state.effectiveTheme);

    localStorage.removeItem("custom-theme-id");
    updateAppearanceConfig({ "custom-theme": undefined }).catch(console.error);
  }, [state.effectiveTheme, applyThemeToDOM, updateAppearanceConfig]);

  const handleThemeDeleted = useCallback((event: CustomEvent) => {
    const { theme } = event.detail;
    const themeKey = `${theme.author}-${theme.name}`;
    
    const updatedThemes = customThemesRef.current.filter(t => 
      `${t.author}-${t.name}` !== themeKey
    );
    dispatch({ type: "SET_CUSTOM_THEMES", payload: updatedThemes });
    
    if (state.currentCustomThemeId && 
        updatedThemes.every(theme => 
          !theme.variants.some(variant => variant.id === state.currentCustomThemeId)
        )) {
      removeCustomTheme();
    }
  }, [state.currentCustomThemeId, removeCustomTheme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const downloadListener = (event: Event) => handleThemeDownloaded(event as CustomEvent);
    const deleteListener = (event: Event) => handleThemeDeleted(event as CustomEvent);
    
    window.addEventListener('inkdown-theme-downloaded', downloadListener);
    window.addEventListener('inkdown-theme-deleted', deleteListener);
    
    return () => {
      window.removeEventListener('inkdown-theme-downloaded', downloadListener);
      window.removeEventListener('inkdown-theme-deleted', deleteListener);
    };
  }, [handleThemeDownloaded, handleThemeDeleted]); 


  const updateAppearance = useCallback(
    async (updates: {
      theme?: ThemeMode;
      fontSize?: number;
      fontFamily?: string;
    }) => {
      if (updates.theme !== undefined) {
        dispatch({ type: "SET_THEME_MODE", payload: updates.theme });
        dispatch({ type: "SET_CURRENT_CUSTOM_THEME", payload: null });
        applyThemeToDOM(updates.theme);
      }
      if (updates.fontSize !== undefined)
        dispatch({ type: "SET_FONT_SIZE", payload: updates.fontSize });
      if (updates.fontFamily !== undefined)
        dispatch({ type: "SET_FONT_FAMILY", payload: updates.fontFamily });

      const configUpdates: any = {};
      if (updates.theme !== undefined) configUpdates.theme = updates.theme;
      if (updates.fontSize !== undefined)
        configUpdates["font-size"] = updates.fontSize;
      if (updates.fontFamily !== undefined)
        configUpdates["font-family"] = updates.fontFamily;

      if (Object.keys(configUpdates).length > 0) {
        try {
          await updateAppearanceConfig(configUpdates);
        } catch (error) {
          console.error("Failed to save appearance config:", error);
        }
      }

      if (updates.theme !== undefined) {
        localStorage.removeItem("custom-theme-id");
        updateAppearanceConfig({ "custom-theme": undefined }).catch(
          console.error,
        );
      }
    },
    [updateAppearanceConfig, applyThemeToDOM],
  );

  const updateWorkspace = useCallback(
    async (updates: {
      vimMode?: boolean;
      showLineNumbers?: boolean;
      highlightCurrentLine?: boolean;
      readOnly?: boolean;
      githubMarkdown?: boolean;
      pasteUrlsAsLinks?: boolean;
    }) => {
      if (updates.vimMode !== undefined)
        dispatch({ type: "SET_VIM_MODE", payload: updates.vimMode });
      if (updates.showLineNumbers !== undefined)
        dispatch({
          type: "SET_LINE_NUMBERS",
          payload: updates.showLineNumbers,
        });
      if (updates.highlightCurrentLine !== undefined)
        dispatch({
          type: "SET_HIGHLIGHT_LINE",
          payload: updates.highlightCurrentLine,
        });
      if (updates.readOnly !== undefined)
        dispatch({ type: "SET_READ_ONLY", payload: updates.readOnly });
      if (updates.githubMarkdown !== undefined)
        dispatch({ type: "SET_GITHUB_MARKDOWN", payload: updates.githubMarkdown });
      if (updates.pasteUrlsAsLinks !== undefined)
        dispatch({ type: "SET_PASTE_URLS_AS_LINKS", payload: updates.pasteUrlsAsLinks });

      try {
        await updateWorkspaceConfig(updates);
      } catch (error) {
        console.error("Failed to save workspace config:", error);
      }
    },
    [updateWorkspaceConfig],
  );

  const convertCommunityThemeToCustomTheme = useCallback((theme: any): CustomTheme => ({
    name: theme.name,
    author: theme.author,
    description: `Tema ${theme.name} criado por ${theme.author}`,
    version: "1.0.0",
    homepage: theme.repo ? `https://github.com/${theme.repo}` : undefined,
    variants: (theme.modes || []).map((mode: any) => ({
      id: `${theme.name.toLowerCase().replace(/\s+/g, '-')}-${mode}`,
      name: `${theme.name} ${mode}`,
      mode: mode,
      cssFile: `${mode.toLowerCase()}.css`
    }))
  }), []);

  const refreshCustomThemes = useCallback(async (forceRefresh = false) => {
    if (state.customThemesLoading) return;

    dispatch({ type: "SET_CUSTOM_THEME_LOADING", payload: true });

    try {
      let customThemes: CustomTheme[] = [];
      const cachedThemes = cacheUtils.getCustomThemes() || [];
      
      if (cachedThemes.length > 0) {
        customThemes = cachedThemes.map(theme => 
          theme.variants ? theme : convertCommunityThemeToCustomTheme(theme)
        );
      }
      
      if (forceRefresh || customThemes.length === 0) {
        try {
          const rustThemes = await invoke<CustomTheme[]>("get_custom_themes");
          const communityThemes = cachedThemes.filter(theme => !theme.variants);
          const convertedCommunityThemes = communityThemes.map(convertCommunityThemeToCustomTheme);
          
          customThemes = [...rustThemes, ...convertedCommunityThemes];
        } catch (err) {
          console.warn("Failed to load themes from Rust:", err);
          if (cachedThemes.length > 0) {
            customThemes = cachedThemes.map(theme => 
              theme.variants ? theme : convertCommunityThemeToCustomTheme(theme)
            );
          }
        }
      }
      
      dispatch({ type: "SET_CUSTOM_THEMES", payload: customThemes });
    } catch (err) {
      console.error("Failed to load custom themes:", err);
    } finally {
      dispatch({ type: "SET_CUSTOM_THEME_LOADING", payload: false });
    }
  }, [state.customThemesLoading, convertCommunityThemeToCustomTheme]);


  const applyCustomTheme = useCallback(
    async (themeId: string) => {
      if (state.currentCustomThemeId === themeId) return;

      try {
        const cssContent = await invoke<string>("get_theme_css", { themeId });

        applyThemeToDOM(themeId, true);

        const style = document.createElement("style");
        style.id = "custom-theme-style";
        style.textContent = cssContent;
        document.head.appendChild(style);

        dispatch({ type: "SET_CURRENT_CUSTOM_THEME", payload: themeId });

        localStorage.setItem("custom-theme-id", themeId);
        updateAppearanceConfig({ "custom-theme": themeId }).catch(
          console.error,
        );
      } catch (err) {
        // Se falhar, aplicar tema nativo baseado no modo extraído
        const parts = themeId.split('-');
        const mode = parts[parts.length - 1];
        
        if (['light', 'dark'].includes(mode)) {
          dispatch({ type: "SET_CURRENT_CUSTOM_THEME", payload: null });
          applyThemeToDOM(mode as "light" | "dark");
          await updateAppearance({ theme: mode as ThemeMode });
        }
      }
    },
    [state.currentCustomThemeId, applyThemeToDOM, updateAppearanceConfig, updateAppearance],
  );

  const applyTheme = useCallback(
    async (themeId: string) => {
      if (["light", "dark", "auto"].includes(themeId)) {
        await updateAppearance({ theme: themeId as ThemeMode });
      } else {
        await applyCustomTheme(themeId);
      }
    },
    [updateAppearance, applyCustomTheme],
  );

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
      const savedThemeId =
        state.currentCustomThemeId || appearanceConfig?.["custom-theme"];

      if (!savedThemeId || themeAppliedRef.current === savedThemeId) {
        return;
      }

      if (state.customThemes.length > 0) {
        const themeExists = state.customThemes.some((theme) =>
          theme.variants.some((variant) => variant.id === savedThemeId),
        );

        if (themeExists) {
          try {
            await applyCustomTheme(savedThemeId);
            themeAppliedRef.current = savedThemeId;
          } catch (err) {
            console.error("Failed to apply saved theme:", err);
          }
        } else {
          console.warn(`Saved theme '${savedThemeId}' no longer exists`);
          localStorage.removeItem("custom-theme-id");
          updateAppearanceConfig({ "custom-theme": undefined }).catch(
            console.error,
          );
          dispatch({ type: "SET_CURRENT_CUSTOM_THEME", payload: null });
        }
      }
    };

    if (state.customThemes.length > 0 && !isLoading) {
      applySavedTheme();
    }
  }, [
    state.customThemes.length,
    state.currentCustomThemeId,
    appearanceConfig?.["custom-theme"],
    isLoading,
    applyCustomTheme,
    updateAppearanceConfig,
  ]);

  const contextValue = useMemo(
    () => ({
      ...state,
      isLoading,
      updateAppearance,
      updateWorkspace,
      refreshCustomThemes,
      applyCustomTheme,
      removeCustomTheme,
      applyTheme,
    }),
    [
      state,
      isLoading,
      updateAppearance,
      updateWorkspace,
      refreshCustomThemes,
      applyCustomTheme,
      removeCustomTheme,
      applyTheme,
    ],
  );

  return (
    <AppearanceContext.Provider value={contextValue}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error(
      "useAppearance deve ser usado dentro de um AppearanceProvider",
    );
  }
  return context;
}
