import { invoke } from '@tauri-apps/api/core';
import { PluginManifest, LoadedPlugin, PluginSettingsConfig } from '../types/plugins';
import { cacheUtils } from '../utils/localStorage';
import { markdownToHTML } from '../utils/markdown';

interface PluginShortcut {
  id: string;
  pluginId: string;
  shortcut: string;
  execute: () => Promise<void> | void;
  condition?: () => boolean;
}

class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginSettingsConfigs: Map<string, PluginSettingsConfig> = new Map();
  private pluginShortcuts: Map<string, PluginShortcut> = new Map();
  private initialized = false;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.scanPlugins();
      await this.loadEnabledPlugins();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize plugin manager:', error);
    }
  }

  private async getPluginsDirectory(): Promise<string> {
    try {
      const configDir = await invoke<string>('get_app_config_dir');
      return `${configDir}/plugins`;
    } catch (error) {
      console.error('Failed to get plugins directory:', error);
      throw error;
    }
  }

  private async scanPlugins(): Promise<void> {
    try {
      const pluginsDir = await this.getPluginsDirectory();
      
      const directoryStructure = await invoke<any>('scan_directory', { path: pluginsDir });
      
      if (directoryStructure.children) {
        for (const entry of directoryStructure.children) {
          if (entry.is_directory) {
            await this.loadPluginManifest(entry.name);
          }
        }
      }
    } catch (error) {
      console.error('Failed to scan plugins:', error);
    }
  }

  private async loadPluginManifest(pluginId: string): Promise<void> {
    try {
      const pluginsDir = await this.getPluginsDirectory();
      const manifestPath = `${pluginsDir}/${pluginId}/manifest.json`;
      
      const manifestContent = await invoke<string>('read_file', { path: manifestPath });
      const manifest: PluginManifest = JSON.parse(manifestContent);
      
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        console.error(`Invalid manifest for plugin ${pluginId}`);
        return;
      }

      const plugin: LoadedPlugin = {
        manifest,
        instance: null,
        enabled: cacheUtils.isPluginEnabled(pluginId),
        loaded: false
      };

      this.plugins.set(pluginId, plugin);
    } catch (error) {
      console.error(`Failed to load manifest for plugin ${pluginId}:`, error);
    }
  }

  private validateManifest(manifest: PluginManifest): boolean {
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      manifest.main &&
      manifest.minAppVersion
    );
  }

  private async loadEnabledPlugins(): Promise<void> {
    const enabledPlugins = cacheUtils.getEnabledPlugins();
    
    for (const pluginId of enabledPlugins) {
      await this.loadPlugin(pluginId);
    }
  }

  async loadPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        console.error(`Plugin ${pluginId} not found`);
        return false;
      }

      if (plugin.loaded) {
        console.log(`Plugin ${pluginId} already loaded`);
        return true;
      }

      const pluginsDir = await this.getPluginsDirectory();
      const pluginPath = `${pluginsDir}/${pluginId}/${plugin.manifest.main}`;
      
      // Load plugin code
      let pluginCode: string;
      try {
        pluginCode = await invoke<string>('read_file', { path: pluginPath });
      } catch (error) {
        plugin.error = `Main file not found: ${plugin.manifest.main}`;
        return false;
      }
      
      try {
        // Create sandboxed environment for plugin
        const pluginModule = await this.createPluginSandbox(pluginCode, pluginId);
        
        if (pluginModule && (pluginModule.default || typeof pluginModule === 'function')) {
          const PluginClass = pluginModule.default || pluginModule;
          const instance = new PluginClass();
          
          // Initialize plugin with API
          if (instance._initialize) {
            instance._initialize(this.createAppAPI(pluginId), this.createEditorAPI());
          }
          
          // Call plugin lifecycle
          await instance.onLoad();
          
          plugin.instance = instance;
          plugin.loaded = true;
          plugin.error = undefined;
          
          console.log(`Plugin ${pluginId} loaded successfully`);
          return true;
        } else {
          console.log(plugin.error);
          plugin.error = 'Invalid plugin export';
          return false;
        }
      } catch (error) {
        plugin.error = `Failed to load plugin: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`Failed to load plugin ${pluginId}:`, error);
        return false;
      }
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        plugin.error = error instanceof Error ? error.message : 'Unknown error';
      }
      return false;
    }
  }

  private async createPluginSandbox(code: string, pluginId: string): Promise<any> {
    try {
      // Create a safe evaluation environment with better module support
      const moduleCode = `
        const module = { exports: {} };
        const exports = module.exports;
        
        try {
          ${code}
          
          // Support both CommonJS and ES6-style exports
          if (typeof module.exports === 'function') {
            return module.exports;
          } else if (module.exports && typeof module.exports.default === 'function') {
            return module.exports;
          } else if (module.exports && Object.keys(module.exports).length > 0) {
            return module.exports;
          } else {
            throw new Error('Plugin must export a class or function');
          }
        } catch (err) {
          throw new Error('Plugin execution error: ' + err.message);
        }
      `;
      
      const func = new Function('require', 'console', moduleCode);
      const requireFunc = this.createRequireFunction(pluginId);
      const sandboxConsole = {
        log: (...args: any[]) => console.log(`[Plugin ${pluginId}]`, ...args),
        error: (...args: any[]) => console.error(`[Plugin ${pluginId}]`, ...args),
        warn: (...args: any[]) => console.warn(`[Plugin ${pluginId}]`, ...args),
        info: (...args: any[]) => console.info(`[Plugin ${pluginId}]`, ...args)
      };
      
      return func(requireFunc, sandboxConsole);
    } catch (error) {
      console.error(`Failed to create sandbox for plugin ${pluginId}:`, error);
      throw error;
    }
  }

  private createBasePluginClass() {
    return class BasePlugin {
      manifest: any = {};
      protected app: any;
      protected editor: any;
      protected settings: Record<string, any> = {};
      private cleanupFunctions: Array<() => void> = [];

      _initialize(app: any, editor: any): void {
        this.app = app;
        this.editor = editor;
      }

      async loadSettings(): Promise<void> {
        this.settings = await this.app.loadSettings(this.manifest.id);
      }

      async saveSettings(settings: Record<string, any>): Promise<void> {
        this.settings = settings;
        await this.app.saveSettings(this.manifest.id, settings);
      }

      getSetting(key: string, defaultValue?: any): any {
        return this.settings[key] ?? defaultValue;
      }

      setSetting(key: string, value: any): void {
        this.settings[key] = value;
      }

      addCommand(command: any) {
        const cleanup = this.app.addCommand(command);
        this.cleanupFunctions.push(cleanup);
        return cleanup;
      }

      registerSettings(config: any) {
        const cleanup = this.app.registerSettings(this.manifest.id, config);
        this.cleanupFunctions.push(cleanup);
        return cleanup;
      }

      addStatusBarItem(item: any) {
        const cleanup = this.app.addStatusBarItem(item);
        this.cleanupFunctions.push(cleanup);
        return cleanup;
      }

      addKeyboardShortcut(shortcut: any) {
        const cleanup = this.app.addKeyboardShortcut(shortcut);
        this.cleanupFunctions.push(cleanup);
        return cleanup;
      }

      showNotification(message: string, type?: string) {
        this.app.showNotification(message, type);
      }

      // Lifecycle methods - to be overridden
      async onLoad(): Promise<void> {}
      async onUnload(): Promise<void> {
        this.cleanupFunctions.forEach(cleanup => cleanup());
        this.cleanupFunctions = [];
      }
      async onEnable?(): Promise<void> {}
      async onDisable?(): Promise<void> {}
    };
  }

  private createSettingsBuilder() {
    return function createSettings() {
      const groups: any[] = [];
      let currentGroup: any = null;
      
      const builder = {
        addGroup(id: string, name: string, description?: string) {
          currentGroup = {
            id,
            name,
            description,
            settings: [] as any[]
          };
          groups.push(currentGroup);
          return builder;
        },
        
        addText(key: string, name: string, defaultValue: string, options?: any) {
          if (!currentGroup) throw new Error('Must call addGroup() first');
          currentGroup.settings.push({
            key, name, type: 'text', defaultValue,
            description: options?.description,
            placeholder: options?.placeholder
          });
          return builder;
        },
        
        addNumber(key: string, name: string, defaultValue: number, options?: any) {
          if (!currentGroup) throw new Error('Must call addGroup() first');
          currentGroup.settings.push({
            key, name, type: 'number', defaultValue,
            description: options?.description,
            min: options?.min,
            max: options?.max,
            step: options?.step
          });
          return builder;
        },
        
        addBoolean(key: string, name: string, defaultValue: boolean, description?: string) {
          if (!currentGroup) throw new Error('Must call addGroup() first');
          currentGroup.settings.push({
            key, name, type: 'boolean', defaultValue, description
          });
          return builder;
        },
        
        addDropdown(key: string, name: string, defaultValue: string, options: any[], description?: string) {
          if (!currentGroup) throw new Error('Must call addGroup() first');
          currentGroup.settings.push({
            key, name, type: 'dropdown', defaultValue, options, description
          });
          return builder;
        },
        
        addTextarea(key: string, name: string, defaultValue: string, options?: any) {
          if (!currentGroup) throw new Error('Must call addGroup() first');
          currentGroup.settings.push({
            key, name, type: 'textarea', defaultValue,
            description: options?.description,
            placeholder: options?.placeholder,
            rows: options?.rows
          });
          return builder;
        },
        
        build() {
          return { groups };
        }
      };
      
      return builder;
    };
  }

  private createRequireFunction(pluginId: string) {
    return (moduleName: string) => {
      console.log(`[Plugin ${pluginId}] Requiring module: ${moduleName}`);
      
      const allowedModules: Record<string, any> = {
        'inkdown-plugin-api': {
          BasePlugin: this.createBasePluginClass(),
          createSettings: this.createSettingsBuilder()
        },
        'path': {
          join: (...parts: string[]) => parts.join('/'),
          dirname: (path: string) => path.split('/').slice(0, -1).join('/'),
          basename: (path: string) => path.split('/').pop() || ''
        },
        'os': {
          homedir: () => '~',
          tmpdir: () => '/tmp'
        }
      };
      
      if (allowedModules[moduleName]) {
        console.log(`[Plugin ${pluginId}] Module ${moduleName} found`);
        return allowedModules[moduleName];
      }
      
      console.error(`[Plugin ${pluginId}] Module '${moduleName}' is not allowed`);
      throw new Error(`Module '${moduleName}' is not allowed`);
    };
  }

  private createAppAPI(pluginId: string): any {
    return {
      registerSettings: (id: string, config: PluginSettingsConfig) => {
        this.pluginSettingsConfigs.set(id, config);
        return () => this.pluginSettingsConfigs.delete(id);
      },
      
      loadSettings: async (id: string) => {
        return cacheUtils.getPluginSettings(id);
      },
      
      saveSettings: async (id: string, settings: Record<string, any>) => {
        cacheUtils.setPluginSettings(id, settings);
      },

      markdownToHTML: async (markdown: string, options: any = {}) => {
        return await markdownToHTML(markdown, options);
      },

      htmlToMarkdown: async (_html: string) => {
        // Implementar se necessário no futuro
        throw new Error('htmlToMarkdown not implemented yet');
      },

      get state() {
        return {
          activeFile: null,
          workspace: { path: '', name: '', files: [] },
          settings: { vimMode: false, showLineNumbers: true, fontSize: 14, fontFamily: 'Arial', theme: 'light' as const },
          theme: { mode: 'light' as const, colors: {} }
        };
      },

      getActiveFile: async () => {
        try {
          if (window.__activeFilePath) {
            const filePath = window.__activeFilePath;
            const fileName = filePath.split('/').pop() || 'unknown';
            
            try {
              const content = await invoke<string>('read_file', { path: filePath });
              return {
                path: filePath,
                name: fileName,
                content
              };
            } catch (error) {
              throw new Error(`Failed to read file: ${error}`);
            }
          }
          
          return null;
        } catch (error) {
          console.error(`[Plugin ${pluginId}] Error getting active file:`, error);
          return null;
        }
      },

      // Parse markdown file to HTML directly
      parseMarkdownFile: async (filePath: string, options: any = {}) => {
        try {
          const content = await invoke<string>('read_file', { path: filePath });
          return await markdownToHTML(content, options);
        } catch (error) {
          throw new Error(`Failed to parse markdown file: ${error}`);
        }
      },

      on: (_eventType: string, _listener: Function) => {
        // Event system placeholder
        return () => {};
      },

      off: (_eventType: string, _listener: Function) => {
        // Event system placeholder
      },

      emit: (_event: any) => {
        // Event system placeholder
      },

      addCommand: (command: any) => {
        // Command system placeholder
        console.log(`Plugin ${pluginId} registered command:`, command.id);
        return () => {};
      },

      removeCommand: (_commandId: string) => {
        // Command system placeholder
      },

      executeCommand: async (_commandId: string) => {
        // Command system placeholder
      },

      addKeyboardShortcut: (shortcut: any) => {
        console.log(`Plugin ${pluginId} registered shortcut:`, shortcut.id, shortcut.shortcut);
        return this.addPluginShortcut(pluginId, shortcut);
      },

      removeKeyboardShortcut: (shortcutId: string) => {
        this.removePluginShortcut(`${pluginId}.${shortcutId}`);
      },

      addMenuItem: (_location: string, _item: any) => {
        // Menu system placeholder
        return () => {};
      },

      removeMenuItem: (_itemId: string) => {
        // Menu system placeholder
      },

      addStatusBarItem: (item: any) => {
        // Status bar placeholder
        console.log(`Plugin ${pluginId} added status bar item:`, item.id);
        return () => {};
      },

      removeStatusBarItem: (_itemId: string) => {
        // Status bar placeholder
      },

      addEditorExtension: (_extension: any) => {
        // Editor extension placeholder
        return () => {};
      },

      removeEditorExtension: (_extensionId: string) => {
        // Editor extension placeholder
      },

      readFile: async (path: string) => {
        try {
          return await invoke<string>('read_file', { path });
        } catch (error) {
          throw new Error(`Failed to read file: ${error}`);
        }
      },

      writeFile: async (path: string, content: string | ArrayBuffer | Uint8Array) => {
        try {
          console.log(`[Plugin ${pluginId}] Writing file to:`, path);
          
          if (typeof content === 'string') {
            console.log(`[Plugin ${pluginId}] Content length:`, content.length);
            await invoke('write_file', { filePath: path, content });
          } else {
            // Para conteúdo binário (PDF, etc)
            const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
            console.log(`[Plugin ${pluginId}] Binary content length:`, bytes.length);
            await invoke('write_binary_file', { filePath: path, content: Array.from(bytes) });
          }
          
          console.log(`[Plugin ${pluginId}] File written successfully`);
        } catch (error) {
          console.error(`[Plugin ${pluginId}] Write file error:`, error);
          throw new Error(`Failed to write file: ${error}`);
        }
      },

      createFile: async (path: string, content?: string) => {
        try {
          // Para criar arquivo, vamos usar write_file se o conteúdo for fornecido
          if (content !== undefined) {
            await invoke('write_file', { filePath: path, content });
          } else {
            // Se não tem conteúdo, criar um arquivo vazio
            await invoke('write_file', { filePath: path, content: '' });
          }
        } catch (error) {
          throw new Error(`Failed to create file: ${error}`);
        }
      },

      deleteFile: async (path: string) => {
        try {
          await invoke('delete_file_or_directory', { path });
        } catch (error) {
          throw new Error(`Failed to delete file: ${error}`);
        }
      },

      showNotification: (message: string, type: string = 'info') => {
        console.log(`[Plugin ${pluginId}] ${type.toUpperCase()}: ${message}`);
      },

      showToast: (message: string, _duration?: number) => {
        console.log(`[Plugin ${pluginId}] Toast: ${message}`);
      },

      showConfirm: async (title: string, message: string) => {
        return window.confirm(`${title}\n\n${message}`);
      },

      showPrompt: async (title: string, message: string, defaultValue?: string) => {
        return window.prompt(`${title}\n\n${message}`, defaultValue);
      },

      openExternal: async (url: string) => {
        window.open(url, '_blank');
      },

      copyToClipboard: async (text: string) => {
        await navigator.clipboard.writeText(text);
      },

      readFromClipboard: async () => {
        return await navigator.clipboard.readText();
      },

      // File/Directory Dialogs using Tauri opener
      openFileDialog: async (options?: {
        title?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
        multiple?: boolean;
        directory?: boolean;
      }) => {
        try {
          const { open } = await import('@tauri-apps/plugin-dialog');
          return await open(options);
        } catch (error) {
          throw new Error(`Failed to open file dialog: ${error}`);
        }
      },

      saveFileDialog: async (options?: {
        title?: string;
        defaultPath?: string;
        filters?: Array<{ name: string; extensions: string[] }>;
      }) => {
        try {
          console.log(`[Plugin ${pluginId}] Opening save dialog with options:`, options);
          const { save } = await import('@tauri-apps/plugin-dialog');
          const result = await save(options);
          console.log(`[Plugin ${pluginId}] Save dialog result:`, result);
          return result;
        } catch (error) {
          console.error(`[Plugin ${pluginId}] Save dialog error:`, error);
          throw new Error(`Failed to open save dialog: ${error}`);
        }
      }
    };
  }

  private createEditorAPI(): any {
    return {
      // Implement the EditorAPI interface
      // This would interface with your CodeMirror instance
    };
  }

  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin || !plugin.loaded) {
        return true;
      }

      if (plugin.instance?.onUnload) {
        await plugin.instance.onUnload();
      }

      plugin.instance = null;
      plugin.loaded = false;
      plugin.error = undefined;
      
      // Clean up settings config
      this.pluginSettingsConfigs.delete(pluginId);
      
      console.log(`Plugin ${pluginId} unloaded successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    const success = await this.loadPlugin(pluginId);
    if (success) {
      plugin.enabled = true;
      cacheUtils.setPluginEnabled(pluginId, true);
      
      if (plugin.instance?.onEnable) {
        await plugin.instance.onEnable();
      }
    }
    
    return success;
  }

  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    if (plugin.instance?.onDisable) {
      await plugin.instance.onDisable();
    }

    const success = await this.unloadPlugin(pluginId);
    if (success) {
      plugin.enabled = false;
      cacheUtils.setPluginEnabled(pluginId, false);
    }
    
    return success;
  }

  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginSettings(pluginId: string): PluginSettingsConfig | undefined {
    return this.pluginSettingsConfigs.get(pluginId);
  }

  async refreshPlugins(): Promise<void> {
    // Clear current plugins (but don't unload enabled ones)
    const enabledPlugins = Array.from(this.plugins.values())
      .filter(p => p.enabled)
      .map(p => p.manifest.id);

    this.plugins.clear();
    this.pluginSettingsConfigs.clear();
    this.pluginShortcuts.clear();
    
    // Rescan
    await this.scanPlugins();
    
    // Reload enabled plugins
    for (const pluginId of enabledPlugins) {
      await this.loadPlugin(pluginId);
    }
  }

  // Keyboard Shortcuts Management
  addPluginShortcut(pluginId: string, shortcut: {
    id: string;
    name: string;
    description?: string;
    shortcut: string;
    category?: string;
    execute(): Promise<void> | void;
    condition?(): boolean;
  }): () => void {
    const fullId = `${pluginId}.${shortcut.id}`;
    
    const pluginShortcut: PluginShortcut = {
      id: fullId,
      pluginId,
      shortcut: shortcut.shortcut,
      execute: shortcut.execute,
      condition: shortcut.condition
    };
    
    this.pluginShortcuts.set(fullId, pluginShortcut);
    
    // Return cleanup function
    return () => {
      this.pluginShortcuts.delete(fullId);
    };
  }

  removePluginShortcut(shortcutId: string): void {
    this.pluginShortcuts.delete(shortcutId);
  }

  getAllPluginShortcuts(): PluginShortcut[] {
    return Array.from(this.pluginShortcuts.values());
  }

  getPluginShortcuts(pluginId: string): PluginShortcut[] {
    return Array.from(this.pluginShortcuts.values())
      .filter(shortcut => shortcut.pluginId === pluginId);
  }

  async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<boolean> {
    const shortcuts = Array.from(this.pluginShortcuts.values())
      .filter(s => s.shortcut === shortcut);
    
    for (const pluginShortcut of shortcuts) {
      // Check condition if exists
      if (pluginShortcut.condition && !pluginShortcut.condition()) {
        continue;
      }
      
      try {
        await pluginShortcut.execute();
        event.preventDefault();
        return true;
      } catch (error) {
        console.error(`Failed to execute plugin shortcut ${pluginShortcut.id}:`, error);
      }
    }
    
    return false;
  }
}

export const pluginManager = PluginManager.getInstance();