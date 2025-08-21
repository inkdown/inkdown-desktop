import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { pluginManager } from '../services/PluginManager';
import type { LoadedPlugin } from '../plugins/types/plugin';

export interface PluginState {
  plugins: ReadonlyMap<string, LoadedPlugin>;
  loading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface PluginActions {
  enablePlugin: (pluginId: string) => Promise<boolean>;
  disablePlugin: (pluginId: string) => Promise<boolean>;
  refreshPlugins: () => Promise<void>;
  scanEnabledPlugins: () => Promise<void>;
  forceScanPlugins: () => Promise<void>;
  setPlugins: (plugins: Map<string, LoadedPlugin>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveEditor: (coreEditor: any) => void;
  clearActiveEditor: () => void;
  executeShortcut: (shortcut: string, event: KeyboardEvent) => Promise<boolean>;
  initialize: () => void;
  cleanup: () => void;
}

export type PluginStore = PluginState & PluginActions;

export const usePluginStore = create<PluginStore>()(
  subscribeWithSelector((set, get) => ({
    plugins: new Map() as ReadonlyMap<string, LoadedPlugin>,
    loading: false,
    error: null,
    lastUpdated: 0,

    enablePlugin: async (pluginId: string) => {
      try {
        const result = await pluginManager.enablePlugin(pluginId);
        return result;
      } catch (error) {
        console.error(`Failed to enable plugin ${pluginId}:`, error);
        set({ error: error instanceof Error ? error.message : `Failed to enable plugin ${pluginId}` });
        return false;
      }
    },

    disablePlugin: async (pluginId: string) => {
      try {
        const result = await pluginManager.disablePlugin(pluginId);
        return result;
      } catch (error) {
        console.error(`Failed to disable plugin ${pluginId}:`, error);
        set({ error: error instanceof Error ? error.message : `Failed to disable plugin ${pluginId}` });
        return false;
      }
    },

    refreshPlugins: async () => {
      try {
        set({ loading: true, error: null });
        await pluginManager.scanPlugins();
        set({ loading: false });
      } catch (error) {
        console.error('Failed to refresh plugins:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to refresh plugins',
          loading: false 
        });
      }
    },

    scanEnabledPlugins: async () => {
      try {
        set({ loading: true, error: null });
        await pluginManager.scanEnabledPlugins();
        set({ loading: false });
      } catch (error) {
        console.error('Failed to scan enabled plugins:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to scan enabled plugins',
          loading: false 
        });
      }
    },

    forceScanPlugins: async () => {
      try {
        set({ loading: true, error: null });
        await pluginManager.scanPlugins();
        set({ loading: false });
      } catch (error) {
        console.error('Failed to force scan plugins:', error);
        set({ 
          error: error instanceof Error ? error.message : 'Failed to scan plugins',
          loading: false 
        });
      }
    },

    setPlugins: (plugins) => set({ 
      plugins: new Map(plugins) as ReadonlyMap<string, LoadedPlugin>,
      lastUpdated: Date.now()
    }),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    setActiveEditor: (coreEditor) => {
      pluginManager.setActiveEditor(coreEditor);
    },

    clearActiveEditor: () => {
      pluginManager.setActiveEditor(null);
    },

    executeShortcut: async (shortcut: string, event: KeyboardEvent) => {
      try {
        return await pluginManager.executeShortcut(shortcut, event);
      } catch (error) {
        console.error(`Failed to execute shortcut ${shortcut}:`, error);
        return false;
      }
    },

    initialize: () => {
      const unsubscribe = pluginManager.subscribeToState((managerState) => {
        const { plugins, loading, lastError } = managerState;
        
        set({
          plugins: new Map(plugins) as ReadonlyMap<string, LoadedPlugin>,
          loading: loading || false,
          error: lastError || null,
          lastUpdated: Date.now(),
        });
      });

      (get() as any).pluginManagerUnsubscribe = unsubscribe;

      const initialState = pluginManager.getState();
      set({
        plugins: new Map(initialState.plugins) as ReadonlyMap<string, LoadedPlugin>,
        loading: initialState.loading || false,
        error: initialState.lastError || null,
        lastUpdated: Date.now(),
      });

      // CRITICAL: Only scan ENABLED plugins on app startup for security and performance
      // This ensures only enabled plugins are loaded immediately when the app starts
      get().scanEnabledPlugins().catch(error => {
        console.error('❌ [PluginStore] Failed to scan enabled plugins on startup:', error);
        set({ error: error.message || 'Failed to scan enabled plugins on startup' });
      });
    },

    cleanup: () => {
      const unsubscribe = (get() as any).pluginManagerUnsubscribe;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    },
  }))
);

export const usePlugins = () => usePluginStore((state) => state.plugins);
export const usePluginLoading = () => usePluginStore((state) => state.loading);
export const usePluginError = () => usePluginStore((state) => state.error);

export const usePlugin = (pluginId: string) => usePluginStore((state) => 
  state.plugins.get(pluginId) || null
);

export const useEnabledPlugins = () => usePluginStore((state) => 
  Array.from(state.plugins.values()).filter(plugin => plugin.enabled)
);

export const useLoadedPlugins = () => usePluginStore((state) => 
  Array.from(state.plugins.values()).filter(plugin => plugin.loaded)
);

export const usePluginStats = () => usePluginStore((state) => {
  const pluginArray = Array.from(state.plugins.values());
  return {
    total: pluginArray.length,
    enabled: pluginArray.filter(p => p.enabled).length,
    loaded: pluginArray.filter(p => p.loaded).length,
  };
});