import { useCallback, memo, useRef, lazy, Suspense, useEffect, useReducer, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useFileOperations } from "../../hooks/useFileOperations";
import type { ThemeMode } from "../../types/config";
import { useFileTree, useCurrentDirectory } from "../../stores/directoryStore";
import { useWorkspaceConfig, useAppearanceConfig, useConfigStore, settingsManager } from "../../stores/configStore";
import { useEffectiveTheme } from "../../stores/appearanceStore";
import { usePlugins } from "../../stores/pluginStore";
import { useTabStore, useActiveTab } from "../../stores/tabStore";
import { Sidebar, SidebarResizer, SidebarHeader, MiniSidebar } from "../sidebar";
import { MainWindow } from "../window";
import { NotePalette } from "../palette";
import { DevTools } from "../dev/DevTools";
import { TitleBar } from "../ui/TitleBar";
import { EditorFooter } from "../editor/EditorFooter";
import { TabContextMenu } from "../tabs";

const SettingsModal = lazy(() => import("../settings/SettingsModal"));

interface WorkspaceState {
  selectedFile: string | null;
  isPaletteOpen: boolean;
  isSettingsOpen: boolean;
  currentContent: string;
  isPreviewMode: boolean;
}

type WorkspaceAction =
  | { type: 'SET_SELECTED_FILE'; payload: string | null }
  | { type: 'SET_PALETTE_OPEN'; payload: boolean }
  | { type: 'SET_SETTINGS_OPEN'; payload: boolean }
  | { type: 'SET_CURRENT_CONTENT'; payload: string }
  | { type: 'SET_PREVIEW_MODE'; payload: boolean }
  | { type: 'RESET_ON_FILE_CHANGE' };

const initialWorkspaceState: WorkspaceState = {
  selectedFile: null,
  isPaletteOpen: false,
  isSettingsOpen: false,
  currentContent: '',
  isPreviewMode: false,
};

function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case 'SET_SELECTED_FILE':
      return { ...state, selectedFile: action.payload };
    case 'SET_PALETTE_OPEN':
      return { ...state, isPaletteOpen: action.payload };
    case 'SET_SETTINGS_OPEN':
      return { ...state, isSettingsOpen: action.payload };
    case 'SET_CURRENT_CONTENT':
      return { ...state, currentContent: action.payload };
    case 'SET_PREVIEW_MODE':
      return { ...state, isPreviewMode: action.payload };
    case 'RESET_ON_FILE_CHANGE':
      return { ...state, currentContent: '', isPreviewMode: false };
    default:
      return state;
  }
}

