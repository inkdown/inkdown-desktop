import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { WorkspaceConfig, AppearanceConfig } from "../types/config";
import { cacheUtils } from "../utils/localStorage";

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

const MAX_LISTENERS = 10;

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
    if (this.listeners.size >= MAX_LISTENERS) {
      console.warn('ConfigManager: Muitos listeners ativos, possível vazamento');
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state));
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
      // Primeira prioridade: carregar do cache para início imediato
      let workspace = cacheUtils.getWorkspaceConfig();
      let appearance = cacheUtils.getAppearanceConfig();
      
      // Se temos cache, aplique imediatamente para UI responsiva
      if (workspace && appearance) {
        // Garantir que showEditorFooter tem valor padrão se não existir
        if (workspace.showEditorFooter === undefined) {
          workspace.showEditorFooter = DEFAULT_WORKSPACE.showEditorFooter;
          cacheUtils.setWorkspaceConfig(workspace); // Atualizar cache com novo campo
        }
        
        // Aplicar estado do cache imediatamente
        this.state = {
          workspace,
          appearance,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        };
        this.initialized = true;
        this.notify();
        
        // Opcional: sincronizar com Rust em background
        this.syncFromDisk(workspace, appearance);
        return;
      }

      // Se não há cache, carregar do disco
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

      // Garantir que showEditorFooter existe também para carregamento inicial
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

      this.state = {
        workspace,
        appearance,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      };

      this.initialized = true;
    } catch (err) {
      console.error("Error loading configs:", err);
      this.state = {
        workspace: DEFAULT_WORKSPACE,
        appearance: DEFAULT_APPEARANCE,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to load configs",
        lastUpdated: Date.now(),
      };
    }

    this.notify();
  }

  // Sincronização em background para garantir consistência com disco
  private async syncFromDisk(cachedWorkspace: WorkspaceConfig, cachedAppearance: AppearanceConfig): Promise<void> {
    try {
      const [workspaceStr, appearanceStr] = await Promise.all([
        invoke<string>("load_workspace_config"),
        invoke<string>("load_appearance_config"),
      ]);

      const diskWorkspace = JSON.parse(workspaceStr) as WorkspaceConfig;
      const diskAppearance = JSON.parse(appearanceStr) as AppearanceConfig;

      // Verificar se há diferenças significativas
      const workspaceChanged = JSON.stringify(diskWorkspace) !== JSON.stringify(cachedWorkspace);
      const appearanceChanged = JSON.stringify(diskAppearance) !== JSON.stringify(cachedAppearance);

      if (workspaceChanged || appearanceChanged) {
        // Atualizar cache e estado se houve mudanças
        if (workspaceChanged) {
          // Garantir que showEditorFooter existe
          if (diskWorkspace.showEditorFooter === undefined) {
            diskWorkspace.showEditorFooter = DEFAULT_WORKSPACE.showEditorFooter;
          }
          cacheUtils.setWorkspaceConfig(diskWorkspace);
        }
        if (appearanceChanged) {
          cacheUtils.setAppearanceConfig(diskAppearance);
        }

        this.state = {
          workspace: workspaceChanged ? diskWorkspace : cachedWorkspace,
          appearance: appearanceChanged ? diskAppearance : cachedAppearance,
          isLoading: false,
          error: null,
          lastUpdated: Date.now(),
        };
        this.notify();
      }
    } catch (err) {
      // Falha na sincronização em background não é crítica
      console.warn("Background sync failed:", err);
    }
  }

  async updateWorkspaceConfig(
    updates: Partial<WorkspaceConfig>,
  ): Promise<void> {
    if (!this.state.workspace) return;

    const updateKey = "workspace";

    if (this.updatePromises.has(updateKey)) {
      await this.updatePromises.get(updateKey);
    }

    const updatePromise = this.performWorkspaceUpdate(updates);
    this.updatePromises.set(updateKey, updatePromise);

    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
      
      if (this.updatePromises.size > 5) {
        console.warn('ConfigManager: Muitas promises pendentes');
        this.updatePromises.clear();
      }
    }
  }

  private async performWorkspaceUpdate(
    updates: Partial<WorkspaceConfig>,
  ): Promise<void> {
    try {
      await invoke("update_workspace_config", { config: updates });
      const updatedWorkspace = { ...this.state.workspace!, ...updates };
      cacheUtils.setWorkspaceConfig(updatedWorkspace);

      this.state = {
        ...this.state,
        workspace: updatedWorkspace,
        lastUpdated: Date.now(),
        error: null,
      };
      this.notify();
    } catch (err) {
      console.error("Error updating workspace config:", err);
      this.state = {
        ...this.state,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update workspace config",
      };
      this.notify();
    }
  }

  async updateAppearanceConfig(
    updates: Partial<AppearanceConfig>,
  ): Promise<void> {
    if (!this.state.appearance) return;

    const updateKey = "appearance";

    if (this.updatePromises.has(updateKey)) {
      await this.updatePromises.get(updateKey);
    }

    const updatePromise = this.performAppearanceUpdate(updates);
    this.updatePromises.set(updateKey, updatePromise);

    try {
      await updatePromise;
    } finally {
      this.updatePromises.delete(updateKey);
      
      if (this.updatePromises.size > 5) {
        console.warn('ConfigManager: Muitas promises pendentes');
        this.updatePromises.clear();
      }
    }
  }

  private async performAppearanceUpdate(
    updates: Partial<AppearanceConfig>,
  ): Promise<void> {
    try {
      const newConfig = { ...this.state.appearance!, ...updates };
      await invoke("save_appearance_config", { config: newConfig });
      cacheUtils.setAppearanceConfig(newConfig);

      this.state = {
        ...this.state,
        appearance: newConfig,
        lastUpdated: Date.now(),
        error: null,
      };
      this.notify();
    } catch (err) {
      console.error("Error updating appearance config:", err);
      this.state = {
        ...this.state,
        error:
          err instanceof Error
            ? err.message
            : "Failed to update appearance config",
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
  isStale(maxAge: number = 30000): boolean {
    // 30 seconds default
    return Date.now() - this.state.lastUpdated > maxAge;
  }

  async refresh(): Promise<void> {
    cacheUtils.invalidateWorkspace();
    cacheUtils.invalidateAppearance();
    this.initialized = false;
    await this.initialize();
  }

  getState(): ConfigState {
    return this.state;
  }
}

export function useConfigManager() {
  const [state, setState] = useState<ConfigState>(() =>
    ConfigManager.getInstance().getState(),
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

  const updateWorkspaceConfig = useCallback(
    async (updates: Partial<WorkspaceConfig>) => {
      await manager.updateWorkspaceConfig(updates);
    },
    [manager],
  );

  const updateAppearanceConfig = useCallback(
    async (updates: Partial<AppearanceConfig>) => {
      await manager.updateAppearanceConfig(updates);
    },
    [manager],
  );

  const clearError = useCallback(() => {
    manager.clearError();
  }, [manager]);

  const refresh = useCallback(async () => {
    await manager.refresh();
  }, [manager]);

  const isStale = useCallback(
    (maxAge?: number) => {
      return manager.isStale(maxAge);
    },
    [manager],
  );

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
}
