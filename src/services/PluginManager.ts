import { invoke } from '@tauri-apps/api/core';
import { cacheUtils } from '../utils/localStorage';
import { setIcon } from '../utils/iconUtils';
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

  async scanPlugins(): Promise<LoadedPlugin[]> {
    try {
      console.log('🔍 [PluginManager] Scanning plugins directory...');
      const pluginInfos = await invoke<any[]>('scan_plugins_directory');
      console.log(`📦 [PluginManager] Found ${pluginInfos.length} plugins:`, pluginInfos.map(p => p.manifest?.id || 'unknown'));
      
      for (const pluginInfo of pluginInfos) {
        const isEnabled = cacheUtils.isPluginEnabled(pluginInfo.manifest.id);
        console.log(`🔧 [PluginManager] Plugin ${pluginInfo.manifest.id} - enabled: ${isEnabled}`);
        
        // Sempre registra o plugin (para mostrar na UI), mas marca corretamente o status
        const loadedPlugin: LoadedPlugin = {
          ...pluginInfo,
          enabled: isEnabled,
          loaded: false, // Código não foi carregado ainda
          instance: null,
          shortcuts: new Map(),
          commands: new Map(),
          statusBarItems: new Map()
        };
        
        this.plugins.set(pluginInfo.manifest.id, loadedPlugin);
      }
      
      console.log(`✅ [PluginManager] Total plugins in manager: ${this.plugins.size}`);
      this.notifyListeners();
      
      // Auto-enable plugins that are marked as enabled in cache
      for (const plugin of this.plugins.values()) {
        if (plugin.enabled && !plugin.loaded && !plugin.instance) {
          console.log(`🔄 [PluginManager] Auto-enabling plugin: ${plugin.manifest.id}`);
          this.enablePlugin(plugin.manifest.id).catch(error => {
            console.error(`❌ [PluginManager] Failed to auto-enable plugin ${plugin.manifest.id}:`, error);
          });
        }
      }
      
      return Array.from(this.plugins.values());
    } catch (error) {
      console.error('❌ [PluginManager] Failed to scan plugins:', error);
      return [];
    }
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

      // Verificação se o plugin deve ser carregado
      if (!this.shouldLoadPlugin(pluginId)) {
        console.log(`❌ [PluginManager] Plugin ${pluginId} should not be loaded`);
        return false;
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
        
        console.log(`✅ [PluginManager] Plugin ${pluginId} enabled successfully`);
        console.log(`📊 [PluginManager] Plugin shortcuts registered: ${plugin.shortcuts.size}`);
        console.log(`📊 [PluginManager] Global shortcuts total: ${this.globalShortcuts.size}`);
        
        cacheUtils.setPluginEnabled(pluginId, true);
        this.notifyListeners();
        
        // Force immediate state update to ensure UI and keyboard shortcuts are in sync
        setTimeout(() => this.notifyListeners(), 0);
        
        return true;
      }
      
      console.log(`❌ [PluginManager] Plugin ${pluginId} execution failed`);
      return false;
    } catch (error) {
      console.error(`❌ [PluginManager] Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      console.log(`🔄 [PluginManager] Disabling plugin: ${pluginId}`);
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        console.log(`❌ [PluginManager] Plugin ${pluginId} not found`);
        return false;
      }

      const instance = this.loadedInstances.get(pluginId);
      if (instance && typeof instance.onunload === 'function') {
        console.log(`📤 [PluginManager] Calling onunload for plugin: ${pluginId}`);
        await instance.onunload();
      }

      console.log(`🗑️ [PluginManager] Removing shortcuts for plugin: ${pluginId}`);
      if (plugin.shortcuts) {
        for (const [shortcut] of plugin.shortcuts) {
          this.globalShortcuts.delete(shortcut);
          console.log(`🗑️ [PluginManager] Removed shortcut: ${shortcut}`);
        }
      }
      
      plugin.shortcuts.clear();
      plugin.commands.clear();
      plugin.statusBarItems.clear();
      
      console.log(`🗑️ [PluginManager] Removing commands for plugin: ${pluginId}`);
      for (const [command] of this.globalCommands.entries()) {
        if (command.startsWith(pluginId + '.')) {
          this.globalCommands.delete(command);
          console.log(`🗑️ [PluginManager] Removed command: ${command}`);
        }
      }

      console.log(`🗑️ [PluginManager] Removing status bar items for plugin: ${pluginId}`);
      for (const [itemId] of this.globalStatusBarItems.entries()) {
        if (itemId.startsWith(pluginId + '.')) {
          this.globalStatusBarItems.delete(itemId);
          console.log(`🗑️ [PluginManager] Removed status bar item: ${itemId}`);
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
        console.log(`🧹 [PluginManager] Cleaned up global references for plugin: ${pluginId}`);
      }
      
      console.log(`✅ [PluginManager] Plugin ${pluginId} disabled successfully`);
      console.log(`📊 [PluginManager] Global shortcuts remaining: ${this.globalShortcuts.size}`);
      
      cacheUtils.setPluginEnabled(pluginId, false);
      this.notifyListeners();
      
      // Force immediate state update to ensure UI and keyboard shortcuts are in sync
      setTimeout(() => this.notifyListeners(), 0);
      
      return true;
    } catch (error) {
      console.error(`❌ [PluginManager] Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getPluginSettings(pluginId: string): any {
    const plugin = this.plugins.get(pluginId);
    return plugin?.settingsConfig;
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

    console.log(`🔍 [PluginManager] Plugin ${pluginId} load check:`, {
      existsInRegistry: !!plugin,
      enabledInCache: isEnabledInCache,
      alreadyLoaded: isAlreadyLoaded
    });

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

  async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<boolean> {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    console.log(`🎹 [PluginManager] Trying to execute shortcut: "${shortcut}" -> normalized: "${normalizedShortcut}"`);
    console.log(`🎹 [PluginManager] Available shortcuts:`, Array.from(this.globalShortcuts.keys()));
    
    const handler = this.globalShortcuts.get(normalizedShortcut);
    
    if (handler) {
      console.log(`✅ [PluginManager] Found handler for shortcut: "${normalizedShortcut}"`);
      try {
        await handler();
        event.preventDefault();
        console.log(`🎯 [PluginManager] Successfully executed shortcut: "${normalizedShortcut}"`);
        return true;
      } catch (error) {
        console.error(`❌ [PluginManager] Failed to execute shortcut "${normalizedShortcut}":`, error);
        return false;
      }
    }
    
    console.log(`❌ [PluginManager] No handler found for shortcut: "${normalizedShortcut}"`);
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
        console.log(`[${type.toUpperCase()}] ${message}`);
      },

      setIcon: async (element: HTMLElement | { current: HTMLElement | null }, iconId: string, size: number = 16) => {
        return await setIcon(element, iconId, size);
      },
      
      commands: {
        add: (command: any) => {
          const fullId = `${pluginId}.${command.id}`;
          this.globalCommands.set(fullId, command.execute);
          
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
          
          this.globalShortcuts.set(normalizedShortcut, shortcut.execute);
          console.log(`✅ [PluginManager] Shortcut registered. Total shortcuts: ${this.globalShortcuts.size}`);
          
          const plugin = this.plugins.get(pluginId);
          if (plugin) {
            plugin.shortcuts.set(normalizedShortcut, shortcut.execute);
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
        load: (pluginId: string) => cacheUtils.getPluginSettings(pluginId),
        save: (pluginId: string, settings: Record<string, any>) => {
          cacheUtils.setPluginSettings(pluginId, settings);
        },
        setHasSettings: (pluginId: string, hasSettings: boolean) => {
          cacheUtils.setPluginHasSettings(pluginId, hasSettings);
        },
        getHasSettings: (pluginId: string) => {
          return cacheUtils.getPluginHasSettings(pluginId);
        }
      }
    };
  }

  private async executePlugin(code: string, api: PluginAPI, manifest: PluginManifest): Promise<any> {
    try {
      console.log(`⚡ [PluginManager] Executing plugin code directly: ${manifest.id}`);
      
      // Create a simple environment for the plugin
      const moduleExports = {};
      const module = { exports: moduleExports };
      
      // Create a safe require function
      const require = (moduleId: string) => {
        if (moduleId === 'inkdown-plugin-api') {
          // Return an object that mimics the inkdown-plugin-api module
          return {
            Plugin: Plugin,
            Notice: class Notice {
              constructor(message: string, _timeout?: number) {
                console.log(`📝 [Notice] ${message}`);
                // In a real implementation, this would show a notification in the UI
              }
              setMessage(message: string) {
                console.log(`📝 [Notice] ${message}`);
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
            Setting: class Setting {
              settingEl: HTMLElement;

              constructor(containerEl: HTMLElement) {
                this.settingEl = document.createElement('div');
                this.settingEl.className = 'setting-item';
                containerEl.appendChild(this.settingEl);
              }

              setName(name: string): this {
                const nameEl = document.createElement('div');
                nameEl.className = 'setting-item-name';
                nameEl.textContent = name;
                this.settingEl.appendChild(nameEl);
                return this;
              }

              setDesc(desc: string): this {
                const descEl = document.createElement('div');
                descEl.className = 'setting-item-description';
                descEl.textContent = desc;
                this.settingEl.appendChild(descEl);
                return this;
              }

              addText(cb: (text: any) => void): this {
                const controlEl = document.createElement('div');
                controlEl.className = 'setting-item-control';
                
                const textComponent = {
                  inputEl: document.createElement('input') as HTMLInputElement,
                  setValue: function(value: string) {
                    this.inputEl.value = value;
                    return this;
                  },
                  getValue: function() {
                    return this.inputEl.value;
                  },
                  setPlaceholder: function(placeholder: string) {
                    this.inputEl.placeholder = placeholder;
                    return this;
                  },
                  onChange: function(callback: (value: string) => void) {
                    this.inputEl.addEventListener('input', (e) => {
                      callback((e.target as HTMLInputElement).value);
                    });
                    return this;
                  }
                };
                
                textComponent.inputEl.type = 'text';
                textComponent.inputEl.className = 'setting-text-input';
                controlEl.appendChild(textComponent.inputEl);
                this.settingEl.appendChild(controlEl);
                
                cb(textComponent);
                return this;
              }

              addToggle(cb: (toggle: any) => void): this {
                const controlEl = document.createElement('div');
                controlEl.className = 'setting-item-control';
                
                const toggleComponent = {
                  toggleEl: document.createElement('input') as HTMLInputElement,
                  setValue: function(value: boolean) {
                    this.toggleEl.checked = value;
                    return this;
                  },
                  getValue: function() {
                    return this.toggleEl.checked;
                  },
                  onChange: function(callback: (value: boolean) => void) {
                    this.toggleEl.addEventListener('change', (e) => {
                      callback((e.target as HTMLInputElement).checked);
                    });
                    return this;
                  }
                };
                
                toggleComponent.toggleEl.type = 'checkbox';
                toggleComponent.toggleEl.className = 'setting-toggle-input';
                controlEl.appendChild(toggleComponent.toggleEl);
                this.settingEl.appendChild(controlEl);
                
                cb(toggleComponent);
                return this;
              }

              addDropdown(cb: (dropdown: any) => void): this {
                const controlEl = document.createElement('div');
                controlEl.className = 'setting-item-control';
                
                const dropdownComponent = {
                  selectEl: document.createElement('select') as HTMLSelectElement,
                  addOption: function(value: string, text: string) {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = text;
                    this.selectEl.appendChild(option);
                    return this;
                  },
                  addOptions: function(options: Record<string, string>) {
                    Object.entries(options).forEach(([value, text]) => {
                      this.addOption(value, text);
                    });
                    return this;
                  },
                  setValue: function(value: string) {
                    this.selectEl.value = value;
                    return this;
                  },
                  getValue: function() {
                    return this.selectEl.value;
                  },
                  onChange: function(callback: (value: string) => void) {
                    this.selectEl.addEventListener('change', (e) => {
                      callback((e.target as HTMLSelectElement).value);
                    });
                    return this;
                  }
                };
                
                dropdownComponent.selectEl.className = 'setting-dropdown-input';
                controlEl.appendChild(dropdownComponent.selectEl);
                this.settingEl.appendChild(controlEl);
                
                cb(dropdownComponent);
                return this;
              }
            }
          };
        }
        throw new Error(`Module '${moduleId}' is not available`);
      };

      // Create Plugin base class
      class Plugin {
        protected settings: Record<string, any> = {};
        protected cleanupFunctions: (() => void)[] = [];

        constructor(public app: any, public manifest: any) {
          // Make sure the app has a reference to the plugin manager
          this.app.pluginManager = (globalThis as any).pluginManager;
        }

        async loadSettings(): Promise<void> {
          this.settings = api.settings.load(this.manifest.id);
        }

        async saveSettings(): Promise<void> {
          api.settings.save(this.manifest.id, this.settings);
        }

        getSetting(key: string, defaultValue?: any): any {
          return this.settings[key] ?? defaultValue;
        }

        setSetting(key: string, value: any): void {
          this.settings[key] = value;
        }

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

        registerSettings(config: any): () => void {
          console.log(`📋 [Plugin ${this.manifest.id}] Registering settings config:`, config);
          
          // Store the settings config in the plugin manager
          const pluginManager = this.app.pluginManager || (globalThis as any).pluginManager;
          if (pluginManager) {
            const plugin = pluginManager.getPlugin(this.manifest.id);
            if (plugin) {
              plugin.settingsConfig = config;
              console.log(`📋 [Plugin ${this.manifest.id}] Settings config stored successfully`);
              
              // Update cache to indicate this plugin has settings
              api.settings.setHasSettings(this.manifest.id, true);
            }
          }
          
          return () => {
            console.log(`📋 [Plugin ${this.manifest.id}] Unregistering settings config`);
            if (pluginManager) {
              const plugin = pluginManager.getPlugin(this.manifest.id);
              if (plugin) {
                plugin.settingsConfig = undefined;
                // Update cache to indicate this plugin no longer has settings
                api.settings.setHasSettings(this.manifest.id, false);
              }
            }
          };
        }

        addStatusBarItem(item: StatusBarItemConfig): () => void {
          console.log(`📊 [Plugin ${this.manifest.id}] Adding status bar item:`, item.text);
          
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
            
            // Notify listeners to update UI
            pluginManager.notifyListeners();
          }
          
          const cleanup = () => {
            console.log(`📊 [Plugin ${this.manifest.id}] Removing status bar item: ${item.id}`);
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

        addMenuItem(_location: string, item: any): () => void {
          console.log(`📋 [Plugin ${this.manifest.id}] Adding menu item:`, item.title);
          // For now, just log - menu implementation can be added later
          return () => {
            console.log(`📋 [Plugin ${this.manifest.id}] Removing menu item`);
          };
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
      
      console.log(`🏗️ [PluginManager] Creating plugin instance`);
      const instance = new PluginClass(api, manifest);
      
      if (typeof instance.onload === 'function') {
        console.log(`🚀 [PluginManager] Calling plugin onload method`);
        await instance.onload();
      }
      
      return instance;
    } catch (error) {
      console.error('❌ [PluginManager] Plugin execution error:', error);
      throw error;
    }
  }
}

export const pluginManager = new PluginManager();