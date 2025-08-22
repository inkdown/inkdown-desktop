import { invoke } from '@tauri-apps/api/core';
import { cacheUtils } from '../utils/localStorage';
import { PluginCommandManager } from './PluginCommandManager';
import { PluginSettingsManager } from './PluginSettingsManager';
import { PluginEditorAPI } from '../plugins/editor/EditorAPI';
import { Setting } from '../plugins/settings/Setting';
import { 
  markdownProcessorRegistry, 
  type MarkdownPostProcessor, 
  type MarkdownCodeBlockProcessor 
} from '../plugins/markdown/MarkdownPostProcessor';
import type { PluginManifest, LoadedPlugin } from '../plugins/types/plugin';

export class PluginManager {
  private plugins = new Map<string, LoadedPlugin>();
  private loadedInstances = new Map<string, any>();
  private listeners = new Set<(state: any) => void>();
  private activeEditorAPI: PluginEditorAPI | null = null;
  private commandManager = new PluginCommandManager();
  private settingsManager = new PluginSettingsManager();

  async scanEnabledPlugins(): Promise<LoadedPlugin[]> {
    try {
      const enabledPluginIds = cacheUtils.getEnabledPlugins();
      if (enabledPluginIds.length === 0) return [];

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
        
        // Auto-enable in background
        this.enablePlugin(pluginInfo.manifest.id).catch(error => {
          console.error(`Failed to auto-enable plugin ${pluginInfo.manifest.id}:`, error);
        });
      }
      
      this.notifyListeners();
      return Array.from(this.plugins.values());
    } catch (error) {
      console.error('Failed to scan enabled plugins:', error);
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
      console.error('Failed to scan plugins:', error);
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

  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return false;

      if (plugin.enabled && plugin.loaded && plugin.instance) {
        return true;
      }

      cacheUtils.setPluginEnabled(pluginId, true);
      
      if (plugin.loaded && plugin.instance) {
        return true;
      }

      const pluginCode = await invoke<string>('read_plugin_file', {
        pluginId: pluginId,
        filePath: plugin.manifest.main
      });

      const api = this.createPluginAPI(pluginId);
      
      // Make plugin manager available globally for plugin access
      (globalThis as any).pluginManager = this;
      
      const result = await this.executePlugin(pluginCode, api, plugin.manifest);
      
      if (result) {
        this.loadedInstances.set(pluginId, result);
        plugin.loaded = true;
        plugin.enabled = true;
        plugin.instance = result;
        
        await this.settingsManager.initializeSettings(pluginId);
        this.notifyListeners();
        return true;
      }
      
      cacheUtils.setPluginEnabled(pluginId, false);
      return false;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      cacheUtils.setPluginEnabled(pluginId, false);
      return false;
    }
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) return false;

      const instance = this.loadedInstances.get(pluginId);
      if (instance && typeof instance.onunload === 'function') {
        await instance.onunload();
      }

      this.commandManager.clearPluginCommands(pluginId);
      this.commandManager.clearPluginShortcuts(plugin.shortcuts);
      
      plugin.shortcuts.clear();
      plugin.commands.clear();
      plugin.statusBarItems.clear();
      
      this.loadedInstances.delete(pluginId);
      plugin.loaded = false;
      plugin.enabled = false;
      plugin.instance = null;
      
      cacheUtils.setPluginEnabled(pluginId, false);
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<boolean> {
    return this.commandManager.executeShortcut(shortcut, event);
  }

  async executeCommand(commandId: string): Promise<boolean> {
    return this.commandManager.executeCommand(commandId);
  }

  getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  hasPluginSettings(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    return !!plugin?.settingsTabCallback;
  }

  getPluginSettingsCallback(pluginId: string): ((containerEl: HTMLElement) => void) | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin?.settingsTabCallback;
  }

  getStatusBarItems(): any[] {
    const items: any[] = [];
    for (const plugin of this.plugins.values()) {
      for (const item of plugin.statusBarItems.values()) {
        items.push(item);
      }
    }
    return items;
  }

  getStatusBarItemsForPlugin(pluginId: string): any[] {
    const plugin = this.plugins.get(pluginId);
    return plugin ? Array.from(plugin.statusBarItems.values()) : [];
  }

  getEnabledPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(p => p.enabled);
  }

  getLoadedPlugins(): LoadedPlugin[] {
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

  async reloadPluginSettings(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.loaded || !plugin.instance) {
        console.log(`Plugin ${pluginId} is not loaded, cannot reload settings`);
        return false;
      }

      if (typeof plugin.instance.reloadSettings === 'function') {
        await plugin.instance.reloadSettings();
        console.log(`Settings reloaded for plugin: ${pluginId}`);
        return true;
      } else {
        console.warn(`Plugin ${pluginId} does not support settings reloading`);
        return false;
      }
    } catch (error) {
      console.error(`Failed to reload settings for plugin ${pluginId}:`, error);
      return false;
    }
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

  private createPluginAPI(pluginId: string) {
    return {
      readFile: async (path: string) => await invoke<string>('read_file', { path }),
      
      writeFile: async (path: string, content: string | ArrayBuffer | Uint8Array) => {
        if (typeof content === 'string') {
          await invoke('write_file', { filePath: path, content });
        } else {
          const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
          await invoke('write_binary_file', { filePath: path, content: Array.from(bytes) });
        }
      },
      
      getActiveFile: async () => {
        try {
          const activeFile = (globalThis as any).__activeFile;
          return activeFile ? {
            path: activeFile.path,
            name: activeFile.name,
            content: activeFile.content
          } : null;
        } catch (error) {
          console.error('Error getting active file:', error);
          return null;
        }
      },
      
      markdownToHTML: async (markdown: string, options: any = {}) => {
        const { markdownToHTML } = await import('../utils/markdown');
        return await markdownToHTML(markdown, options);
      },
      
      saveFileDialog: async (options: any = {}) => {
        try {
          const { save } = await import('@tauri-apps/plugin-dialog');
          return await save(options);
        } catch (error) {
          throw new Error(`Failed to open save dialog: ${error}`);
        }
      },
      
      openExternal: async (url: string) => {
        try {
          window.open(url, '_blank');
        } catch (error) {
          console.error('Failed to open external URL:', error);
        }
      },
      
      setIcon: async (element: HTMLElement | { current: HTMLElement | null }, iconId: string, size: number = 16) => {
        // Import setIcon utility if available
        try {
          const { setIcon } = await import('../utils/iconUtils');
          return await setIcon(element, iconId, size);
        } catch (error) {
          console.warn('setIcon utility not available:', error);
        }
      },
      
      showNotification: (message: string, type: string = 'info') => {
        import('../stores/notificationStore').then(({ useNotificationStore }) => {
          const { addNotification } = useNotificationStore.getState();
          addNotification(message, { type: type as 'info' | 'success' | 'warning' | 'error' });
        });
      },
      
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
      
      commands: {
        add: (command: any) => {
          const cleanup = this.commandManager.addCommand(pluginId, command, this.activeEditorAPI);
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            plugin.commands.set(command.id, command);
          }
          return cleanup;
        },
        execute: async (commandId: string) => await this.commandManager.executeCommand(commandId)
      },
      
      shortcuts: {
        add: (shortcut: any) => {
          const cleanup = this.commandManager.addShortcut(pluginId, shortcut, this.activeEditorAPI);
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            const normalizedShortcut = shortcut.shortcut
              .split('+')
              .map((part: string) => part.trim())
              .map((part: string) => {
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
            plugin.shortcuts.set(normalizedShortcut, cleanup);
          }
          return cleanup;
        }
      },
      
      settings: this.settingsManager.createSettingsAPI(pluginId)
    };
  }

  private async executePlugin(code: string, api: any, manifest: PluginManifest): Promise<any> {
    try {
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      const require = (moduleId: string) => {
        if (moduleId === 'inkdown-plugin-api') {
          return {
            Plugin: class Plugin {
              protected settings: Record<string, any> = {};
              protected cleanupFunctions: (() => void)[] = [];

              constructor(public app: any, public manifest: any) {
                this.app.pluginManager = (globalThis as any).pluginManager;
                // Add API methods to the app object for backwards compatibility
                this.app.markdownToHTML = api.markdownToHTML;
                this.app.saveFileDialog = api.saveFileDialog;
                this.app.openExternal = api.openExternal;
                this.app.setIcon = api.setIcon;
                this.app.showNotification = api.showNotification;
                this.app.showInfo = api.showInfo;
                this.app.showSuccess = api.showSuccess;
                this.app.showWarning = api.showWarning;
                this.app.showError = api.showError;
                this.app.readFile = api.readFile;
                this.app.writeFile = api.writeFile;
                this.app.getActiveFile = api.getActiveFile;
              }

              async loadSettings(): Promise<void> {
                this.settings = api.settings.load(this.manifest.id);
              }

              async saveSettings(): Promise<void> {
                api.settings.save(this.manifest.id, this.settings);
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
                this.saveSettings();
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
                // Placeholder for menu item functionality - not implemented yet
                const cleanup = () => {
                  console.log(`[Plugin ${this.manifest.id}] Removing menu item`);
                };
                this.cleanupFunctions.push(cleanup);
                return cleanup;
              }

              createSettingsTab(callback: (containerEl: HTMLElement) => void): () => void {
                const plugin = (globalThis as any).pluginManager?.getPlugin(this.manifest.id);
                if (plugin) {
                  plugin.settingsTabCallback = callback;
                  api.settings.setHasSettings(this.manifest.id, true);
                }
                
                const cleanup = () => {
                  if (plugin) {
                    plugin.settingsTabCallback = undefined;
                    api.settings.setHasSettings(this.manifest.id, false);
                  }
                };
                
                this.cleanupFunctions.push(cleanup);
                return cleanup;
              }

              addStatusBarItem(item: any): () => void {
                const fullId = `${this.manifest.id}.${item.id}`;
                const statusBarItem = {
                  ...item,
                  id: fullId,
                  pluginId: this.manifest.id
                };
                
                const plugin = (globalThis as any).pluginManager?.getPlugin(this.manifest.id);
                if (plugin) {
                  plugin.statusBarItems.set(item.id, statusBarItem);
                  (globalThis as any).pluginManager?.notifyListeners();
                }
                
                const cleanup = () => {
                  if (plugin) {
                    plugin.statusBarItems.delete(item.id);
                    (globalThis as any).pluginManager?.notifyListeners();
                  }
                };
                
                this.cleanupFunctions.push(cleanup);
                return cleanup;
              }

              showNotification(message: string, type?: string): void {
                api.showNotification(message, type);
              }

              showInfo(message: string, title?: string, duration?: number): void {
                api.showInfo(message, title, duration);
              }

              showSuccess(message: string, title?: string, duration?: number): void {
                api.showSuccess(message, title, duration);
              }

              showWarning(message: string, title?: string, duration?: number): void {
                api.showWarning(message, title, duration);
              }

              showError(message: string, title?: string, duration?: number): void {
                api.showError(message, title, duration);
              }

              async onload(): Promise<void> {
                return Promise.resolve();
              }

              async onunload(): Promise<void> {
                this.cleanupFunctions.forEach(cleanup => cleanup());
                this.cleanupFunctions = [];
                return Promise.resolve();
              }
            },
            Notice: class Notice {
              constructor(_: string, _timeout?: number) {
                // Placeholder for notice functionality
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

      const fn = new Function('module', 'exports', 'require', 'console', `
        ${code}
        return module.exports || exports.default || (typeof PluginClass !== 'undefined' ? PluginClass : null);
      `);
      
      const PluginClass = fn(module, moduleExports, require, {
        log: (...args: any[]) => console.log(`[Plugin ${manifest.id}]`, ...args),
        warn: (...args: any[]) => console.warn(`[Plugin ${manifest.id}]`, ...args),
        error: (...args: any[]) => console.error(`[Plugin ${manifest.id}]`, ...args),
      });
      
      if (typeof PluginClass !== 'function') {
        throw new Error('Plugin must export a class that extends Plugin');
      }
      
      const instance = new PluginClass(api, manifest);
      
      if (typeof instance.onload === 'function') {
        await instance.onload();
      }
      
      return instance;
    } catch (error) {
      console.error('Plugin execution error:', error);
      throw error;
    }
  }
}

export const pluginManager = new PluginManager();