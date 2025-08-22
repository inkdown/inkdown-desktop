import { invoke } from '@tauri-apps/api/core';
import { cacheUtils } from '../utils/localStorage';
import { setIcon } from '../utils/iconUtils';
import { Setting } from '../plugins/settings/Setting';
import { PluginEditorAPI } from '../plugins/editor/EditorAPI';
import { 
  markdownProcessorRegistry, 
  type MarkdownPostProcessor, 
  type MarkdownCodeBlockProcessor 
} from '../plugins/markdown/MarkdownPostProcessor';
import type { PluginManifest, LoadedPlugin } from '../plugins/types/plugin';

export type { PluginManifest, LoadedPlugin } from '../plugins/types/plugin';

export interface StatusBarItemConfig {
  id: string;
  text: string;
  tooltip?: string;
  iconName?: string;
  callback?: () => void;
}

export interface PluginAPI {
  // File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string | ArrayBuffer | Uint8Array) => Promise<void>;
  getActiveFile: () => Promise<any>;
  saveFileDialog: (options?: any) => Promise<string | null>;
  
  // Markdown
  markdownToHTML: (markdown: string, options?: any) => Promise<string>;
  
  // System
  openExternal: (url: string) => Promise<void>;
  showNotification: (message: string, type?: string) => void;
  setIcon: (element: HTMLElement | { current: HTMLElement | null }, iconId: string, size?: number) => Promise<void>;
  
  // Commands and shortcuts
  commands: {
    add: (command: any) => () => void;
    execute: (commandId: string) => Promise<boolean>;
  };
  shortcuts: {
    add: (shortcut: any) => () => void;
  };
  
  // Settings
  settings: {
    load: (pluginId: string) => Record<string, any>;
    save: (pluginId: string, settings: Record<string, any>) => void;
    setHasSettings: (pluginId: string, hasSettings: boolean) => void;
    getHasSettings: (pluginId: string) => boolean;
  };
}

