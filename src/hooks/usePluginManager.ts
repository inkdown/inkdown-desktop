import { useState, useEffect, useCallback } from 'react';
import { LoadedPlugin } from '../types/plugins';
import { pluginManager } from '../services/pluginManager';

export function usePluginManager() {
  const [plugins, setPlugins] = useState<LoadedPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await pluginManager.refreshPlugins();
      setPlugins(pluginManager.getAllPlugins());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh plugins');
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePlugin = useCallback(async (pluginId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await pluginManager.enablePlugin(pluginId);
      } else {
        await pluginManager.disablePlugin(pluginId);
      }
      
      // Update local state
      setPlugins(current => 
        current.map(plugin => 
          plugin.manifest.id === pluginId 
            ? { ...plugin, enabled }
            : plugin
        )
      );
    } catch (err) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} plugin ${pluginId}:`, err);
      throw err;
    }
  }, []);

  const getPluginSettings = useCallback((pluginId: string) => {
    return pluginManager.getPluginSettings(pluginId);
  }, []);

  useEffect(() => {
    const initializePlugins = async () => {
      try {
        setLoading(true);
        await pluginManager.initialize();
        setPlugins(pluginManager.getAllPlugins());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize plugins');
      } finally {
        setLoading(false);
      }
    };

    initializePlugins();
  }, []);

  return {
    plugins,
    loading,
    error,
    refreshPlugins,
    togglePlugin,
    getPluginSettings
  };
}