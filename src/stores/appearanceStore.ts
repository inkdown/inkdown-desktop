import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { ThemeMode, CustomTheme } from '../types/config';
import { useConfigStore } from './configStore';
import { cacheUtils } from '../utils/localStorage';

// Theme conversion utility to avoid code duplication
const createThemeConverter = () => (theme: any): CustomTheme => ({
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
});

// Centralized theme ID management to avoid race conditions
const getCustomThemeId = (): string | null => {
  if (typeof localStorage === 'undefined') return null;
  
  // Priority order: localStorage -> config -> current state
  const cachedId = localStorage.getItem("custom-theme-id");
  if (cachedId) return cachedId;
  
  const configStore = useConfigStore.getState();
  const configId = configStore.appearanceConfig?.["custom-theme"];
  return configId || null;
};

const setCustomThemeId = (themeId: string | null) => {
  if (typeof localStorage === 'undefined') return;
  
  if (themeId) {
    localStorage.setItem("custom-theme-id", themeId);
  } else {
    localStorage.removeItem("custom-theme-id");
  }
};

export interface AppearanceState {
  effectiveTheme: 'light' | 'dark';
  customThemes: CustomTheme[];
  currentCustomThemeId: string | null;
  customThemesLoading: boolean;
  
  // Media query
  mediaQuery: MediaQueryList | null;
  
  // Style update tracking
  lastStyleUpdate: number;
}

export interface AppearanceActions {
  setEffectiveTheme: (theme: 'light' | 'dark') => void;
  updateTheme: (theme: ThemeMode) => Promise<void>;
  applyCustomTheme: (themeId: string) => Promise<void>;
  removeCustomTheme: () => void;
  refreshCustomThemes: (forceRefresh?: boolean) => Promise<void>;
  
  applyThemeToDOM: (themeId: string, isCustom?: boolean) => void;
  updateDOMStyles: () => void;
  
  initialize: () => void;
  cleanup: () => void;
  applySavedTheme: () => Promise<void>;
  
  setupMediaQuery: () => void;
  handleMediaQueryChange: () => void;
}

export type AppearanceStore = AppearanceState & AppearanceActions;

