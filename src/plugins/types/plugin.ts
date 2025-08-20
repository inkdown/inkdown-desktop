export interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly author: string;
  readonly minAppVersion: string;
  readonly main: string;
  readonly homepage?: string;
  readonly repository?: string;
  readonly keywords?: readonly string[];
  readonly permissions?: readonly PluginPermission[];
  readonly engines?: {
    readonly inkdown: string;
  };
}

export interface PluginPermission {
  readonly type: 'files' | 'network' | 'clipboard' | 'notifications' | 'storage' | 'editor' | 'ui';
  readonly description: string;
  readonly optional?: boolean;
  readonly scope?: string[];
}

export interface PluginInstance {
  readonly id: string;
  readonly manifest: PluginManifest;
  readonly api: any;
  load(): Promise<void>;
  unload(): Promise<void>;
  enable?(): Promise<void>;
  disable?(): Promise<void>;
}

export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  instance: PluginInstance | any | null;
  enabled: boolean;
  loaded: boolean;
  readonly error?: string;
  readonly lastModified?: number;
  readonly permissions: readonly PluginPermission[];
  shortcuts: Map<string, () => void>;
  commands: Map<string, any>;
  statusBarItems: Map<string, StatusBarItem>;
  settingsConfig?: any;
}

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  callback?: () => void;
  pluginId?: string;
  iconName?: string;
}

export interface PluginLoadOptions {
  readonly force?: boolean;
  readonly skipCache?: boolean;
  readonly permissionCheck?: boolean;
}

export interface PluginCommand {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly category?: string;
  readonly icon?: string;
  readonly shortcut?: string;
  readonly condition?: () => boolean;
  execute(...args: any[]): Promise<void> | void;
}

export interface PluginRegistration {
  readonly pluginId: string;
  readonly type: 'command' | 'shortcut' | 'menu' | 'statusbar' | 'extension';
  readonly id: string;
  readonly cleanup: () => void;
}

export interface PluginState {
  readonly plugins: ReadonlyMap<string, LoadedPlugin>;
  readonly registrations: readonly PluginRegistration[];
  readonly loading: boolean;
  readonly error: string | null;
}

export type PluginEventType = 
  | 'plugin:loaded'
  | 'plugin:unloaded' 
  | 'plugin:enabled'
  | 'plugin:disabled'
  | 'plugin:error'
  | 'registry:changed';

export interface PluginEvent {
  readonly type: PluginEventType;
  readonly pluginId?: string;
  readonly data?: any;
  readonly timestamp: number;
}

export type PluginEventListener = (event: PluginEvent) => void;