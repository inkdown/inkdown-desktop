import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig, AppearanceConfig } from '../types/config';
import { cacheUtils } from '../utils/localStorage';

export interface ConfigState {
  // Workspace Config
  workspaceConfig: WorkspaceConfig | null;
  workspaceLoading: boolean;
  workspaceError: string | null;
  
  // Appearance Config
  appearanceConfig: AppearanceConfig | null;
  appearanceLoading: boolean;
  appearanceError: string | null;
  
  // General
  initialized: boolean;
  lastUpdated: number;
}

export interface ConfigActions {
  // Workspace actions
  updateWorkspaceConfig: (updates: Partial<WorkspaceConfig>) => Promise<void>;
  setWorkspaceConfig: (config: WorkspaceConfig) => void;
  setWorkspaceLoading: (loading: boolean) => void;
  setWorkspaceError: (error: string | null) => void;
  
  // Appearance actions
  updateAppearanceConfig: (updates: Partial<AppearanceConfig>) => Promise<void>;
  setAppearanceConfig: (config: AppearanceConfig) => void;
  setAppearanceLoading: (loading: boolean) => void;
  setAppearanceError: (error: string | null) => void;
  
  // General actions
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  clearErrors: () => void;
}

export type ConfigStore = ConfigState & ConfigActions;

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspace_path: null,
  vimMode: false,
  showLineNumbers: true,
  highlightCurrentLine: true,
  readOnly: false,
  sidebarVisible: true,
  githubMarkdown: false,
  pasteUrlsAsLinks: true,
  devMode: false,
  showEditorFooter: true,
  shortcuts: [
    { name: "toggleSidebar", shortcut: "Ctrl+Shift+B" },
    { name: "save", shortcut: "Ctrl+S" },
    { name: "openNotePalette", shortcut: "Ctrl+O" },
    { name: "openSettings", shortcut: "Ctrl+P" },
    { name: "markdownBold", shortcut: "Ctrl+B" },
    { name: "markdownItalic", shortcut: "Ctrl+I" },
    { name: "markdownStrikethrough", shortcut: "Ctrl+Shift+S" },
    { name: "markdownCode", shortcut: "Ctrl+Shift+C" },
    { name: "markdownLink", shortcut: "Ctrl+K" },
    { name: "markdownTable", shortcut: "Ctrl+Shift+T" },
    { name: "markdownHeading1", shortcut: "Ctrl+1" },
    { name: "markdownHeading2", shortcut: "Ctrl+2" },
    { name: "markdownHeading3", shortcut: "Ctrl+3" },
    { name: "markdownHeading4", shortcut: "Ctrl+4" },
    { name: "markdownHeading5", shortcut: "Ctrl+5" },
    { name: "markdownHeading6", shortcut: "Ctrl+6" },
  ],
};

const DEFAULT_APPEARANCE: AppearanceConfig = {
  "font-size": 14,
  "font-family": "Inter, system-ui, sans-serif",
  theme: "light",
};

