import { useState, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  const [downloadedThemes, setDownloadedThemes] = useState<Set<string>>(
    new Set(),
  );

  // Cache for installed themes - loaded only when needed
  const installedThemesCache = useMemo(() => {
    let cache: Set<string> | null = null;

    return {
      async get(): Promise<Set<string>> {
        if (cache === null) {
          try {
            const installed = await invoke<string[]>(
              "get_installed_theme_names",
            );
            cache = new Set(installed);
          } catch (err) {
            console.warn("Failed to load installed themes:", err);
            cache = new Set();
          }
        }
        return cache;
      },

      invalidate() {
        cache = null;
      },

      add(themeName: string) {
        if (cache) {
          cache.add(themeName);
        }
      },
    };
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
        const [result, installedThemes] = await Promise.all([
          invoke<CommunityTheme[]>("search_community_themes", {
            repoUrl: repoUrl.trim(),
          }),
          installedThemesCache.get(),
        ]);

        // Mark already downloaded themes
        const alreadyDownloaded = new Set<string>();
        result.forEach((theme) => {
          const themeKey = `${theme.repo}-${theme.name}`;
          if (
            installedThemes.has(theme.name) ||
            installedThemes.has(themeKey)
          ) {
            alreadyDownloaded.add(themeKey);
          }
        });

        setDownloadedThemes((prev) => {
          const newSet = new Set(prev);
          alreadyDownloaded.forEach((key) => newSet.add(key));
          return newSet;
        });

        setThemes(result);
      } catch (err) {
        setError(err as string);
        setThemes([]);
      } finally {
        setLoading(false);
      }
    },
    [installedThemesCache],
  );

  const downloadTheme = useCallback(
    async (theme: CommunityTheme) => {
      const themeKey = `${theme.repo}-${theme.name}`;

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

        // Update both download state and cache
        setDownloadedThemes((prev) => new Set(prev.add(themeKey)));
        installedThemesCache.add(theme.name);
        installedThemesCache.add(themeKey);
      } catch (err) {
        console.error("Erro ao baixar tema:", err);
      } finally {
        setDownloadingThemes((prev) => {
          const newSet = new Set(prev);
          newSet.delete(themeKey);
          return newSet;
        });
      }
    },
    [installedThemesCache],
  );

  const clearThemes = useCallback(() => {
    setThemes([]);
    setError(null);
  }, []);

  return {
    themes,
    loading,
    error,
    downloadingThemes,
    downloadedThemes,
    searchThemes,
    downloadTheme,
    clearThemes,
  };
}
