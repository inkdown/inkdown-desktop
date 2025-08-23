import { invoke } from '@tauri-apps/api/core';
import { WorkspaceConfig, AppearanceConfig } from '../types/config';
import { cacheUtils } from '../utils/localStorage';

// Centralized default configurations
export const DEFAULT_WORKSPACE_CONFIG: Required<WorkspaceConfig> = {
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

export const DEFAULT_APPEARANCE_CONFIG: Required<AppearanceConfig> = {
  "font-size": 14,
  "font-family": "Inter, system-ui, sans-serif",
  theme: "light",
  "custom-theme": undefined,
};

// Settings validation and normalization
export class SettingsValidator {
  static validateWorkspaceConfig(config: Partial<WorkspaceConfig>): WorkspaceConfig {
    return {
      ...DEFAULT_WORKSPACE_CONFIG,
      ...config,
      shortcuts: this.normalizeShortcuts(config.shortcuts || [])
    };
  }

  static validateAppearanceConfig(config: Partial<AppearanceConfig>): AppearanceConfig {
    const validated = {
      ...DEFAULT_APPEARANCE_CONFIG,
      ...config
    };

    // Validate font size range
    if (validated["font-size"] < 8 || validated["font-size"] > 32) {
      validated["font-size"] = DEFAULT_APPEARANCE_CONFIG["font-size"];
    }

    // Validate theme mode
    if (!['light', 'dark', 'auto'].includes(validated.theme)) {
      validated.theme = DEFAULT_APPEARANCE_CONFIG.theme;
    }

    return validated;
  }

  private static normalizeShortcuts(shortcuts: any[]): WorkspaceConfig['shortcuts'] {
    const existingShortcuts = shortcuts.map((s: any) => s.name);
    const missingDefaults = DEFAULT_WORKSPACE_CONFIG.shortcuts.filter(
      (s) => !existingShortcuts.includes(s.name)
    );
    
    return [...shortcuts, ...missingDefaults];
  }
}

// Main settings manager
export class SettingsManager {
  private static instance: SettingsManager;

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  /**
   * Load workspace config with cache-first strategy
   */
  async loadWorkspaceConfig(): Promise<WorkspaceConfig> {
    try {
      // 1. Try cache first
      const cached = cacheUtils.getWorkspaceConfig();
      if (cached) {
        const validated = SettingsValidator.validateWorkspaceConfig(cached);
        return validated;
      }

      // 2. Load from disk
      const diskConfigStr = await invoke<string>("load_workspace_config");
      const diskConfig = JSON.parse(diskConfigStr) as Partial<WorkspaceConfig>;
      const validated = SettingsValidator.validateWorkspaceConfig(diskConfig);
      
      // 3. Cache the result
      cacheUtils.setWorkspaceConfig(validated);
      
      return validated;
    } catch (error) {
      console.warn('Failed to load workspace config, using defaults:', error);
      const defaultConfig = SettingsValidator.validateWorkspaceConfig({});
      cacheUtils.setWorkspaceConfig(defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * Load appearance config with cache-first strategy
   */
  async loadAppearanceConfig(): Promise<AppearanceConfig> {
    try {
      // 1. Try cache first
      const cached = cacheUtils.getAppearanceConfig();
      if (cached) {
        const validated = SettingsValidator.validateAppearanceConfig(cached);
        return validated;
      }

      // 2. Load from disk
      const diskConfigStr = await invoke<string>("load_appearance_config");
      const diskConfig = JSON.parse(diskConfigStr) as Partial<AppearanceConfig>;
      const validated = SettingsValidator.validateAppearanceConfig(diskConfig);
      
      // 3. Cache the result
      cacheUtils.setAppearanceConfig(validated);
      
      return validated;
    } catch (error) {
      console.warn('Failed to load appearance config, using defaults:', error);
      const defaultConfig = SettingsValidator.validateAppearanceConfig({});
      cacheUtils.setAppearanceConfig(defaultConfig);
      return defaultConfig;
    }
  }

  /**
   * Update workspace config with bidirectional sync
   */
  async updateWorkspaceConfig(updates: Partial<WorkspaceConfig>): Promise<WorkspaceConfig> {
    const current = cacheUtils.getWorkspaceConfig() || DEFAULT_WORKSPACE_CONFIG;
    const merged = { ...current, ...updates };
    const validated = SettingsValidator.validateWorkspaceConfig(merged);

    try {
      // 1. Save to disk first
      await invoke("update_workspace_config", { config: updates });
      
      // 2. Update cache only after successful disk write
      cacheUtils.setWorkspaceConfig(validated);
      
      return validated;
    } catch (error) {
      console.error('Failed to update workspace config:', error);
      throw error;
    }
  }

  /**
   * Update appearance config with bidirectional sync
   */
  async updateAppearanceConfig(updates: Partial<AppearanceConfig>): Promise<AppearanceConfig> {
    const current = cacheUtils.getAppearanceConfig() || DEFAULT_APPEARANCE_CONFIG;
    const merged = { ...current, ...updates };
    const validated = SettingsValidator.validateAppearanceConfig(merged);

    try {
      // 1. Save to disk first
      await invoke("save_appearance_config", { config: validated });
      
      // 2. Update cache only after successful disk write
      cacheUtils.setAppearanceConfig(validated);
      
      return validated;
    } catch (error) {
      console.error('Failed to update appearance config:', error);
      throw error;
    }
  }

  /**
   * Get setting with proper fallback chain
   */
  getWorkspaceSetting<K extends keyof WorkspaceConfig>(
    key: K, 
    config?: WorkspaceConfig | null
  ): NonNullable<WorkspaceConfig[K]> {
    const source = config || cacheUtils.getWorkspaceConfig();
    return (source?.[key] ?? DEFAULT_WORKSPACE_CONFIG[key]) as NonNullable<WorkspaceConfig[K]>;
  }

  getAppearanceSetting<K extends keyof AppearanceConfig>(
    key: K, 
    config?: AppearanceConfig | null
  ): NonNullable<AppearanceConfig[K]> {
    const source = config || cacheUtils.getAppearanceConfig();
    return (source?.[key] ?? DEFAULT_APPEARANCE_CONFIG[key]) as NonNullable<AppearanceConfig[K]>;
  }

  /**
   * Refresh all configs (invalidate cache and reload)
   */
  async refresh(): Promise<{ workspace: WorkspaceConfig; appearance: AppearanceConfig }> {
    cacheUtils.invalidateWorkspace();
    cacheUtils.invalidateAppearance();
    
    const [workspace, appearance] = await Promise.all([
      this.loadWorkspaceConfig(),
      this.loadAppearanceConfig()
    ]);

    return { workspace, appearance };
  }

}

// Export singleton instance
export const settingsManager = SettingsManager.getInstance();