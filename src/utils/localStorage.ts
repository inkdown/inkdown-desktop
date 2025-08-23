interface CacheItem<T> {
  data: T;
  version: number;
}

class LocalStorageCache {
  private static instance: LocalStorageCache;
  
  static getInstance(): LocalStorageCache {
    if (!LocalStorageCache.instance) {
      LocalStorageCache.instance = new LocalStorageCache();
    }
    return LocalStorageCache.instance;
  }

  set<T>(key: string, data: T): void {
    const cacheItem: CacheItem<T> = {
      data,
      version: Date.now(),
    };
    
    try {
      localStorage.setItem(`inkdown-cache-${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn(`Failed to cache ${key}:`, error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(`inkdown-cache-${key}`);
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      return cacheItem.data;
    } catch (error) {
      console.warn(`Failed to read cache ${key}:`, error);
      this.remove(key);
      return null;
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(`inkdown-cache-${key}`);
    } catch (error) {
      console.warn(`Failed to remove cache ${key}:`, error);
    }
  }

  clear(): void {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('inkdown-cache-'))
        .forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  // Clean up legacy localStorage entries that conflict with unified cache
  cleanupLegacyEntries(): void {
    try {
      const legacyKeys = ['custom-theme-id', 'inkdown-directory'];
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key) !== null) {
          console.log(`Removing legacy localStorage entry: ${key}`);
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup legacy entries:', error);
    }
  }

  exists(key: string): boolean {
    return localStorage.getItem(`inkdown-cache-${key}`) !== null;
  }

  getVersion(key: string): number | null {
    try {
      const cached = localStorage.getItem(`inkdown-cache-${key}`);
      if (!cached) return null;
      
      const cacheItem: CacheItem<any> = JSON.parse(cached);
      return cacheItem.version;
    } catch (error) {
      return null;
    }
  }
}

export const cacheManager = LocalStorageCache.getInstance();

export const cacheUtils = {
  setWorkspacePath: (path: string) => {
    cacheManager.set('workspacePath', path);
    localStorage.removeItem('inkdown-directory');
  },
  
  getWorkspacePath: () => cacheManager.get<string>('workspacePath'),
  
  setWorkspaceConfig: (config: any) => {
    cacheManager.set('workspaceConfig', config);
  },
  
  getWorkspaceConfig: () => cacheManager.get<any>('workspaceConfig'),
  
  setAppearanceConfig: (config: any) => {
    cacheManager.set('appearanceConfig', config);
  },
  
  getAppearanceConfig: () => cacheManager.get<any>('appearanceConfig'),
  
  setCustomThemes: (themes: any[]) => {
    cacheManager.set('customThemes', themes);
  },
  
  getCustomThemes: () => cacheManager.get<any[]>('customThemes'),
  
  invalidateWorkspace: () => {
    cacheManager.remove('workspaceConfig');
    cacheManager.remove('workspacePath');
  },
  
  invalidateAppearance: () => {
    cacheManager.remove('appearanceConfig');
  },
  
  invalidateThemes: () => {
    cacheManager.remove('customThemes');
  },

  // Plugin Cache Functions
  getEnabledPlugins: (): string[] => {
    const cache = cacheManager.get<Record<string, { enabled: boolean; settings: Record<string, any>; hasSettings?: boolean }>>('plugins') || {};
    return Object.keys(cache).filter(pluginId => cache[pluginId].enabled);
  },

  getPluginCache: () => {
    return cacheManager.get<Record<string, { enabled: boolean; settings: Record<string, any>; hasSettings?: boolean }>>('plugins') || {};
  },

  setPluginEnabled: (pluginId: string, enabled: boolean) => {
    const cache = cacheUtils.getPluginCache();
    if (!cache[pluginId]) {
      cache[pluginId] = { enabled, settings: {}, hasSettings: false };
    } else {
      cache[pluginId].enabled = enabled;
    }
    cacheManager.set('plugins', cache);
  },

  setPluginHasSettings: (pluginId: string, hasSettings: boolean) => {
    const cache = cacheUtils.getPluginCache();
    if (!cache[pluginId]) {
      cache[pluginId] = { enabled: false, settings: {}, hasSettings };
    } else {
      cache[pluginId].hasSettings = hasSettings;
    }
    cacheManager.set('plugins', cache);
  },

  getPluginHasSettings: (pluginId: string): boolean => {
    const cache = cacheUtils.getPluginCache();
    return cache[pluginId]?.hasSettings || false;
  },

  getPluginSettings: (pluginId: string): Record<string, any> => {
    const cache = cacheUtils.getPluginCache();
    return cache[pluginId]?.settings || {};
  },

  setPluginSettings: (pluginId: string, settings: Record<string, any>) => {
    const cache = cacheUtils.getPluginCache();
    if (!cache[pluginId]) {
      cache[pluginId] = { enabled: false, settings };
    } else {
      cache[pluginId].settings = settings;
    }
    cacheManager.set('plugins', cache);
  },

  isPluginEnabled: (pluginId: string): boolean => {
    const cache = cacheUtils.getPluginCache();
    return cache[pluginId]?.enabled || false;
  },

  removePlugin: (pluginId: string) => {
    const cache = cacheUtils.getPluginCache();
    delete cache[pluginId];
    cacheManager.set('plugins', cache);
  },

  invalidatePlugins: () => {
    cacheManager.remove('plugins');
  },
};