export const useConfigStore = create<ConfigStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    workspaceConfig: null,
    workspaceLoading: false,
    workspaceError: null,
    appearanceConfig: null,
    appearanceLoading: false,
    appearanceError: null,
    initialized: false,
    lastUpdated: 0,

    // Workspace actions
    setWorkspaceConfig: (config) => set({ workspaceConfig: config, lastUpdated: Date.now() }),
    setWorkspaceLoading: (loading) => set({ workspaceLoading: loading }),
    setWorkspaceError: (error) => set({ workspaceError: error }),

    updateWorkspaceConfig: async (updates) => {
      const { workspaceConfig } = get();
      if (!workspaceConfig) return;

      set({ workspaceLoading: true, workspaceError: null });

      try {
        await invoke("update_workspace_config", { config: updates });
        const updatedConfig = { ...workspaceConfig, ...updates };
        cacheUtils.setWorkspaceConfig(updatedConfig);
        
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
      const { appearanceConfig } = get();
      if (!appearanceConfig) return;

      set({ appearanceLoading: true, appearanceError: null });

      try {
        const newConfig = { ...appearanceConfig, ...updates };
        await invoke("save_appearance_config", { config: newConfig });
        cacheUtils.setAppearanceConfig(newConfig);
        
        set({
          appearanceConfig: newConfig,
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
        // Try to load from cache first
        let workspace = cacheUtils.getWorkspaceConfig();
        let appearance = cacheUtils.getAppearanceConfig();

        if (workspace && appearance) {
          // Ensure showEditorFooter exists
          if (workspace.showEditorFooter === undefined) {
            workspace.showEditorFooter = DEFAULT_WORKSPACE.showEditorFooter;
            cacheUtils.setWorkspaceConfig(workspace);
          }
          
          set({
            workspaceConfig: workspace,
            appearanceConfig: appearance,
            workspaceLoading: false,
            appearanceLoading: false,
            initialized: true,
            lastUpdated: Date.now(),
          });

          // Sync from disk in background
          syncFromDisk(workspace, appearance);
          return;
        }

        // Load from Tauri if not in cache
        const [workspaceStr, appearanceStr] = await Promise.all([
          invoke<string>("load_workspace_config"),
          invoke<string>("load_appearance_config"),
        ]);

        if (!workspace) {
          workspace = JSON.parse(workspaceStr) as WorkspaceConfig;
          cacheUtils.setWorkspaceConfig(workspace);
        }

        if (!appearance) {
          appearance = JSON.parse(appearanceStr) as AppearanceConfig;
          cacheUtils.setAppearanceConfig(appearance);
        }

        // Ensure defaults
        if (workspace.showEditorFooter === undefined) {
          workspace.showEditorFooter = DEFAULT_WORKSPACE.showEditorFooter;
        }

        if (!workspace.shortcuts || workspace.shortcuts.length === 0) {
          workspace.shortcuts = DEFAULT_WORKSPACE.shortcuts;
        } else {
          const existingShortcuts = workspace.shortcuts.map((s: any) => s.name);
          const defaultShortcuts = DEFAULT_WORKSPACE.shortcuts.filter(
            (s) => !existingShortcuts.includes(s.name),
          );
          if (defaultShortcuts.length > 0) {
            workspace.shortcuts = [...workspace.shortcuts, ...defaultShortcuts];
          }
        }

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
          workspaceConfig: DEFAULT_WORKSPACE,
          appearanceConfig: DEFAULT_APPEARANCE,
          workspaceLoading: false,
          appearanceLoading: false,
          workspaceError: errorMessage,
          appearanceError: errorMessage,
          initialized: true,
          lastUpdated: Date.now(),
        });
      }
    },

    refresh: async () => {
      cacheUtils.invalidateWorkspace();
      cacheUtils.invalidateAppearance();
      set({ initialized: false });
      await get().initialize();
    },

    clearErrors: () => set({ workspaceError: null, appearanceError: null }),
  }))
);

// Helper function for background sync (not part of the store)
const syncFromDisk = async (cachedWorkspace: WorkspaceConfig, cachedAppearance: AppearanceConfig) => {
  try {
    const [workspaceStr, appearanceStr] = await Promise.all([
      invoke<string>("load_workspace_config"),
      invoke<string>("load_appearance_config"),
    ]);

    const diskWorkspace = JSON.parse(workspaceStr) as WorkspaceConfig;
    const diskAppearance = JSON.parse(appearanceStr) as AppearanceConfig;

    const workspaceChanged = JSON.stringify(diskWorkspace) !== JSON.stringify(cachedWorkspace);
    const appearanceChanged = JSON.stringify(diskAppearance) !== JSON.stringify(cachedAppearance);

    if (workspaceChanged || appearanceChanged) {
      if (workspaceChanged) {
        if (diskWorkspace.showEditorFooter === undefined) {
          diskWorkspace.showEditorFooter = DEFAULT_WORKSPACE.showEditorFooter;
        }
        cacheUtils.setWorkspaceConfig(diskWorkspace);
      }
      if (appearanceChanged) {
        cacheUtils.setAppearanceConfig(diskAppearance);
      }

      // Update the store
      const store = useConfigStore.getState();
      store.setWorkspaceConfig(workspaceChanged ? diskWorkspace : cachedWorkspace);
      store.setAppearanceConfig(appearanceChanged ? diskAppearance : cachedAppearance);
    }
  } catch (err) {
    console.warn("Background sync failed:", err);
  }
};

// Selectors for optimized component subscriptions
export const useWorkspaceConfig = () => useConfigStore((state) => state.workspaceConfig);
export const useAppearanceConfig = () => useConfigStore((state) => state.appearanceConfig);
export const useConfigLoading = () => useConfigStore((state) => state.workspaceLoading || state.appearanceLoading);
export const useConfigErrors = () => useConfigStore((state) => ({ 
  workspaceError: state.workspaceError, 
  appearanceError: state.appearanceError 
}));