import { useState, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { cacheUtils } from "../utils/localStorage";

export interface CommunityTheme {
  name: string;
  author: string;
  repo: string;
  screenshot: string;
  modes: string[];
  screenshot_data?: string;
}

export interface UseCommunityThemesResult {
  themes: CommunityTheme[];
  loading: boolean;
  error: string | null;
  downloadingThemes: Set<string>;
  downloadedThemes: Set<string>;
  deletingThemes: Set<string>;
  searchThemes: (repoUrl: string) => Promise<void>;
  downloadTheme: (theme: CommunityTheme) => Promise<void>;
  deleteTheme: (theme: CommunityTheme) => Promise<void>;
  clearThemes: () => void;
}

export function useCommunityThemes(): UseCommunityThemesResult {
  const [themes, setThemes] = useState<CommunityTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingThemes, setDownloadingThemes] = useState<Set<string>>(
    new Set(),
  );
  
  const [deletingThemes, setDeletingThemes] = useState<Set<string>>(
    new Set(),
  );
  
  const [downloadedThemes, setDownloadedThemes] = useState<Set<string>>(() => {
    const cached = cacheUtils.getCustomThemes() || [];
    return new Set(cached.map(theme => `${theme.author}-${theme.name}`));
  });

  // Cache otimizado com memoização
  const downloadedKeysRef = useRef<Set<string>>(new Set());
  const getDownloadedKeys = useCallback(() => {
    const cached = cacheUtils.getCustomThemes() || [];
    const keys = new Set(cached.map(t => `${t.author}-${t.name}`));
    downloadedKeysRef.current = keys;
    return keys;
  }, []);


  const searchThemes = useCallback(
    async (repoUrl: string) => {
      if (!repoUrl.trim()) {
        setError("URL do repositório é obrigatória");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await invoke<CommunityTheme[]>("search_community_themes", {
          repoUrl: repoUrl.trim(),
        });

        // Use cached downloaded keys com memoização otimizada
        const cachedThemeKeys = getDownloadedKeys();

        // Atualizar state apenas se houver mudanças
        const newDownloadedThemes = new Set<string>();
        result.forEach(theme => {
          const themeKey = `${theme.author}-${theme.name}`;
          if (cachedThemeKeys.has(themeKey)) {
            newDownloadedThemes.add(themeKey);
          }
        });

        // Apenas atualizar se different do state atual
        setDownloadedThemes(prev => {
          if (prev.size === newDownloadedThemes.size && 
              [...prev].every(key => newDownloadedThemes.has(key))) {
            return prev; // Evitar re-render desnecessário
          }
          return newDownloadedThemes;
        });
        setThemes(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        setThemes([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const downloadTheme = useCallback(
    async (theme: CommunityTheme) => {
      const themeKey = `${theme.author}-${theme.name}`;

      setDownloadingThemes((prev) => new Set(prev.add(themeKey)));

      try {
        await invoke("download_community_theme", {
          theme: {
            name: theme.name,
            author: theme.author,
            repo: theme.repo,
            screenshot: theme.screenshot,
            modes: theme.modes,
          },
        });

        // Update download state de forma otimizada
        setDownloadedThemes((prev) => {
          if (prev.has(themeKey)) return prev; // Evita recriação desnecessária
          const newSet = new Set(prev);
          newSet.add(themeKey);
          return newSet;
        });

        // Persist downloaded theme in localStorage sem screenshot_data
        const currentThemes = cacheUtils.getCustomThemes() || [];
        const exists = currentThemes.some(t => `${t.author}-${t.name}` === themeKey);
        if (!exists) {
          const { screenshot_data, ...themeWithoutScreenshot } = theme;
          const updatedThemes = [...currentThemes, themeWithoutScreenshot];
          cacheUtils.setCustomThemes(updatedThemes);
          
          // Emitir evento para notificar AppearanceContext
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('inkdown-theme-downloaded', {
              detail: { theme: themeWithoutScreenshot }
            }));
          }
        }
      } catch (err) {
        console.error("Erro ao baixar tema:", err);
      } finally {
        setDownloadingThemes((prev) => {
          if (!prev.has(themeKey)) return prev; // Evita recriação desnecessária
          const newSet = new Set(prev);
          newSet.delete(themeKey);
          return newSet;
        });
      }
    },
    [],
  );

  const deleteTheme = useCallback(
    async (theme: CommunityTheme) => {
      const themeKey = `${theme.author}-${theme.name}`;

      setDeletingThemes((prev) => new Set(prev.add(themeKey)));

      try {
        await invoke("delete_community_theme", {
          themeName: theme.name,
          themeAuthor: theme.author,
        });

        // Update download state de forma otimizada
        setDownloadedThemes((prev) => {
          if (!prev.has(themeKey)) return prev; // Evita recriação desnecessária
          const newSet = new Set(prev);
          newSet.delete(themeKey);
          return newSet;
        });

        // Remove from localStorage cache
        const currentThemes = cacheUtils.getCustomThemes() || [];
        const updatedThemes = currentThemes.filter(t => `${t.author}-${t.name}` !== themeKey);
        cacheUtils.setCustomThemes(updatedThemes);
        
        // Emitir evento para notificar AppearanceContext
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('inkdown-theme-deleted', {
            detail: { theme: { name: theme.name, author: theme.author } }
          }));
        }
      } catch (err) {
        console.error("Erro ao deletar tema:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setDeletingThemes((prev) => {
          if (!prev.has(themeKey)) return prev; // Evita recriação desnecessária
          const newSet = new Set(prev);
          newSet.delete(themeKey);
          return newSet;
        });
      }
    },
    [],
  );

  const clearThemes = useCallback(() => {
    setThemes([]);
    setError(null);
  }, []);

  return useMemo(() => ({
    themes,
    loading,
    error,
    downloadingThemes,
    downloadedThemes,
    deletingThemes,
    searchThemes,
    downloadTheme,
    deleteTheme,
    clearThemes,
  }), [
    themes,
    loading, 
    error,
    downloadingThemes,
    downloadedThemes,
    deletingThemes,
    searchThemes,
    downloadTheme,
    deleteTheme,
    clearThemes
  ]);
}
