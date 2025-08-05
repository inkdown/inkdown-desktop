import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig, AppearanceConfig } from '../types/config';

interface ConfigState {
  workspace: WorkspaceConfig | null;
  appearance: AppearanceConfig | null;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_WORKSPACE: WorkspaceConfig = {
  workspace_path: null,
  vimMode: false,
  showLineNumbers: true,
  highlightCurrentLine: true,
  markdown: true,
  readOnly: false,
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
  };
  private listeners: Set<(state: ConfigState) => void> = new Set();
  private initialized = false;
  private loadPromise: Promise<void> | null = null;

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
      // Load both configs in parallel
      const [workspaceStr, appearanceStr] = await Promise.all([
        invoke<string>('load_workspace_config'),
        invoke<string>('load_appearance_config')
      ]);

      const workspace = JSON.parse(workspaceStr) as WorkspaceConfig;
      const appearance = JSON.parse(appearanceStr) as AppearanceConfig;

      this.state = {
        workspace,
        appearance,
        isLoading: false,
        error: null,
      };

      this.initialized = true;
    } catch (err) {
      console.error('Error loading configs:', err);
      this.state = {
        workspace: DEFAULT_WORKSPACE,
        appearance: DEFAULT_APPEARANCE,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load configs',
      };
    }

    this.notify();
  }

  async updateWorkspaceConfig(updates: Partial<WorkspaceConfig>): Promise<void> {
    if (!this.state.workspace) return;

    try {
      await invoke('update_workspace_config', { config: updates });
      this.state.workspace = { ...this.state.workspace, ...updates };
      this.notify();
    } catch (err) {
      console.error('Error updating workspace config:', err);
      this.state.error = err instanceof Error ? err.message : 'Failed to update workspace config';
      this.notify();
    }
  }

  async updateAppearanceConfig(updates: Partial<AppearanceConfig>): Promise<void> {
    if (!this.state.appearance) return;

    try {
      const newConfig = { ...this.state.appearance, ...updates };
      await invoke('save_appearance_config', { config: JSON.stringify(newConfig) });
      this.state.appearance = newConfig;
      this.notify();
    } catch (err) {
      console.error('Error updating appearance config:', err);
      this.state.error = err instanceof Error ? err.message : 'Failed to update appearance config';
      this.notify();
    }
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

  useEffect(() => {
    const manager = ConfigManager.getInstance();
    
    // Subscribe to changes
    const unsubscribe = manager.subscribe(setState);
    
    // Initialize only once
    if (!initRef.current) {
      initRef.current = true;
      manager.initialize();
    }

    return unsubscribe;
  }, []);

  const updateWorkspaceConfig = useCallback(async (updates: Partial<WorkspaceConfig>) => {
    await ConfigManager.getInstance().updateWorkspaceConfig(updates);
  }, []);

  const updateAppearanceConfig = useCallback(async (updates: Partial<AppearanceConfig>) => {
    await ConfigManager.getInstance().updateAppearanceConfig(updates);
  }, []);

  return {
    workspaceConfig: state.workspace || DEFAULT_WORKSPACE,
    appearanceConfig: state.appearance || DEFAULT_APPEARANCE,
    isLoading: state.isLoading,
    error: state.error,
    updateWorkspaceConfig,
    updateAppearanceConfig,
  };
}