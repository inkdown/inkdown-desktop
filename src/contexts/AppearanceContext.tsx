import { createContext, useContext, useState, ReactNode, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { AppearanceConfig } from '../types/config';

interface AppearanceContextType {
  config: AppearanceConfig | null;
  updateConfig: (config: AppearanceConfig) => Promise<void>;
  loadConfig: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

interface AppearanceProviderProps {
  children: ReactNode;
}

export function AppearanceProvider({ children }: AppearanceProviderProps) {
  const [config, setConfig] = useState<AppearanceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const loadConfig = async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setIsLoading(true);

    try {
      const configStr = await invoke<string>('load_appearance_config');
      setConfig(JSON.parse(configStr) as AppearanceConfig);
    } catch (err) {
      setError('Erro ao carregar configurações de aparência');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: AppearanceConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await invoke('save_appearance_config', { config: JSON.stringify(newConfig) });
      setConfig(newConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppearanceContext.Provider value={{
      config,
      updateConfig,
      loadConfig,
      isLoading,
      error
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