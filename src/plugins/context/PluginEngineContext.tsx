import React, { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { pluginManager } from '../../services/PluginManager';
import { cacheUtils } from '../../utils/localStorage';
import type { LoadedPlugin } from '../types/plugin';

interface PluginEngineContextType {
  plugins: ReadonlyMap<string, LoadedPlugin>;
  loading: boolean;
  error: string | null;
  enablePlugin: (pluginId: string) => Promise<boolean>;
  disablePlugin: (pluginId: string) => Promise<boolean>;
  refreshPlugins: () => Promise<void>;
  forceScanPlugins: () => Promise<void>;
  executeShortcut: (shortcut: string, event: KeyboardEvent) => Promise<boolean>;
}

export const PluginEngineContext = createContext<PluginEngineContextType | null>(null);

interface PluginEngineProviderProps {
  children: React.ReactNode;
  appState?: any;
  editorInstance?: any;
  pluginsDirectory?: string;
}

export function PluginEngineProvider({ 
  children
}: PluginEngineProviderProps) {
  const [state, setState] = useState(() => pluginManager.getState());

  useEffect(() => {
    const unsubscribe = pluginManager.subscribeToState((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const refreshPlugins = useCallback(async () => {
    await pluginManager.scanPlugins();
  }, []);

  const forceScanPlugins = useCallback(async () => {
    console.log(`🔍 [PluginEngineContext] Force scanning plugins...`);
    await pluginManager.scanPlugins();
  }, []);

  useEffect(() => {
    const enabledPlugins = cacheUtils.getEnabledPlugins();
    if (enabledPlugins.length > 0) {
      console.log(`🔍 [PluginEngineContext] Found ${enabledPlugins.length} enabled plugins in cache, scanning...`);
      refreshPlugins();
    } else {
      console.log(`⏭️ [PluginEngineContext] No enabled plugins in cache, skipping scan`);
    }
  }, [refreshPlugins]);

  const enablePlugin = useCallback(async (pluginId: string) => {
    return await pluginManager.enablePlugin(pluginId);
  }, []);

  const disablePlugin = useCallback(async (pluginId: string) => {
    return await pluginManager.disablePlugin(pluginId);
  }, []);


  const contextValue = useMemo(() => ({
    plugins: new Map(state.plugins) as ReadonlyMap<string, LoadedPlugin>,
    loading: state.loading,
    error: state.lastError || null,
    enablePlugin,
    disablePlugin,
    refreshPlugins,
    forceScanPlugins,
    executeShortcut: async (shortcut: string, event: KeyboardEvent) => {
      return await pluginManager.executeShortcut(shortcut, event);
    }
  }), [state, enablePlugin, disablePlugin, refreshPlugins, forceScanPlugins]);

  return (
    <PluginEngineContext.Provider value={contextValue}>
      {children}
    </PluginEngineContext.Provider>
  );
}

export function usePluginEngineContext(): PluginEngineContextType {
  const context = useContext(PluginEngineContext);
  if (!context) {
    throw new Error('usePluginEngineContext must be used within a PluginEngineProvider');
  }
  return context;
}