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
};