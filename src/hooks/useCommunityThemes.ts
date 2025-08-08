import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

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
  const [downloadingThemes, setDownloadingThemes] = useState<Set<string>>(new Set());
  const [downloadedThemes, setDownloadedThemes] = useState<Set<string>>(new Set());

  const searchThemes = useCallback(async (repoUrl: string) => {
    if (!repoUrl.trim()) {
      setError('URL do repositório é obrigatória');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await invoke<CommunityTheme[]>('search_community_themes', {
        repoUrl: repoUrl.trim()
      });
      
      setThemes(result);
    } catch (err) {
      setError(err as string);
      setThemes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadTheme = useCallback(async (theme: CommunityTheme) => {
    const themeKey = `${theme.repo}-${theme.name}`;
    
    setDownloadingThemes(prev => new Set(prev.add(themeKey)));
    
    try {
      await invoke('download_community_theme', {
        theme: {
          name: theme.name,
          author: theme.author,
          repo: theme.repo,
          screenshot: theme.screenshot,
          modes: theme.modes,
        }
      });
      
      // Adicionar aos temas baixados
      setDownloadedThemes(prev => new Set(prev.add(themeKey)));
    } catch (err) {
      console.error('Erro ao baixar tema:', err);
    } finally {
      setDownloadingThemes(prev => {
        const newSet = new Set(prev);
        newSet.delete(themeKey);
        return newSet;
      });
    }
  }, []);

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