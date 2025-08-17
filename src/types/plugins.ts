export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  minAppVersion: string;
  main: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  permissions?: PluginPermission[];
}

export interface PluginPermission {
  type: 'files' | 'network' | 'clipboard' | 'notifications' | 'storage';
  description: string;
  optional?: boolean;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: any;
  enabled: boolean;
  loaded: boolean;
  error?: string;
  settingsConfig?: PluginSettingsConfig;
}

export interface PluginCache {
  [pluginId: string]: {
    enabled: boolean;
    settings: Record<string, any>;
  };
}

export type SettingType = 
  | 'text' 
  | 'number' 
  | 'boolean' 
  | 'dropdown' 
  | 'slider' 
  | 'textarea' 
  | 'password' 
  | 'color' 
  | 'file' 
  | 'folder';

export interface BaseSetting {
  key: string;
  name: string;
  description?: string;
  type: SettingType;
  defaultValue: any;
}

export interface TextSetting extends BaseSetting {
  type: 'text' | 'password';
  placeholder?: string;
  maxLength?: number;
}

export interface NumberSetting extends BaseSetting {
  type: 'number' | 'slider';
  min?: number;
  max?: number;
  step?: number;
}

export interface BooleanSetting extends BaseSetting {
  type: 'boolean';
}

export interface DropdownSetting extends BaseSetting {
  type: 'dropdown';
  options: Array<{ value: string; label: string }>;
}

export interface TextareaSetting extends BaseSetting {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
}

export interface ColorSetting extends BaseSetting {
  type: 'color';
}

export interface FileSetting extends BaseSetting {
  type: 'file' | 'folder';
  extensions?: string[];
}

export type SettingDefinition = 
  | TextSetting 
  | NumberSetting 
  | BooleanSetting 
  | DropdownSetting 
  | TextareaSetting 
  | ColorSetting 
  | FileSetting;

export interface SettingGroup {
  id: string;
  name: string;
  description?: string;
  collapsible?: boolean;
  settings: SettingDefinition[];
}

export interface PluginSettingsConfig {
  groups: SettingGroup[];
}

declare global {
  interface Window {
    __activeFilePath?: string | null;
  }
}