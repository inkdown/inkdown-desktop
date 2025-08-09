import { useState, useCallback, useMemo } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { cacheManager } from "../utils/localStorage";

export interface UpdateInfo {
  version: string;
  date?: string;
  body?: string;
}

export interface UseUpdaterResult {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  isChecking: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  error: string | null;
  checkForUpdates: (force?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  dismissUpdate: () => void;
  autoCheck: () => void;
}

const UPDATE_CHECK_CACHE_KEY = 'lastUpdateCheck';
const UPDATE_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas

export function useUpdater(): UseUpdaterResult {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Update | null>(null);

  // Cache para evitar verificações muito frequentes
  const shouldCheckForUpdates = useCallback(() => {
    const lastCheck = cacheManager.get<number>(UPDATE_CHECK_CACHE_KEY);
    if (!lastCheck) return true;
    return Date.now() - lastCheck > UPDATE_CHECK_INTERVAL;
  }, []);

  const checkForUpdates = useCallback(async (force = false) => {
    if (!force && !shouldCheckForUpdates()) {
      return;
    }

    setIsChecking(true);
    setError(null);

    try {
      const update = await check();
      
      // Cache timestamp da verificação
      cacheManager.set(UPDATE_CHECK_CACHE_KEY, Date.now());

      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          date: update.date,
          body: update.body,
        });
        setPendingUpdate(update);
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
        setPendingUpdate(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Erro ao verificar atualizações: ${errorMessage}`);
      console.error('Update check failed:', err);
    } finally {
      setIsChecking(false);
    }
  }, [shouldCheckForUpdates]);

  const downloadAndInstall = useCallback(async () => {
    if (!pendingUpdate) {
      setError('Nenhuma atualização pendente encontrada');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      // Download com progress tracking
      await pendingUpdate.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            contentLength = event.data.contentLength || 0;
            setDownloadProgress(0);
            break;
          case 'Progress':
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              const progress = Math.round((downloaded / contentLength) * 100);
              setDownloadProgress(progress);
            }
            break;
          case 'Finished':
            setDownloadProgress(100);
            break;
        }
      });

      // Reinicia a aplicação após instalação
      await relaunch();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Erro ao baixar/instalar atualização: ${errorMessage}`);
      console.error('Update download/install failed:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [pendingUpdate]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    setUpdateInfo(null);
    setPendingUpdate(null);
    setError(null);
  }, []);

  // Auto-check na inicialização se necessário
  const autoCheck = useCallback(() => {
    if (shouldCheckForUpdates()) {
      checkForUpdates();
    }
  }, [checkForUpdates, shouldCheckForUpdates]);

  return useMemo(() => ({
    updateAvailable,
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    autoCheck,
  }), [
    updateAvailable,
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
    dismissUpdate,
    autoCheck,
  ]);
}