class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private loadedInstances = new Map<string, any>();
  private globalShortcuts = new Map<string, () => void>();
  private globalCommands = new Map<string, () => void>();
  private globalStatusBarItems = new Map<string, any>();
  private listeners = new Set<(state: any) => void>();
  private activeEditorAPI: PluginEditorAPI | null = null;

  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .split('+')
      .map(part => part.trim())
      .map(part => {
        const normalized = part.toLowerCase();
        switch(normalized) {
          case 'ctrl': case 'control': return 'Ctrl';
          case 'shift': return 'Shift';
          case 'alt': case 'option': return 'Alt';
          case 'cmd': case 'meta': case 'command': return 'Cmd';
          default: return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
      })
      .join('+');
  }

  async scanEnabledPlugins(): Promise<LoadedPlugin[]> {
    try {
      const enabledPluginIds = cacheUtils.getEnabledPlugins();
      
      if (enabledPluginIds.length === 0) {
          return [];
      }
      const allPluginInfos = await invoke<any[]>('scan_plugins_directory');
      const enabledPluginInfos = allPluginInfos.filter(info => 
        enabledPluginIds.includes(info.manifest.id)
      );
      for (const pluginInfo of enabledPluginInfos) {
        const loadedPlugin: LoadedPlugin = {
          ...pluginInfo,
          enabled: true,
          loaded: false,
          instance: null,
          shortcuts: new Map(),
          commands: new Map(),
          statusBarItems: new Map()
        };
        
        this.plugins.set(pluginInfo.manifest.id, loadedPlugin);
        
        this.enablePlugin(pluginInfo.manifest.id).catch(error => {
          console.error(`[PluginManager] Failed to auto-enable plugin ${pluginInfo.manifest.id}:`, error);
        });
      }
      
      this.notifyListeners();
      return Array.from(this.plugins.values());
    } catch (error) {
      console.error('[PluginManager] Failed to scan enabled plugins:', error);
      return [];
    }
  }

  async scanPlugins(): Promise<LoadedPlugin[]> {
    try {
      const pluginInfos = await invoke<any[]>('scan_plugins_directory');
      
      for (const pluginInfo of pluginInfos) {
        if (!this.plugins.has(pluginInfo.manifest.id)) {
          const isEnabled = cacheUtils.isPluginEnabled(pluginInfo.manifest.id);
          
          const loadedPlugin: LoadedPlugin = {
            ...pluginInfo,
            enabled: isEnabled,
            loaded: false,
            instance: null,
            shortcuts: new Map(),
            commands: new Map(),
            statusBarItems: new Map()
          };
          
          this.plugins.set(pluginInfo.manifest.id, loadedPlugin);
        }
      }
      this.notifyListeners();
      
      return Array.from(this.plugins.values());
    } catch (error) {
      console.error('[PluginManager] Failed to scan plugins:', error);
      return [];
    }
  }

  setActiveEditor(coreEditor: any): void {
    if (coreEditor && (!this.activeEditorAPI || this.activeEditorAPI.coreEditor !== coreEditor)) {
      this.activeEditorAPI = new PluginEditorAPI(coreEditor);
    } else if (!coreEditor && this.activeEditorAPI) {
      this.activeEditorAPI = null;
    }
  }

  getActiveEditor(): PluginEditorAPI | null {
    return this.activeEditorAPI;
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🔄 [PluginManager] Enabling plugin: ${pluginId}`);
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        console.log(`❌ [PluginManager] Plugin ${pluginId} not found`);
        return false;
      }

      if (plugin.enabled && plugin.loaded && plugin.instance) {
        console.log(`⚠️ [PluginManager] Plugin ${pluginId} is already enabled and loaded`);
        return true;
      }

      // Update cache first to indicate user intent to enable
      cacheUtils.setPluginEnabled(pluginId, true);
      
      // Check if plugin is already loaded
      if (plugin.loaded && plugin.instance) {
        console.log(`⚠️ [PluginManager] Plugin ${pluginId} is already loaded`);
        return true;
      }

      console.log(`📄 [PluginManager] Reading plugin file: ${plugin.manifest.main}`);
      const pluginCode = await invoke<string>('read_plugin_file', {
        pluginId: pluginId,
        filePath: plugin.manifest.main
      });

      console.log(`🔌 [PluginManager] Creating API for plugin: ${pluginId}`);
      const api = this.createPluginAPI(pluginId);
      
      // Make plugin manager available globally for plugin access
      (globalThis as any).pluginManager = this;
      
      console.log(`⚡ [PluginManager] Executing plugin: ${pluginId}`);
      const result = await this.executePlugin(pluginCode, api, plugin.manifest);
      
      if (result) {
        this.loadedInstances.set(pluginId, result);
        plugin.loaded = true;
        plugin.enabled = true;
        plugin.instance = result;
        
        // Initialize plugin settings (sync file system and cache)
        await this.initializePluginSettings(pluginId);
        
        console.log(`✅ [PluginManager] Plugin ${pluginId} enabled successfully`);
        console.log(`📊 [PluginManager] Plugin shortcuts registered: ${plugin.shortcuts.size}`);
        console.log(`📊 [PluginManager] Global shortcuts total: ${this.globalShortcuts.size}`);
        
        // Cache was already updated earlier
        this.notifyListeners();
        
        // Force immediate state update to ensure UI and keyboard shortcuts are in sync
        setTimeout(() => this.notifyListeners(), 0);
        
        return true;
      }
      
      cacheUtils.setPluginEnabled(pluginId, false);
      return false;
    } catch (error) {
      console.error(`[PluginManager] Failed to enable plugin ${pluginId}:`, error);
      cacheUtils.setPluginEnabled(pluginId, false);
      return false;
    }
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        return false;
      }

      const instance = this.loadedInstances.get(pluginId);
      if (instance && typeof instance.onunload === 'function') {
        await instance.onunload();
      }

      if (plugin.shortcuts) {
        for (const [shortcut] of plugin.shortcuts) {
          this.globalShortcuts.delete(shortcut);
        }
      }
      
      plugin.shortcuts.clear();
      plugin.commands.clear();
      plugin.statusBarItems.clear();
      
      for (const [command] of this.globalCommands.entries()) {
        if (command.startsWith(pluginId + '.')) {
          this.globalCommands.delete(command);
        }
      }

      for (const [itemId] of this.globalStatusBarItems.entries()) {
        if (itemId.startsWith(pluginId + '.')) {
          this.globalStatusBarItems.delete(itemId);
        }
      }

      // Limpeza completa: remove instância carregada e reseta estado
      this.loadedInstances.delete(pluginId);
      plugin.loaded = false;
      plugin.enabled = false;
      plugin.instance = null;
      
      // Limpa qualquer referência ao código do plugin
      if ((globalThis as any).pluginManager === this) {
        // Plugin pode ter deixado referências globais, mas não podemos fazer muito aqui
      }
      
      
      cacheUtils.setPluginEnabled(pluginId, false);
      this.notifyListeners();
      
      // Force immediate state update to ensure UI and keyboard shortcuts are in sync
      setTimeout(() => this.notifyListeners(), 0);
      
      return true;
    } catch (error) {
      console.error(`[PluginManager] Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getPluginSettingsCallback(pluginId: string): ((containerEl: HTMLElement) => void) | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin?.settingsTabCallback;
  }

  hasPluginSettings(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return !!plugin?.settingsTabCallback;
  }

  getState() {
    return {
      plugins: this.plugins,
      loading: false,
      lastError: undefined
    };
  }

  subscribeToState(listener: (state: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('State listener error:', error);
      }
    }
  }

  getEnabledPlugins() {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  getLoadedPlugins() {
    return Array.from(this.plugins.values()).filter(p => p.loaded);
  }

  isPluginEnabled(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.enabled ?? false;
  }

  isPluginLoaded(pluginId: string): boolean {
    return this.plugins.get(pluginId)?.loaded ?? false;
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  /**
   * Verifica se um plugin deve ter seu código carregado
   * Garante que apenas plugins habilitados no cache são executados
   */
  private shouldLoadPlugin(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`Plugin ${pluginId} not found in registry`);
      return false;
    }

    const isEnabledInCache = cacheUtils.isPluginEnabled(pluginId);
    const isAlreadyLoaded = plugin.loaded && plugin.instance;


    return isEnabledInCache && !isAlreadyLoaded;
  }

  /**
   * Lista plugins que estão carregados na memória (com código executado)
   */
  getLoadedPluginsInMemory(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => 
      plugin.loaded && plugin.instance !== null
    );
  }

  /**
   * Saves plugin settings to both cache and file system
   */
  async savePluginSettings(pluginId: string, settings: Record<string, any>): Promise<boolean> {
    try {
      console.log(`💾 [PluginManager] Saving settings for plugin: ${pluginId}`, settings);
      
      // Save to cache
      cacheUtils.setPluginSettings(pluginId, settings);
      
      // Save to file system
      await this.saveSettingsToFile(pluginId, settings);
      
      console.log(`✅ [PluginManager] Settings saved successfully for ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`❌ [PluginManager] Failed to save settings for ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Reloads settings for a specific plugin and notifies the plugin instance
   */
  async reloadPluginSettings(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.loaded || !plugin.instance) {
        console.log(`⚠️ [PluginManager] Plugin ${pluginId} is not loaded, cannot reload settings`);
        return false;
      }

      console.log(`🔄 [PluginManager] Reloading settings for plugin: ${pluginId}`);
      
      if (typeof plugin.instance.reloadSettings === 'function') {
        await plugin.instance.reloadSettings();
        console.log(`✅ [PluginManager] Settings reloaded for plugin: ${pluginId}`);
        return true;
      } else {
        console.warn(`⚠️ [PluginManager] Plugin ${pluginId} does not support settings reloading`);
        return false;
      }
    } catch (error) {
      console.error(`❌ [PluginManager] Failed to reload settings for plugin ${pluginId}:`, error);
      return false;
    }
  }

  async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<boolean> {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    const handler = this.globalShortcuts.get(normalizedShortcut);
    
    if (handler) {
      try {
        await handler();
        event.preventDefault();
        return true;
      } catch (error) {
        console.error(`❌ [PluginManager] Failed to execute shortcut "${normalizedShortcut}":`, error);
        return false;
      }
    }
    
    return false;
  }

  async executeCommand(commandId: string): Promise<boolean> {
    const handler = this.globalCommands.get(commandId);
    if (handler) {
      try {
        await handler();
        return true;
      } catch (error) {
        console.error('Failed to execute command:', error);
        return false;
      }
    }
    return false;
  }

  getStatusBarItems(): any[] {
    return Array.from(this.globalStatusBarItems.values());
  }

  getStatusBarItemsForPlugin(pluginId: string): any[] {
    return Array.from(this.globalStatusBarItems.entries())
      .filter(([id]) => id.startsWith(pluginId + '.'))
      .map(([, item]) => item);
  }

  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      readFile: async (path: string) => {
        return await invoke<string>('read_file', { path });
      },
      
      writeFile: async (path: string, content: string | ArrayBuffer | Uint8Array) => {
        if (typeof content === 'string') {
          await invoke('write_file', { filePath: path, content });
        } else {
          const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
          await invoke('write_binary_file', { filePath: path, content: Array.from(bytes) });
        }
      },
      
      getActiveFile: async () => {
        // Get active file from EditingContext via global window
        try {
          const editingContext = (globalThis as any).__editingContext;
          const activeFile = (globalThis as any).__activeFile;
          
          console.log(`🔍 [PluginManager] Checking active file - editingContext:`, editingContext);
          console.log(`🔍 [PluginManager] Checking active file - activeFile:`, activeFile);
          
          if (activeFile) {
            console.log(`✅ [PluginManager] Found active file: ${activeFile.name} (${activeFile.content?.length || 0} chars)`);
            return {
              path: activeFile.path,
              name: activeFile.name,
              content: activeFile.content
            };
          }
          
          console.log(`⚠️ [PluginManager] No active file found in context`);
          return null;
        } catch (error) {
          console.error(`❌ [PluginManager] Error getting active file:`, error);
          return null;
        }
      },
      
      saveFileDialog: async (options: any = {}) => {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          return await save(options);
        } catch (error) {
          throw new Error(`Failed to open save dialog: ${error}`);
        }
      },
      
      markdownToHTML: async (markdown: string, options: any = {}) => {
        const { markdownToHTML } = await import('../utils/markdown');
        return await markdownToHTML(markdown, options);
      },
      
      openExternal: async (url: string) => {
        try {
          window.open(url, '_blank');
        } catch (error) {
          console.error('Failed to open external URL:', error);
        }
      },
      
      showNotification: (message: string, type: string = 'info') => {
        // Import notification store dynamically to avoid circular dependencies
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { addNotification } = useNotificationStore.getState();
          addNotification(message, { 
            type: type as 'info' | 'success' | 'warning' | 'error'
          });
        });
      },
      
      // Enhanced notification methods
      showInfo: (message: string, title?: string, duration?: number) => {
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { showInfo } = useNotificationStore.getState();
          showInfo(message, title, duration);
        });
      },
      
      showSuccess: (message: string, title?: string, duration?: number) => {
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { showSuccess } = useNotificationStore.getState();
          showSuccess(message, title, duration);
        });
      },
      
      showWarning: (message: string, title?: string, duration?: number) => {
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { showWarning } = useNotificationStore.getState();
          showWarning(message, title, duration);
        });
      },
      
      showError: (message: string, title?: string, duration?: number) => {
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { showError } = useNotificationStore.getState();
          showError(message, title, duration);
        });
      },

      setIcon: async (element: HTMLElement | { current: HTMLElement | null }, iconId: string, size: number = 16) => {
        return await setIcon(element, iconId, size);
      },
      
      commands: {
        add: (command: any) => {
          const fullId = `${pluginId}.${command.id}`;
          
          // Create command executor that supports both callback and editorCallback
          const executor = () => {
            try {
              // Check if command has editorCallback and we have an active editor
              if (command.editorCallback && this.activeEditorAPI) {
                console.log(`🎯 [PluginManager] Executing editor command: ${fullId}`);
                return command.editorCallback(this.activeEditorAPI);
              }
              // Fall back to regular callback
              else if (command.callback) {
                console.log(`🎯 [PluginManager] Executing regular command: ${fullId}`);
                return command.callback();
              }
              // Legacy support for execute method
              else if (command.execute) {
                console.log(`🎯 [PluginManager] Executing legacy command: ${fullId}`);
                return command.execute();
              }
              else {
                console.warn(`⚠️ [PluginManager] Command ${fullId} has no callback method`);
              }
            } catch (error) {
              console.error(`❌ [PluginManager] Error executing command ${fullId}:`, error);
            }
          };
          
          this.globalCommands.set(fullId, executor);
          
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            plugin.commands.set(command.id, command);
          }
          
          return () => {
            this.globalCommands.delete(fullId);
            if (plugin) {
              plugin.commands.delete(command.id);
            }
          };
        },
        
        execute: async (commandId: string) => {
          return await this.executeCommand(commandId);
        }
      },
      
      shortcuts: {
        add: (shortcut: any) => {
          const normalizedShortcut = this.normalizeShortcut(shortcut.shortcut);
          console.log(`⌨️ [PluginManager] Plugin ${pluginId} registering shortcut: "${shortcut.shortcut}" -> normalized: "${normalizedShortcut}"`);
          
          // Create shortcut executor that supports both callback and editorCallback
          const executor = () => {
            try {
              // Check if shortcut has editorCallback and we have an active editor
              if (shortcut.editorCallback && this.activeEditorAPI) {
                console.log(`🎯 [PluginManager] Executing editor shortcut: ${normalizedShortcut}`);
                return shortcut.editorCallback(this.activeEditorAPI);
              }
              // Fall back to regular callback
              else if (shortcut.callback) {
                console.log(`🎯 [PluginManager] Executing regular shortcut: ${normalizedShortcut}`);
                return shortcut.callback();
              }
              // Legacy support for execute method
              else if (shortcut.execute) {
                console.log(`🎯 [PluginManager] Executing legacy shortcut: ${normalizedShortcut}`);
                return shortcut.execute();
              }
              else {
                console.warn(`⚠️ [PluginManager] Shortcut ${normalizedShortcut} has no callback method`);
              }
            } catch (error) {
              console.error(`❌ [PluginManager] Error executing shortcut ${normalizedShortcut}:`, error);
            }
          };
          
          this.globalShortcuts.set(normalizedShortcut, executor);
          console.log(`✅ [PluginManager] Shortcut registered. Total shortcuts: ${this.globalShortcuts.size}`);
          
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            plugin.shortcuts.set(normalizedShortcut, executor);
          }
          
          return () => {
            console.log(`🗑️ [PluginManager] Unregistering shortcut: "${normalizedShortcut}"`);
            this.globalShortcuts.delete(normalizedShortcut);
            if (plugin) {
              plugin.shortcuts.delete(normalizedShortcut);
            }
          };
        }
      },
      
      settings: {
        load: (pluginId: string) => {
          return cacheUtils.getPluginSettings(pluginId);
        },
        save: (pluginId: string, settings: Record<string, any>) => {
          cacheUtils.setPluginSettings(pluginId, settings);
          this.saveSettingsToFile(pluginId, settings).catch(error => {
            console.error(`[PluginManager] Failed to save settings to file for ${pluginId}:`, error);
          });
        },
        setHasSettings: (pluginId: string, hasSettings: boolean) => {
          cacheUtils.setPluginHasSettings(pluginId, hasSettings);
        },
        getHasSettings: (pluginId: string) => {
          return cacheUtils.getPluginHasSettings(pluginId);
        },
        loadFromFile: async (pluginId: string) => {
          return await this.loadSettingsFromFile(pluginId);
        },
        saveToFile: async (pluginId: string, settings: Record<string, any>) => {
          return await this.saveSettingsToFile(pluginId, settings);
        },
        backup: async (pluginId: string) => {
          return await this.backupPluginSettings(pluginId);
        }
      }
    };
  }


  private async loadSettingsFromFile(pluginId: string): Promise<Record<string, any>> {
    try {
      const result = await invoke<any>('read_plugin_settings', { pluginId });
      return result || {};
    } catch (error) {
      console.error(`[PluginManager] Failed to load settings from file for ${pluginId}:`, error);
      return {};
    }
  }


  private async saveSettingsToFile(pluginId: string, settings: Record<string, any>): Promise<void> {
    try {
      await invoke('write_plugin_settings', { pluginId, settings });
    } catch (error) {
      console.error(`[PluginManager] Failed to save settings to file for ${pluginId}:`, error);
      throw error;
    }
  }

  private async backupPluginSettings(pluginId: string): Promise<string> {
    try {
      const result = await invoke<string>('backup_plugin_settings', { pluginId });
      return result;
    } catch (error) {
      console.error(`[PluginManager] Failed to create backup for ${pluginId}:`, error);
      throw error;
    }
  }
  async initializePluginSettings(pluginId: string): Promise<void> {
    try {
      console.log(`🔧 [PluginManager] Initializing settings for plugin: ${pluginId}`);     
      const fileSettings = await this.loadSettingsFromFile(pluginId);
      
      const cacheSettings = cacheUtils.getPluginSettings(pluginId);
      
      let finalSettings = fileSettings;
      
      if (Object.keys(fileSettings).length === 0 && Object.keys(cacheSettings).length > 0) {
        finalSettings = cacheSettings;
        await this.saveSettingsToFile(pluginId, cacheSettings);
      } else if (Object.keys(fileSettings).length > 0) {
        cacheUtils.setPluginSettings(pluginId, fileSettings);
      }
      
    } catch (error) {
      console.error(`[PluginManager] Failed to initialize settings for ${pluginId}:`, error);
    }
  }

  private async executePlugin(code: string, api: PluginAPI, manifest: PluginManifest): Promise<any> {
    try {
      
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      const require = (moduleId: string) => {
        if (moduleId === 'inkdown-plugin-api') {
          return {
            Plugin: Plugin,
            Notice: class Notice {
              constructor(_: string, _timeout?: number) {
              }
              setMessage(_: string) {
                return this;
              }
              hide() {
                // Hide the notice
              }
            },
            Modal: class Modal {
              constructor(_app: any) {}
              onOpen() {}
              onClose() {}
              open() {}
              close() {}
            },
            PluginSettingTab: class PluginSettingTab {
              app: any;
              plugin: any;
              containerEl: HTMLElement;

              constructor(app: any, plugin: any) {
                this.app = app;
                this.plugin = plugin;
                this.containerEl = document.createElement('div');
              }

              display(): void {
                // Override in subclass
              }

              hide(): void {
                this.containerEl.innerHTML = '';
              }
            },
            Setting: Setting
          };
        }
        throw new Error(`Module '${moduleId}' is not available`);
      };

      class Plugin {
        protected settings: Record<string, any> = {};
        protected cleanupFunctions: (() => void)[] = [];

        constructor(public app: any, public manifest: any) {
          this.app.pluginManager = (globalThis as any).pluginManager;
        }

        async loadSettings(): Promise<void> {
          try {
            console.log(`[Plugin ${this.manifest.id}] Loading settings...`);
            
            this.settings = api.settings.load(this.manifest.id);
            
            if (Object.keys(this.settings).length === 0 && api.settings.loadFromFile) {

              const fileSettings = await api.settings.loadFromFile(this.manifest.id);
              if (Object.keys(fileSettings).length > 0) {
                this.settings = fileSettings;
                api.settings.save(this.manifest.id, this.settings);
              }
            }
            
          } catch (error) {
            console.error(`[Plugin ${this.manifest.id}] Failed to load settings:`, error);
            this.settings = {};
          }
        }

        async saveSettings(): Promise<void> {
          try {
            api.settings.save(this.manifest.id, this.settings);
            
            if (api.settings.saveToFile) {
              await api.settings.saveToFile(this.manifest.id, this.settings);
            }
          } catch (error) {
            console.error(`[Plugin ${this.manifest.id}] Failed to save settings:`, error);
          }
        }

        async reloadSettings(): Promise<void> {          
          try {
            await this.loadSettings();
            
            if (typeof this.onSettingsChanged === 'function') {
              try {
                await this.onSettingsChanged(this.settings);
                console.log(`[Plugin ${this.manifest.id}] Settings change callback completed`);
              } catch (error) {
                console.error(`[Plugin ${this.manifest.id}] Error in onSettingsChanged:`, error);
              }
            }
          } catch (error) {
            console.error(`[Plugin ${this.manifest.id}] Failed to reload settings:`, error);
          }
        }

        getSetting(key: string, defaultValue?: any): any {
          return this.settings[key] ?? defaultValue;
        }

        setSetting(key: string, value: any): void {
          this.settings[key] = value;
          // Immediately persist the change
          this.saveSettings().catch(error => {
            console.error(`[Plugin ${this.manifest.id}] Failed to persist setting change:`, error);
          });
        }

        // Enhanced settings utilities
        getSettingWithValidation(key: string, defaultValue: any, validator?: (value: any) => boolean): any {
          const value = this.settings[key] ?? defaultValue;
          if (validator && !validator(value)) {
            return defaultValue;
          }
          return value;
        }

        async createSettingsBackup(): Promise<string | null> {
          try {
            if (api.settings.backup) {
              return await api.settings.backup(this.manifest.id);
            }
            return null;
          } catch (error) {
            console.error(`[Plugin ${this.manifest.id}] Failed to create settings backup:`, error);
            return null;
          }
        }

        // Override this method in your plugin to react to settings changes
        async onSettingsChanged?(settings: Record<string, any>): Promise<void>;

        addCommand(command: any): () => void {
          const cleanup = api.commands.add(command);
          this.cleanupFunctions.push(cleanup);
          return cleanup;
        }

        addKeyboardShortcut(shortcut: any): () => void {
          const cleanup = api.shortcuts.add(shortcut);
          this.cleanupFunctions.push(cleanup);
          return cleanup;
        }

        createSettingsTab(callback: (containerEl: HTMLElement) => void): () => void {
          
          // Store the settings tab callback in the plugin manager
          const pluginManager = this.app.pluginManager || (globalThis as any).pluginManager;
          if (pluginManager) {
            const plugin = pluginManager.getPlugin(this.manifest.id);
            if (plugin) {
              plugin.settingsTabCallback = callback;
              
              // Update cache to indicate this plugin has settings
              api.settings.setHasSettings(this.manifest.id, true);
            }
          }
          
          return () => {
            if (pluginManager) {
              const plugin = pluginManager.getPlugin(this.manifest.id);
              if (plugin) {
                plugin.settingsTabCallback = undefined;
                // Update cache to indicate this plugin no longer has settings
                api.settings.setHasSettings(this.manifest.id, false);
              }
            }
          };
        }

        addStatusBarItem(item: StatusBarItemConfig): () => void {
          
          const fullId = `${this.manifest.id}.${item.id}`;
          const statusBarItem = {
            ...item,
            id: fullId,
            pluginId: this.manifest.id
          };
          
          // Get plugin manager instance
          const pluginManager = this.app.pluginManager || (globalThis as any).pluginManager;
          if (pluginManager) {
            pluginManager.globalStatusBarItems.set(fullId, statusBarItem);
            
            const plugin = pluginManager.getPlugin(this.manifest.id);
            if (plugin) {
              plugin.statusBarItems.set(item.id, statusBarItem);
            }
            
            pluginManager.notifyListeners();
          }
          
          const cleanup = () => {
            if (pluginManager) {
              pluginManager.globalStatusBarItems.delete(fullId);
              const plugin = pluginManager.getPlugin(this.manifest.id);
              if (plugin) {
                plugin.statusBarItems.delete(item.id);
              }
              pluginManager.notifyListeners();
            }
          };
          
          this.cleanupFunctions.push(cleanup);
          return cleanup;
        }

        registerMarkdownPostProcessor(processor: MarkdownPostProcessor): () => void {
          
          const cleanup = markdownProcessorRegistry.registerPostProcessor(processor);
          this.cleanupFunctions.push(cleanup);
          return cleanup;
        }

        registerMarkdownCodeBlockProcessor(
          language: string, 
          processor: MarkdownCodeBlockProcessor
        ): () => void {
          
          const cleanup = markdownProcessorRegistry.registerCodeBlockProcessor(language, processor);
          this.cleanupFunctions.push(cleanup);
          return cleanup;
        }

        addMenuItem(_location: string, item: any): () => void {
          return () => {
            console.log(`[Plugin ${this.manifest.id}] Removing menu item`);
          };
        }

        // Notification convenience methods
        showNotification(message: string, type?: string): void {
          this.app.showNotification(message, type);
        }

        showInfo(message: string, title?: string, duration?: number): void {
          this.app.showInfo(message, title, duration);
        }

        showSuccess(message: string, title?: string, duration?: number): void {
          this.app.showSuccess(message, title, duration);
        }

        showWarning(message: string, title?: string, duration?: number): void {
          this.app.showWarning(message, title, duration);
        }

        showError(message: string, title?: string, duration?: number): void {
          this.app.showError(message, title, duration);
        }

        async onunload(): Promise<void> {
          this.cleanupFunctions.forEach(cleanup => cleanup());
          this.cleanupFunctions = [];
        }

        onload(): Promise<void> {
          return Promise.resolve();
        }
      }
      
      // Execute plugin code directly
      const fn = new Function('module', 'exports', 'require', 'Plugin', 'console', `
        ${code}
        return module.exports || exports.default || (typeof PluginClass !== 'undefined' ? PluginClass : null);
      `);
      
      const PluginClass = fn(
        module, 
        moduleExports, 
        require, 
        Plugin,
        {
          log: (...args: any[]) => console.log(`[Plugin ${manifest.id}]`, ...args),
          warn: (...args: any[]) => console.warn(`[Plugin ${manifest.id}]`, ...args),
          error: (...args: any[]) => console.error(`[Plugin ${manifest.id}]`, ...args),
          info: (...args: any[]) => console.info(`[Plugin ${manifest.id}]`, ...args),
          debug: (...args: any[]) => console.debug(`[Plugin ${manifest.id}]`, ...args)
        }
      );
      
      if (typeof PluginClass !== 'function') {
        throw new Error('Plugin must export a class that extends Plugin');
      }
      
      const instance = new PluginClass(api, manifest);
      
      if (typeof instance.onload === 'function') {
        await instance.onload();
      }
      
      return instance;
    } catch (error) {
      console.error('[PluginManager] Plugin execution error:', error);
      throw error;
    }
  }
}

export const pluginManager = new PluginManager();