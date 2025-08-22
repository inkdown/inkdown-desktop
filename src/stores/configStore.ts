import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { WorkspaceConfig, AppearanceConfig } from '../types/config';
import { settingsManager } from '../services/SettingsManager';

export interface ConfigState {
  workspaceConfig: WorkspaceConfig | null;
  workspaceLoading: boolean;
  workspaceError: string | null;
  
  appearanceConfig: AppearanceConfig | null;
  appearanceLoading: boolean;
  appearanceError: string | null;
  
  initialized: boolean;
  lastUpdated: number;
}

export interface ConfigActions {
  updateWorkspaceConfig: (updates: Partial<WorkspaceConfig>) => Promise<void>;
  setWorkspaceConfig: (config: WorkspaceConfig) => void;
  setWorkspaceLoading: (loading: boolean) => void;
  setWorkspaceError: (error: string | null) => void;
  
  updateAppearanceConfig: (updates: Partial<AppearanceConfig>) => Promise<void>;
  setAppearanceConfig: (config: AppearanceConfig) => void;
  setAppearanceLoading: (loading: boolean) => void;
  setAppearanceError: (error: string | null) => void;
  
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  clearErrors: () => void;
}

export type ConfigStore = ConfigState & ConfigActions;

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector((set, get) => ({
    workspaceConfig: null,
    workspaceLoading: false,
    workspaceError: null,
    appearanceConfig: null,
    appearanceLoading: false,
    appearanceError: null,
    initialized: false,
    lastUpdated: 0,

    setWorkspaceConfig: (config) => set({ workspaceConfig: config, lastUpdated: Date.now() }),
    setWorkspaceLoading: (loading) => set({ workspaceLoading: loading }),
    setWorkspaceError: (error) => set({ workspaceError: error }),

    updateWorkspaceConfig: async (updates) => {
      set({ workspaceLoading: true, workspaceError: null });

      try {
        const updatedConfig = await settingsManager.updateWorkspaceConfig(updates);
        
        set({
          workspaceConfig: updatedConfig,
          workspaceLoading: false,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update workspace config";
        set({ workspaceError: errorMessage, workspaceLoading: false });
        throw error;
      }
    },

    // Appearance actions
    setAppearanceConfig: (config) => set({ appearanceConfig: config, lastUpdated: Date.now() }),
    setAppearanceLoading: (loading) => set({ appearanceLoading: loading }),
    setAppearanceError: (error) => set({ appearanceError: error }),

    updateAppearanceConfig: async (updates) => {
      set({ appearanceLoading: true, appearanceError: null });

      try {
        const updatedConfig = await settingsManager.updateAppearanceConfig(updates);
        
        set({
          appearanceConfig: updatedConfig,
          appearanceLoading: false,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to update appearance config";
        set({ appearanceError: errorMessage, appearanceLoading: false });
        throw error;
      }
    },

    // General actions
    initialize: async () => {
      const { initialized } = get();
      if (initialized) return;

      set({ workspaceLoading: true, appearanceLoading: true });

      try {
        // Use settings manager for clean cache-first loading
        const [workspace, appearance] = await Promise.all([
          settingsManager.loadWorkspaceConfig(),
          settingsManager.loadAppearanceConfig()
        ]);

        set({
          workspaceConfig: workspace,
          appearanceConfig: appearance,
          workspaceLoading: false,
          appearanceLoading: false,
          initialized: true,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        console.error("Error loading configs:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load configs";
        
        set({
          workspaceError: errorMessage,
          appearanceError: errorMessage,
          workspaceLoading: false,
          appearanceLoading: false,
          initialized: true,
          lastUpdated: Date.now(),
        });
      }
    },

    refresh: async () => {
      set({ initialized: false, workspaceLoading: true, appearanceLoading: true });
      
      try {
        const { workspace, appearance } = await settingsManager.refresh();
        
        set({
          workspaceConfig: workspace,
          appearanceConfig: appearance,
          workspaceLoading: false,
          appearanceLoading: false,
          initialized: true,
          lastUpdated: Date.now(),
        });
      } catch (error) {
        console.error("Error refreshing configs:", error);
        await get().initialize();
      }
    },

    clearErrors: () => set({ workspaceError: null, appearanceError: null }),
  }))
);

// Export settings manager for direct access when needed
export { settingsManager };

// Selectors for optimized component subscriptions
export const useWorkspaceConfig = () => useConfigStore((state) => state.workspaceConfig);
export const useAppearanceConfig = () => useConfigStore((state) => state.appearanceConfig);
export const useConfigLoading = () => useConfigStore((state) => state.workspaceLoading || state.appearanceLoading);
export const useConfigErrors = () => useConfigStore((state) => ({ 
  workspaceError: state.workspaceError, 
  appearanceError: state.appearanceError 
}));