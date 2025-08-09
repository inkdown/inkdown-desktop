import { useState, useCallback, useMemo } from "react";
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
  searchThemes: (repoUrl: string) => Promise<void>;
  downloadTheme: (theme: CommunityTheme) => Promise<void>;
  clearThemes: () => void;
}

export function useCommunityThemes(): UseCommunityThemesResult {
  const [themes, setThemes] = useState<CommunityTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingThemes, setDownloadingThemes] = useState<Set<string>>(
    new Set(),
  );
  
  const [downloadedThemes, setDownloadedThemes] = useState<Set<string>>(() => {
    const cached = cacheUtils.getCustomThemes() || [];
    return new Set(cached.map(theme => `${theme.author}-${theme.name}`));
  });

  // Cache para evitar recalcular downloaded themes keys
  const getDownloadedKeys = useCallback(() => {
    const cached = cacheUtils.getCustomThemes() || [];
    return new Set(cached.map(t => `${t.author}-${t.name}`));
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

        // Use cached downloaded keys para evitar recomputação
        const cachedThemeKeys = getDownloadedKeys();

        // Mark already downloaded themes - otimizado para menos alocações
        const alreadyDownloaded = new Set<string>();
        for (const theme of result) {
          const themeKey = `${theme.author}-${theme.name}`;
          if (cachedThemeKeys.has(themeKey)) {
            alreadyDownloaded.add(themeKey);
          }
        }

        setDownloadedThemes(alreadyDownloaded);
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
        
        // Persist downloaded theme in localStorage - otimizado
        const currentThemes = cacheUtils.getCustomThemes() || [];
        // Evita duplicatas no cache
        const exists = currentThemes.some(t => `${t.author}-${t.name}` === themeKey);
        if (!exists) {
          const updatedThemes = [...currentThemes, theme];
          cacheUtils.setCustomThemes(updatedThemes);
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
    searchThemes,
    downloadTheme,
    clearThemes,
  }), [
    themes,
    loading, 
    error,
    downloadingThemes,
    downloadedThemes,
    searchThemes,
    downloadTheme,
    clearThemes
  ]);
}
