// Store exports
export * from './configStore';
export * from './appearanceStore';
export * from './directoryStore';
export * from './editingStore';
export * from './pluginStore';

// Store initialization
import { useConfigStore } from './configStore';
import { useAppearanceStore } from './appearanceStore';
import { useDirectoryStore } from './directoryStore';
import { usePluginStore } from './pluginStore';

export const initializeStores = async () => {
  // Initialize stores in the correct order
  const configStore = useConfigStore.getState();
  const appearanceStore = useAppearanceStore.getState();
  const directoryStore = useDirectoryStore.getState();
  const pluginStore = usePluginStore.getState();
  
  try {
    // Initialize config first
    await configStore.initialize();
    
    // Initialize appearance (depends on config)
    appearanceStore.initialize();
    
    // Initialize directory (depends on config)
    await directoryStore.initializeWorkspace();
    
    // Initialize plugins
    pluginStore.initialize();
    
    // Subscribe to config changes to update DOM styles
    useConfigStore.subscribe(
      (state) => state.appearanceConfig,
      () => {
        // Update DOM styles when appearance config changes
        const appearance = useAppearanceStore.getState();
        appearance.updateDOMStyles();
        
        // Apply effective theme
        const { appearanceConfig } = useConfigStore.getState();
        if (appearanceConfig?.theme) {
          const effectiveTheme = appearanceConfig.theme === 'auto' 
            ? (appearance.mediaQuery?.matches ? 'dark' : 'light')
            : appearanceConfig.theme;
          
          if (effectiveTheme !== 'auto') {
            appearance.setEffectiveTheme(effectiveTheme as 'light' | 'dark');
            appearance.applyThemeToDOM(effectiveTheme);
          }
        }
      },
      { fireImmediately: true }
    );
    
    console.log('Stores initialized successfully');
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