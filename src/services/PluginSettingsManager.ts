import { invoke } from '@tauri-apps/api/core';
import { cacheUtils } from '../utils/localStorage';

export class PluginSettingsManager {
  async loadSettings(pluginId: string): Promise<Record<string, any>> {
    try {
      const result = await invoke<any>('read_plugin_settings', { pluginId });
      return result || {};
    } catch (error) {
      console.error(`Failed to load settings from file for ${pluginId}:`, error);
      return {};
    }
  }

  async saveSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
    try {
      await invoke('write_plugin_settings', { pluginId, settings });
    } catch (error) {
      console.error(`Failed to save settings to file for ${pluginId}:`, error);
      throw error;
    }
  }

  async initializeSettings(pluginId: string): Promise<void> {
    try {
      const fileSettings = await this.loadSettings(pluginId);
      const cacheSettings = cacheUtils.getPluginSettings(pluginId);
      
      let finalSettings = fileSettings;
      
      if (Object.keys(fileSettings).length === 0 && Object.keys(cacheSettings).length > 0) {
        finalSettings = cacheSettings;
        await this.saveSettings(pluginId, cacheSettings);
      } else if (Object.keys(fileSettings).length > 0) {
        cacheUtils.setPluginSettings(pluginId, fileSettings);
      }
    } catch (error) {
      console.error(`Failed to initialize settings for ${pluginId}:`, error);
    }
  }

  async savePluginSettings(pluginId: string, settings: Record<string, any>): Promise<boolean> {
    try {
      cacheUtils.setPluginSettings(pluginId, settings);
      await this.saveSettings(pluginId, settings);
      return true;
    } catch (error) {
      console.error(`Failed to save settings for ${pluginId}:`, error);
      return false;
    }
  }

  createSettingsAPI(pluginId: string) {
    return {
      load: (id: string) => cacheUtils.getPluginSettings(id),
      save: (id: string, settings: Record<string, any>) => {
        cacheUtils.setPluginSettings(id, settings);
        this.saveSettings(id, settings).catch(error => {
          console.error(`Failed to save settings to file for ${id}:`, error);
        });
      },
      setHasSettings: (id: string, hasSettings: boolean) => {
        cacheUtils.setPluginHasSettings(id, hasSettings);
      },
      getHasSettings: (id: string) => {
        return cacheUtils.getPluginHasSettings(id);
      },
      loadFromFile: async (id: string) => this.loadSettings(id),
      saveToFile: async (id: string, settings: Record<string, any>) => this.saveSettings(id, settings),
    };
  }
}