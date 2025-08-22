import { useCallback, memo, useRef, lazy, Suspense, useEffect, useReducer, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import type { ThemeMode } from "../../types/config";
import { useFileTree, useCurrentDirectory } from "../../stores/directoryStore";
import { useWorkspaceConfig, useAppearanceConfig, useConfigStore, settingsManager } from "../../stores/configStore";
import { useEffectiveTheme } from "../../stores/appearanceStore";
import { usePlugins } from "../../stores/pluginStore";
import { Sidebar, SidebarResizer } from "../sidebar";
import { SidebarHeader } from "../sidebar/SidebarHeader";
import { MainWindow } from "../window";
import { NotePalette } from "../palette";
import { DevTools } from "../dev/DevTools";
import { TitleBar } from "../ui/TitleBar";
import { EditorFooter } from "../editor/EditorFooter";
import { StatusBar } from "../ui/StatusBar";

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

  // Extract config values with proper fallbacks through settings manager
  const showEditorFooter = settingsManager.getWorkspaceSetting('showEditorFooter', workspaceConfig);
  const fontSize = settingsManager.getAppearanceSetting('font-size', appearanceConfig);
  const fontFamily = settingsManager.getAppearanceSetting('font-family', appearanceConfig);

  // Optimized app state tracking - only update when actually needed
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

  const handleFileSelect = useCallback((filePath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: filePath });
    dispatch({ type: 'RESET_ON_FILE_CHANGE' });
    // Store active file path for external access
    (window as any).__activeFilePath = filePath;
  }, []);

  const handleFilePathChange = useCallback((newPath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: newPath });
    (window as any).__activeFilePath = newPath;
  }, []);

  const handleSelectNote = useCallback((notePath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: notePath });
    dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
    (window as any).__activeFilePath = notePath;
  }, []);

  const handleClosePalette = useCallback(() => {
    dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
  }, []);

  const handleSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  const handleTogglePreview = useCallback(() => {
    togglePreviewRef.current?.();
  }, []);

  // Use a ref to store the latest content and debounce updates
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
        // Clear any pending content update
        if (contentUpdateTimeoutRef.current) {
          clearTimeout(contentUpdateTimeoutRef.current);
        }
        dispatch({ type: 'SET_CURRENT_CONTENT', payload: '' });
      }
    }
  }, [showEditorFooter]);

  // Cleanup timeout on unmount
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

  const handleFileDeleted = useCallback((deletedPath: string) => {
    if (state.selectedFile === deletedPath) {
      dispatch({ type: 'SET_SELECTED_FILE', payload: null });
      dispatch({ type: 'RESET_ON_FILE_CHANGE' });
      (window as any).__activeFilePath = null;
    }
  }, [state.selectedFile]);

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

  const sidebarVisible = settingsManager.getWorkspaceSetting('sidebarVisible', workspaceConfig);

  // Memoized keyboard shortcuts callbacks to prevent unnecessary re-renders
  const keyboardHandlers = useMemo(() => ({
    onToggleSidebar: toggleSidebar,
    onSave: handleSave,
    onOpenNotePalette: () => dispatch({ type: 'SET_PALETTE_OPEN', payload: true }),
    onTogglePreview: handleTogglePreview,
    onOpenSettings: () => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true }),
  }), [toggleSidebar, handleSave, handleTogglePreview]);

  const plugins = usePlugins();

  // Use keyboard shortcuts with memoized handlers
  useKeyboardShortcuts(keyboardHandlers);

  return (
    <>
      <TitleBar 
        sidebarWidth={sidebarWidth}
        sidebarVisible={sidebarVisible}
      />
      {sidebarVisible && (
        <SidebarHeader
          projectName={fileTree.name}
          onOpenSettings={() => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true })}
          width={sidebarWidth}
        />
      )}
      <div className="h-screen flex relative overflow-hidden">
        {sidebarVisible && (
          <>
            <Sidebar
            width={sidebarWidth}
            fileTree={fileTree}
            selectedFile={state.selectedFile}
            onFileSelect={handleFileSelect}
            onFileDeleted={handleFileDeleted}
          />
          <SidebarResizer onMouseDown={handleMouseDown} />
        </>
      )}

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
      />

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
          <div className="fixed bottom-8 right-2 z-30 pointer-events-none">
            <EditorFooter
              content={state.currentContent}
              isPreviewMode={state.isPreviewMode}
              onTogglePreview={togglePreviewMode}
            />
          </div>
        )}

        <DevTools 
          isVisible={settingsManager.getWorkspaceSetting('devMode', workspaceConfig)}
        />

        <StatusBar
          currentContent={state.currentContent}
          selectedFile={state.selectedFile}
          plugins={plugins}
        />
      </div>
    </>
  );
});

export default WorkspacePage;
