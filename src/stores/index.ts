export * from './configStore';
export * from './appearanceStore';
export * from './directoryStore';
export * from './editingStore';
export * from './pluginStore';

import { useConfigStore } from './configStore';
import { useAppearanceStore } from './appearanceStore';
import { useDirectoryStore } from './directoryStore';
import { usePluginStore } from './pluginStore';
import { cacheManager } from '../utils/localStorage';

export const initializeStores = async () => {
  const configStore = useConfigStore.getState();
  const appearanceStore = useAppearanceStore.getState();
  const directoryStore = useDirectoryStore.getState();
  const pluginStore = usePluginStore.getState();
  
  try {
    // Initialize config store first to load cached/disk settings
    await configStore.initialize();
    
    // Initialize appearance store after config is loaded
    appearanceStore.initialize();
    
    // Apply saved theme and update DOM styles
    await appearanceStore.applySavedTheme();
    appearanceStore.updateDOMStyles();
    
    await directoryStore.initializeWorkspace();
    
    pluginStore.initialize();
    
    // Subscribe to appearance config changes and schedule DOM updates
    useConfigStore.subscribe(
      (state) => state.appearanceConfig,
      () => {
        const appearance = useAppearanceStore.getState();
        const { currentCustomThemeId } = appearance;
        
        // Schedule DOM style updates for next frame to avoid blocking
        requestAnimationFrame(() => {
          appearance.updateDOMStyles();
        });
        
        // Handle theme changes without direct DOM manipulation
        // Only override if there's no custom theme active AND no custom theme in config
        const { appearanceConfig } = useConfigStore.getState();
        const hasCustomThemeInConfig = appearanceConfig?.["custom-theme"];
        
        if (!currentCustomThemeId && !hasCustomThemeInConfig) {
          if (appearanceConfig?.theme) {
            const effectiveTheme = appearanceConfig.theme === 'auto' 
              ? (appearance.mediaQuery?.matches ? 'dark' : 'light')
              : appearanceConfig.theme;
            
            if (effectiveTheme !== 'auto') {
              // Update state first, then schedule DOM update
              appearance.setEffectiveTheme(effectiveTheme as 'light' | 'dark');
              requestAnimationFrame(() => {
                appearance.applyThemeToDOM(effectiveTheme);
              });
            }
          }
        }
      },
      { fireImmediately: false }
    );
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  }
};

// Cleanup function
export const cleanupStores = () => {
  const appearanceStore = useAppearanceStore.getState();
  const pluginStore = usePluginStore.getState();
  
  appearanceStore.cleanup();
  pluginStore.cleanup();
};