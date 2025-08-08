import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig, AppearanceConfig } from '../types/config';

interface ConfigState {
  workspace: WorkspaceConfig | null;
  appearance: AppearanceConfig | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspace_path: null,
  vimMode: false,
  showLineNumbers: true,
  highlightCurrentLine: true,
  markdown: true,
  readOnly: false,
  sidebarVisible: true,
  shortcuts: [
    { name: 'toggleSidebar', shortcut: 'Ctrl+B' },
    { name: 'save', shortcut: 'Ctrl+S' },
    { name: 'openNotePalette', shortcut: 'Ctrl+O' }
  ],
};

const DEFAULT_APPEARANCE: AppearanceConfig = {
  'font-size': 14,
  'font-family': 'Inter, system-ui, sans-serif',
  theme: 'light',
};

class ConfigManager {
  private static instance: ConfigManager;
  private state: ConfigState = {
    workspace: null,
    appearance: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
  };
  private listeners: Set<(state: ConfigState) => void> = new Set();
  private initialized = false;
  private loadPromise: Promise<void> | null = null;
  private updatePromises: Map<string, Promise<void>> = new Map();

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  subscribe(listener: (state: ConfigState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this.loadConfigs();
    await this.loadPromise;
    this.loadPromise = null;
  }

  private async loadConfigs(): Promise<void> {
    this.state = { ...this.state, isLoading: true, error: null };
    this.notify();

    try {
      const [workspaceStr, appearanceStr] = await Promise.all([
        invoke<string>('load_workspace_config'),
        invoke<string>('load_appearance_config')
      ]);

      const workspace = JSON.parse(workspaceStr) as WorkspaceConfig;
      const appearance = JSON.parse(appearanceStr) as AppearanceConfig;

      // Update shortcuts in state but don't save to config during initialization
      // to avoid overwriting other config values like workspace_path
      if (!workspace.shortcuts || workspace.shortcuts.length === 0) {
        workspace.shortcuts = DEFAULT_WORKSPACE.shortcuts;
      } else {
        const existingShortcuts = workspace.shortcuts.map(s => s.name);
        const defaultShortcuts = DEFAULT_WORKSPACE.shortcuts.filter(
          s => !existingShortcuts.includes(s.name)
        );
        if (defaultShortcuts.length > 0) {
          workspace.shortcuts = [...workspace.shortcuts, ...defaultShortcuts];
        }
      }

      this.state = {
        workspace,
        appearance,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      };

      this.initialized = true;
    } catch (err) {
      console.error('Error loading configs:', err);
      this.state = {
        workspace: DEFAULT_WORKSPACE,
        appearance: DEFAULT_APPEARANCE,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load configs',
        lastUpdated: Date.now(),
      };
    }

    this.notify();
  }

  async updateWorkspaceConfig(updates: Partial<WorkspaceConfig>): Promise<void> {
    if (!this.state.workspace) return;

    const updateKey = 'workspace';
    
    // Check if there's already an update in progress
    if (this.updatePromises.has(updateKey)) {
      await this.updatePromises.get(updateKey);
    }

    const updatePromise = this.performWorkspaceUpdate(updates);
    this.updatePromises.set(updateKey, updatePromise);
    
    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
    }
  }

  private async performWorkspaceUpdate(updates: Partial<WorkspaceConfig>): Promise<void> {
    try {
      await invoke('update_workspace_config', { config: updates });
      this.state = {
        ...this.state,
        workspace: { ...this.state.workspace!, ...updates },
        lastUpdated: Date.now(),
        error: null,
      };
      this.notify();
    } catch (err) {
      console.error('Error updating workspace config:', err);
      this.state = {
        ...this.state,
        error: err instanceof Error ? err.message : 'Failed to update workspace config'
      };
      this.notify();
    }
  }

  async updateAppearanceConfig(updates: Partial<AppearanceConfig>): Promise<void> {
    if (!this.state.appearance) return;

    const updateKey = 'appearance';
    
    // Check if there's already an update in progress
    if (this.updatePromises.has(updateKey)) {
      await this.updatePromises.get(updateKey);
    }

    const updatePromise = this.performAppearanceUpdate(updates);
    this.updatePromises.set(updateKey, updatePromise);
    
    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
    }
  }

  private async performAppearanceUpdate(updates: Partial<AppearanceConfig>): Promise<void> {
    try {
      const newConfig = { ...this.state.appearance!, ...updates };
      await invoke('save_appearance_config', { config: newConfig });
      this.state = {
        ...this.state,
        appearance: newConfig,
        lastUpdated: Date.now(),
        error: null,
      };
      this.notify();
    } catch (err) {
      console.error('Error updating appearance config:', err);
      this.state = {
        ...this.state,
        error: err instanceof Error ? err.message : 'Failed to update appearance config'
      };
      this.notify();
    }
  }

  // Add method to clear errors
  clearError(): void {
    if (this.state.error) {
      this.state = {
        ...this.state,
        error: null,
      };
      this.notify();
    }
  }

  // Add method to check if config is stale
  isStale(maxAge: number = 30000): boolean { // 30 seconds default
    return Date.now() - this.state.lastUpdated > maxAge;
  }

  // Add method to force refresh
  async refresh(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  getState(): ConfigState {
    return this.state;
  }
}

export function useConfigManager() {
  const [state, setState] = useState<ConfigState>(() => 
    ConfigManager.getInstance().getState()
  );
  const initRef = useRef(false);
  const manager = useMemo(() => ConfigManager.getInstance(), []);

  useEffect(() => {
    const unsubscribe = manager.subscribe(setState);
    
    if (!initRef.current) {
      initRef.current = true;
      manager.initialize();
    }

    return unsubscribe;
  }, [manager]);

  const updateWorkspaceConfig = useCallback(async (updates: Partial<WorkspaceConfig>) => {
    await manager.updateWorkspaceConfig(updates);
  }, [manager]);

  const updateAppearanceConfig = useCallback(async (updates: Partial<AppearanceConfig>) => {
    await manager.updateAppearanceConfig(updates);
  }, [manager]);

  const clearError = useCallback(() => {
    manager.clearError();
  }, [manager]);

  const refresh = useCallback(async () => {
    await manager.refresh();
  }, [manager]);

  const isStale = useCallback((maxAge?: number) => {
    return manager.isStale(maxAge);
  }, [manager]);

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    workspaceConfig: state.workspace || DEFAULT_WORKSPACE,
    appearanceConfig: state.appearance || DEFAULT_APPEARANCE,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    updateWorkspaceConfig,
    updateAppearanceConfig,
    clearError,
    refresh,
    isStale,
  }), [
    state.workspace,
    state.appearance,
    state.isLoading,
    state.error,
    state.lastUpdated,
    updateWorkspaceConfig,
    updateAppearanceConfig,
    clearError,
    refresh,
    isStale,
  ]);
}