export const WorkspacePage = memo(function WorkspacePage() {
  const fileTree = useFileTree();
  const currentDirectory = useCurrentDirectory();
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const saveRef = useRef<(() => void) | null>(null);
  const togglePreviewRef = useRef<(() => void) | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const workspaceConfig = useWorkspaceConfig();
  const appearanceConfig = useAppearanceConfig();
  const { updateWorkspaceConfig } = useConfigStore();
  const themeMode = useEffectiveTheme();
  const navigate = useNavigate();
  const { createFile } = useFileOperations();
  
  // Tab system integration
  const { createTab, closeTab, loadSession, getActiveTab, setActiveTab, getTabByFilePath, updateTabFile } = useTabStore();
  const activeTab = useActiveTab();

  const showEditorFooter = settingsManager.getWorkspaceSetting('showEditorFooter', workspaceConfig);
  const fontSize = settingsManager.getAppearanceSetting('font-size', appearanceConfig);
  const fontFamily = settingsManager.getAppearanceSetting('font-family', appearanceConfig);

  const appStateRef = useRef<{
    activeFile: { path: string; name: string; content: string } | null;
    workspace: { path: string; name: string };
    settings: { vimMode: boolean; showLineNumbers: boolean; fontSize: number; fontFamily: string; theme: ThemeMode };
  }>({
    activeFile: null,
    workspace: { path: '', name: '' },
    settings: { vimMode: false, showLineNumbers: true, fontSize: 14, fontFamily: 'Inter', theme: 'light' }
  });

  // Update app state only when core values change
  useEffect(() => {
    appStateRef.current = {
      activeFile: state.selectedFile ? {
        path: state.selectedFile,
        name: state.selectedFile.split('/').pop() || '',
        content: state.currentContent
      } : null,
      workspace: {
        path: currentDirectory || '',
        name: currentDirectory?.split('/').pop() || ''
      },
      settings: {
        vimMode: settingsManager.getWorkspaceSetting('vimMode', workspaceConfig),
        showLineNumbers: settingsManager.getWorkspaceSetting('showLineNumbers', workspaceConfig),
        fontSize,
        fontFamily,
        theme: themeMode || ('light' as ThemeMode)
      }
    };
  }, [state.selectedFile, state.currentContent, currentDirectory, workspaceConfig?.vimMode, workspaceConfig?.showLineNumbers, fontSize, fontFamily, themeMode]);

  const toggleSidebar = useCallback(() => {
    const currentState = settingsManager.getWorkspaceSetting('sidebarVisible', workspaceConfig);
    const newState = !currentState;

    updateWorkspaceConfig({ sidebarVisible: newState })
      .then(() => {})
      .catch((_) => {});
  }, [workspaceConfig, updateWorkspaceConfig]);

  // Handle file click: create new tab if Ctrl is held, otherwise overlay current tab
  const handleFileClick = useCallback(async (filePath: string, event?: React.MouseEvent) => {
    try {
      if (event?.ctrlKey || event?.metaKey) {
        // Ctrl+click: create new tab or activate existing tab
        const existingTab = getTabByFilePath(filePath);
        
        if (existingTab) {
          // Tab already exists, just activate it
          await setActiveTab(existingTab.id);
        } else {
          // Create a new dedicated tab for this file
          await createTab({ file_path: filePath });
        }
      } else {
        // Regular click: overlay current tab with clicked file content
        const currentActiveTab = getActiveTab();
        
        if (currentActiveTab) {
          // Update the active tab to show the clicked file (overlay behavior)
          await updateTabFile(currentActiveTab.id, filePath);
        } else {
          // No active tab exists, create one for this file
          await createTab({ file_path: filePath });
        }
      }
      
      // Update local state
      dispatch({ type: 'SET_SELECTED_FILE', payload: filePath });
      dispatch({ type: 'RESET_ON_FILE_CHANGE' });
      (window as any).__activeFilePath = filePath;
    } catch (error) {
      console.error('Failed to handle file click:', error);
      // Fallback to just updating local state
      dispatch({ type: 'SET_SELECTED_FILE', payload: filePath });
      dispatch({ type: 'RESET_ON_FILE_CHANGE' });
      (window as any).__activeFilePath = filePath;
    }
  }, [getActiveTab, updateTabFile, createTab, getTabByFilePath, setActiveTab]);

  const handleFilePathChange = useCallback((newPath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: newPath });
    (window as any).__activeFilePath = newPath;
  }, []);

  const handleSelectNote = useCallback(async (notePath: string) => {
    try {
      const existingTab = getTabByFilePath(notePath);
      
      if (existingTab) {
        // Tab already exists, just activate it
        await setActiveTab(existingTab.id);
      } else {
        // Always create new tab when selecting from palette
        await createTab({ file_path: notePath });
      }
      
      dispatch({ type: 'SET_SELECTED_FILE', payload: notePath });
      dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
      (window as any).__activeFilePath = notePath;
    } catch (error) {
      console.error('Failed to handle note selection:', error);
      // Fallback to old behavior
      dispatch({ type: 'SET_SELECTED_FILE', payload: notePath });
      dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
      (window as any).__activeFilePath = notePath;
    }
  }, [getTabByFilePath, setActiveTab, createTab]);

  const handleClosePalette = useCallback(() => {
    dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
  }, []);

  const handleSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  const handleTogglePreview = useCallback(() => {
    togglePreviewRef.current?.();
  }, []);

  const contentUpdateTimeoutRef = useRef<number>();
  
  const handleContentChange = useCallback((content: string) => {
    if (showEditorFooter) {
      // Clear any pending update
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
      
      // Debounce content updates to reduce re-renders
      contentUpdateTimeoutRef.current = window.setTimeout(() => {
        dispatch({ type: 'SET_CURRENT_CONTENT', payload: content });
      }, 100);
    }
  }, [showEditorFooter]);

  const previousShowFooterRef = useRef(showEditorFooter);
  
  useEffect(() => {
    if (previousShowFooterRef.current !== showEditorFooter) {
      previousShowFooterRef.current = showEditorFooter;
      if (!showEditorFooter) {

        if (contentUpdateTimeoutRef.current) {
          clearTimeout(contentUpdateTimeoutRef.current);
        }
        dispatch({ type: 'SET_CURRENT_CONTENT', payload: '' });
      }
    }
  }, [showEditorFooter]);

  useEffect(() => {
    return () => {
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handlePreviewModeChange = useCallback((previewMode: boolean) => {
    dispatch({ type: 'SET_PREVIEW_MODE', payload: previewMode });
  }, []);

  const togglePreviewMode = useCallback(() => {
    dispatch({ type: 'SET_PREVIEW_MODE', payload: !state.isPreviewMode });
  }, [state.isPreviewMode]);

  const handleCreateNewNote = useCallback(async () => {
    if (!currentDirectory) return;
    
    const newPath = await createFile(currentDirectory, "New Note");
    if (newPath) {
      // Create tab for new note
      try {
        await createTab({ file_path: newPath });
        dispatch({ type: 'SET_SELECTED_FILE', payload: newPath });
        dispatch({ type: 'RESET_ON_FILE_CHANGE' });
        (window as any).__activeFilePath = newPath;
      } catch (error) {
        console.error('Failed to create tab for new note:', error);
      }
    }
  }, [currentDirectory, createFile, createTab]);

  // Tab-related handlers
  const handleCreateNewTab = useCallback(async () => {
    try {
      // Create an empty tab (no file_path)
      await createTab();
    } catch (error) {
      console.error('Failed to create new tab:', error);
    }
  }, [createTab]);

  const handleCloseActiveTab = useCallback(async () => {
    const { session } = useTabStore.getState();
    const active = getActiveTab();
    
    if (active) {
      try {
        // If this is the last tab, create a new empty tab first
        if (session && session.tabs.length <= 1) {
          await createTab(); // Create empty tab first
        }
        
        await closeTab(active.id);
        // The sync effect will handle updating selected file based on remaining tabs
      } catch (error) {
        console.error('Failed to close active tab:', error);
      }
    }
  }, [closeTab, getActiveTab, createTab]);

  const handleFileDeleted = useCallback(async (deletedPath: string) => {
    try {
      // Close tab if it exists for the deleted file
      const existingTab = getTabByFilePath(deletedPath);
      if (existingTab) {
        await closeTab(existingTab.id);
      }
      
      // Update local state if this was the selected file
      if (state.selectedFile === deletedPath) {
        dispatch({ type: 'SET_SELECTED_FILE', payload: null });
        dispatch({ type: 'RESET_ON_FILE_CHANGE' });
        (window as any).__activeFilePath = null;
      }
    } catch (error) {
      console.error('Failed to handle file deletion:', error);
      
      // Fallback to old behavior
      if (state.selectedFile === deletedPath) {
        dispatch({ type: 'SET_SELECTED_FILE', payload: null });
        dispatch({ type: 'RESET_ON_FILE_CHANGE' });
        (window as any).__activeFilePath = null;
      }
    }
  }, [state.selectedFile, getTabByFilePath, closeTab]);

  // All hooks must be called before any early returns
  const sidebarVisible = settingsManager.getWorkspaceSetting('sidebarVisible', workspaceConfig);
  
  const keyboardHandlers = useMemo(() => ({
    onToggleSidebar: toggleSidebar,
    onSave: handleSave,
    onOpenNotePalette: () => dispatch({ type: 'SET_PALETTE_OPEN', payload: true }),
    onTogglePreview: handleTogglePreview,
    onOpenSettings: () => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true }),
    onCreateNewNote: handleCreateNewNote,
    onCreateNewTab: handleCreateNewTab,
    onCloseActiveTab: handleCloseActiveTab,
  }), [toggleSidebar, handleSave, handleTogglePreview, handleCreateNewNote, handleCreateNewTab, handleCloseActiveTab]);

  const plugins = usePlugins();

  useKeyboardShortcuts(keyboardHandlers);

  // Initialize tab system when workspace is ready
  useEffect(() => {
    if (currentDirectory && fileTree) {
      const initializeTabs = async () => {
        try {
          await loadSession(currentDirectory);
          
          // Wait a bit for state to update, then check if we need an empty tab
          setTimeout(() => {
            const currentSession = useTabStore.getState().session;
            if (!currentSession || currentSession.tabs.length === 0) {
              createTab().catch(error => {
                console.warn('Failed to create initial empty tab:', error);
              });
            }
          }, 100);
          
        } catch (error) {
          console.warn('Failed to load tab session:', error);
          // Create empty tab on failure
          createTab().catch(tabError => {
            console.warn('Failed to create initial empty tab:', tabError);
          });
        }
      };
      
      initializeTabs();
    }
  }, [currentDirectory, fileTree, loadSession, createTab]);

  // Sync active tab with selected file - prevent infinite loops
  const lastSyncedTabPath = useRef<string | null>(null);
  const lastSelectedFile = useRef<string | null>(null);
  
  useEffect(() => {
    if (activeTab?.file_path && 
        activeTab.file_path !== lastSyncedTabPath.current) {
      
      lastSyncedTabPath.current = activeTab.file_path;
      lastSelectedFile.current = activeTab.file_path;
      dispatch({ type: 'SET_SELECTED_FILE', payload: activeTab.file_path });
      (window as any).__activeFilePath = activeTab.file_path;
      
    } else if (!activeTab && lastSyncedTabPath.current !== null) {
      // No active tab exists, clear selected file
      lastSyncedTabPath.current = null;
      lastSelectedFile.current = null;
      dispatch({ type: 'SET_SELECTED_FILE', payload: null });
      (window as any).__activeFilePath = null;
    } else if (activeTab && !activeTab.file_path) {
      // Empty tab active, clear selected file
      lastSyncedTabPath.current = null;
      lastSelectedFile.current = null;
      dispatch({ type: 'SET_SELECTED_FILE', payload: null });
      (window as any).__activeFilePath = null;
    }
  }, [activeTab?.file_path, activeTab?.id, activeTab]);

  if (!fileTree || !currentDirectory) {
    return (
      <div 
        className="h-screen flex items-center justify-center relative"
        style={{ backgroundColor: 'var(--theme-sidebar-background)' }}
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 theme-text-primary">
            Nenhum diretório selecionado
          </h2>
          <p className="theme-text-muted mb-4">
            Selecione um diretório para começar a editar
          </p>
          <button
            onClick={() => navigate("/")}
            className="theme-button px-4 py-2 rounded-lg"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <TitleBar 
        sidebarWidth={sidebarVisible ? sidebarWidth : 48}
        sidebarVisible={sidebarVisible || true}
        onNewTab={handleCreateNewTab}
      />
      
      {!sidebarVisible && (
        <MiniSidebar
          onOpenSettings={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })}
          onToggleSidebar={toggleSidebar}
        />
      )}
      {sidebarVisible && (
        <SidebarHeader
          projectName={fileTree.name}
          onOpenSettings={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })}
          onToggleSidebar={toggleSidebar}
          width={sidebarWidth}
        />
      )}
      <div className="flex relative overflow-hidden" style={{ height: 'calc(100vh - 32px)' }}>
        <div 
          className="transition-all duration-300 ease-in-out"
          style={{
            width: sidebarVisible ? `${sidebarWidth}px` : '0px',
            transform: sidebarVisible ? 'translateX(0)' : `translateX(-${sidebarWidth}px)`,
            overflow: 'hidden'
          }}
        >
          <Sidebar
            width={sidebarWidth}
            fileTree={fileTree}
            selectedFile={state.selectedFile}
            onFileSelect={handleFileClick}
            onFileDeleted={handleFileDeleted}
          />
        </div>
        {sidebarVisible && <SidebarResizer onMouseDown={handleMouseDown} />}

      <div style={{ marginLeft: sidebarVisible ? 0 : '48px' }} className="transition-all duration-300 ease-in-out flex-1">
        <MainWindow
          selectedFile={state.selectedFile}
          onFilePathChange={handleFilePathChange}
          onToggleSidebar={toggleSidebar}
          onSelectNote={handleSelectNote}
          workspaceConfig={workspaceConfig}
          themeMode={themeMode}
          onSaveRef={saveRef}
          onTogglePreviewRef={togglePreviewRef}
          onContentChange={handleContentChange}
          onPreviewModeChange={handlePreviewModeChange}
          showEditorFooter={showEditorFooter}
          isPreviewMode={state.isPreviewMode}
        />
      </div>

      <NotePalette
        isOpen={state.isPaletteOpen}
        onClose={handleClosePalette}
        onSelectNote={handleSelectNote}
        workspacePath={currentDirectory}
      />

      {state.isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={state.isSettingsOpen}
            onClose={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: false })}
          />
        </Suspense>
      )}

        {state.selectedFile && showEditorFooter && (
          <EditorFooter
            content={state.currentContent}
            isPreviewMode={state.isPreviewMode}
            onTogglePreview={togglePreviewMode}
            statusBarSections={(() => {
              const sections = [];
              
              sections.push({
                id: 'default',
                label: 'Aplicativo',
                actions: [
                  {
                    id: 'rename-note',
                    label: 'Renomear nota',
                    iconName: 'edit',
                    onClick: () => console.log('Rename note clicked'),
                    disabled: false
                  },
                  {
                    id: 'delete-note',
                    label: 'Excluir nota',
                    iconName: 'trash-2',
                    onClick: () => console.log('Delete note clicked'),
                    disabled: false
                  }
                ]
              });

              const pluginActions = [];
              for (const plugin of plugins.values()) {
                if (plugin.enabled && plugin.statusBarItems) {
                  for (const item of plugin.statusBarItems.values()) {
                    pluginActions.push({
                      id: item.id,
                      label: item.text,
                      iconName: item.iconName,
                      onClick: item.callback || (() => {}),
                      disabled: false
                    });
                  }
                }
              }
              
              if (pluginActions.length > 0) {
                sections.push({
                  id: 'plugins',
                  label: 'Plugins',
                  actions: pluginActions
                });
              }

              return sections;
            })()}
          />
        )}

        <DevTools 
          isVisible={settingsManager.getWorkspaceSetting('devMode', workspaceConfig)}
        />

      </div>
      <TabContextMenu />
    </>
  );
});

export default WorkspacePage;
