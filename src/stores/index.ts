export * from './configStore';
export * from './appearanceStore';
export * from './directoryStore';
export * from './editingStore';
export * from './pluginStore';

import { useConfigStore } from './configStore';
import { useAppearanceStore } from './appearanceStore';
import { useDirectoryStore } from './directoryStore';
import { usePluginStore } from './pluginStore';

export const initializeStores = async () => {
  const configStore = useConfigStore.getState();
  const appearanceStore = useAppearanceStore.getState();
  const directoryStore = useDirectoryStore.getState();
  const pluginStore = usePluginStore.getState();
  
  try {
    await configStore.initialize();
    
    // Initialize appearance store after config is loaded and wait for theme application
    appearanceStore.initialize();
    await appearanceStore.applySavedTheme();
    
    await directoryStore.initializeWorkspace();
    
    pluginStore.initialize();
    
    useConfigStore.subscribe(
      (state) => state.appearanceConfig,
      () => {
        const appearance = useAppearanceStore.getState();
        const { currentCustomThemeId } = appearance;
        
        appearance.updateDOMStyles();
        
        const { appearanceConfig } = useConfigStore.getState();
        
        if (currentCustomThemeId) {
          return;
        }
        
        const cachedThemeId = localStorage.getItem("custom-theme-id");
        const configCustomTheme = appearanceConfig?.["custom-theme"];
        if (cachedThemeId || configCustomTheme) {
          return;
        }
        
        if (appearanceConfig?.theme && !appearanceConfig?.["custom-theme"]) {
          const effectiveTheme = appearanceConfig.theme === 'auto' 
            ? (appearance.mediaQuery?.matches ? 'dark' : 'light')
            : appearanceConfig.theme;
          
          if (effectiveTheme !== 'auto') {
            appearance.setEffectiveTheme(effectiveTheme as 'light' | 'dark');
            appearance.applyThemeToDOM(effectiveTheme);
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