export const useAppearanceStore = create<AppearanceStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    effectiveTheme: 'light',
    customThemes: [],
    currentCustomThemeId: getCustomThemeId(),
    customThemesLoading: false,
    mediaQuery: null,
    lastStyleUpdate: 0,

    setEffectiveTheme: (theme) => set({ effectiveTheme: theme }),

    updateTheme: async (theme) => {
      const configStore = useConfigStore.getState();
      
      set({ currentCustomThemeId: null });
      
      get().applyThemeToDOM(theme);
      
      await configStore.updateAppearanceConfig({ theme });
      
      setCustomThemeId(null);
      await configStore.updateAppearanceConfig({ "custom-theme": undefined });
    },

    applyCustomTheme: async (themeId) => {
      const { currentCustomThemeId } = get();
      if (currentCustomThemeId === themeId) return;


      try {
        const cssContent = await invoke<string>("get_theme_css", { themeId });
        
        // Remove existing custom theme styles
        const existingStyle = document.getElementById("custom-theme-style");
        if (existingStyle) {
          existingStyle.remove();
        }

        get().applyThemeToDOM(themeId, true);

        const style = document.createElement("style");
        style.id = "custom-theme-style";
        style.textContent = cssContent;
        document.head.appendChild(style);

        set({ currentCustomThemeId: themeId });
        
        setCustomThemeId(themeId);
        const configStore = useConfigStore.getState();
        await configStore.updateAppearanceConfig({ "custom-theme": themeId });
        
      } catch (err) {
        console.error('Failed to apply custom theme:', err);
        
        const parts = themeId.split('-');
        const mode = parts[parts.length - 1];
        
        if (['light', 'dark'].includes(mode)) {
          set({ currentCustomThemeId: null });
          get().applyThemeToDOM(mode as 'light' | 'dark');
          await get().updateTheme(mode as ThemeMode);
        }
        
        throw err; // Re-throw to let caller handle
      }
    },

    removeCustomTheme: () => {
      const { effectiveTheme } = get();
      
      set({ currentCustomThemeId: null });
      
      get().applyThemeToDOM(effectiveTheme);

      setCustomThemeId(null);
      const configStore = useConfigStore.getState();
      configStore.updateAppearanceConfig({ "custom-theme": undefined }).catch(console.error);
    },

    refreshCustomThemes: async (forceRefresh = false) => {
      const { customThemesLoading } = get();
      if (customThemesLoading) return;

      set({ customThemesLoading: true });

      try {
        let customThemes: CustomTheme[] = [];
        const cachedThemes = cacheUtils.getCustomThemes() || [];
        
        // Use extracted theme conversion utility
        const convertCommunityTheme = createThemeConverter();
        
        if (cachedThemes.length > 0) {
          customThemes = cachedThemes.map(theme => 
            theme.variants ? theme : convertCommunityTheme(theme)
          );
        }
        
        if (forceRefresh || customThemes.length === 0) {
          try {
            const rustThemes = await invoke<CustomTheme[]>("get_custom_themes");
            const communityThemes = cachedThemes.filter(theme => !theme.variants);
            const convertedCommunityThemes = communityThemes.map(convertCommunityTheme);
            
            customThemes = [...rustThemes, ...convertedCommunityThemes];
          } catch (err) {
            console.warn("Failed to load themes from Rust:", err);
            if (cachedThemes.length > 0) {
              customThemes = cachedThemes.map(theme => 
                theme.variants ? theme : convertCommunityTheme(theme)
              );
            }
          }
        }
        
        set({ customThemes, customThemesLoading: false });
      } catch (err) {
        console.error("Failed to load custom themes:", err);
        set({ customThemesLoading: false });
      }
    },

    // DOM manipulation
    applyThemeToDOM: (themeId, isCustom = false) => {
      if (typeof document === "undefined") return;

      const root = document.documentElement;
      const { mediaQuery } = get();

      root.className = root.className.replace(/theme-\w+/g, "");
      
      const existingStyle = document.getElementById("custom-theme-style");
      if (existingStyle) {
        existingStyle.remove();
      }
      
      root.removeAttribute("data-theme");

      if (isCustom) {
        root.setAttribute("data-theme", themeId);
      } else {
        const effectiveTheme =
          themeId === "auto"
            ? (mediaQuery?.matches ?? window.matchMedia("(prefers-color-scheme: dark)").matches)
              ? "dark"
              : "light"
            : themeId;
        
        root.setAttribute("data-theme", effectiveTheme);
        root.classList.add(`theme-${effectiveTheme}`);
        
        if (themeId !== "auto") {
          set({ effectiveTheme: effectiveTheme as 'light' | 'dark' });
        }
      }

    },

    updateDOMStyles: () => {
      if (typeof document === "undefined") return;
      
      const configStore = useConfigStore.getState();
      const { appearanceConfig } = configStore;
      if (!appearanceConfig) return;

      const root = document.documentElement;
      const fontSize = appearanceConfig["font-size"] || 14;
      const fontFamily = appearanceConfig["font-family"] || "Inter, system-ui, sans-serif";
      
      root.style.setProperty("--inkdown-editor-font-size", `${fontSize}px`);
      root.style.setProperty("--inkdown-ui-font-family", fontFamily);
      root.style.setProperty("--inkdown-editor-font-family", fontFamily);
      
      if (fontFamily.includes("Mono") || fontFamily.includes("monospace")) {
        root.style.setProperty("--inkdown-editor-mono-font-family", fontFamily);
      }

      set({ lastStyleUpdate: Date.now() });
    },

    setupMediaQuery: () => {
      if (typeof window === "undefined") return;
      
      try {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        set({ mediaQuery });
        
        const handleChange = () => get().handleMediaQueryChange();
        mediaQuery.addEventListener("change", handleChange);
        
        // Initial check
        get().handleMediaQueryChange();
        
        return () => mediaQuery.removeEventListener("change", handleChange);
      } catch {
        set({ mediaQuery: null });
      }
    },

    handleMediaQueryChange: () => {
      const { mediaQuery } = get();
      const configStore = useConfigStore.getState();
      const { appearanceConfig } = configStore;
      
      if (appearanceConfig?.theme === "auto" && mediaQuery) {
        const newTheme = mediaQuery.matches ? "dark" : "light";
        set({ effectiveTheme: newTheme });
        get().applyThemeToDOM("auto");
      }
    },

    // Theme event handlers
    handleThemeDownloaded: (event: CustomEvent) => {
      const { theme } = event.detail;
      const { customThemes } = get();
      
      const exists = customThemes.some(t => t.name === theme.name && t.author === theme.author);
      if (exists) return;
      
      const convertedTheme = createThemeConverter()(theme);
      
      set({ customThemes: [...customThemes, convertedTheme] });
    },

    handleThemeDeleted: (event: CustomEvent) => {
      const { theme } = event.detail;
      const { customThemes, currentCustomThemeId } = get();
      const themeKey = `${theme.author}-${theme.name}`;
      
      const updatedThemes = customThemes.filter(t => 
        `${t.author}-${t.name}` !== themeKey
      );
      set({ customThemes: updatedThemes });
      
      if (currentCustomThemeId && 
          updatedThemes.every(theme => 
            !theme.variants.some(variant => variant.id === currentCustomThemeId)
          )) {
        get().removeCustomTheme();
      }
    },

    // Initialization
    initialize: () => {
      const cleanup1 = get().setupMediaQuery();
      
      if (typeof window !== "undefined") {
        const downloadListener = (event: Event) => get().handleThemeDownloaded(event as CustomEvent);
        const deleteListener = (event: Event) => get().handleThemeDeleted(event as CustomEvent);
        
        window.addEventListener('inkdown-theme-downloaded', downloadListener);
        window.addEventListener('inkdown-theme-deleted', deleteListener);
        
        // Store cleanup functions
        (get() as any).cleanup = () => {
          cleanup1?.();
          window.removeEventListener('inkdown-theme-downloaded', downloadListener);
          window.removeEventListener('inkdown-theme-deleted', deleteListener);
        };
      }
      
      // applySavedTheme is now called manually from initializeStores to ensure proper async handling
    },

    applySavedTheme: async () => {
      // Use centralized theme ID management
      const savedThemeId = getCustomThemeId();
      
      
      if (!savedThemeId) {
        return;
      }
      
      
      try {
        await get().applyCustomTheme(savedThemeId);
        return;
      } catch (err) {
      }
      
      // Fallback: refresh custom themes and verify existence
      await get().refreshCustomThemes();
      
      const { customThemes: updatedCustomThemes } = get();
      
      
      // Find the theme among all custom themes
      const themeExists = updatedCustomThemes.some((theme) =>
        theme.variants.some((variant) => variant.id === savedThemeId),
      );


      if (themeExists) {
        try {
          await get().applyCustomTheme(savedThemeId);
        } catch (err) {
          console.error("Failed to apply saved theme after scan:", err);
          setCustomThemeId(null);
          await configStore.updateAppearanceConfig({ "custom-theme": undefined });
        }
      } else {
        console.warn(`Saved theme '${savedThemeId}' no longer exists`);
        get().removeCustomTheme();
      }
    },

    cleanup: () => {
      // Will be overridden in initialize
    },
  }))
);

export const useEffectiveTheme = () => useAppearanceStore((state) => state.effectiveTheme);
export const useCustomThemes = () => useAppearanceStore((state) => state.customThemes);
export const useCurrentCustomThemeId = () => useAppearanceStore((state) => state.currentCustomThemeId);
export const useCustomThemesLoading = () => useAppearanceStore((state) => state.customThemesLoading);