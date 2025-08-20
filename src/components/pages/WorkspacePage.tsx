import { useState, useCallback, memo, useRef, useMemo, lazy, Suspense, useEffect, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import { useDirectory } from "../../contexts/DirectoryContext";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { useConfigManager } from "../../hooks/useConfigManager";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAppearance } from "../../contexts/AppearanceContext";
import type { ThemeMode } from "../../types/config";
import { PluginEngineProvider, usePluginEngineContext } from "../../plugins";
import { Sidebar, SidebarResizer } from "../sidebar";
import { SidebarHeader } from "../sidebar/SidebarHeader";
import { MainWindow } from "../window";
import { NotePalette } from "../palette";
import { FpsIndicator } from "../dev/FpsIndicator";
import { TitleBar } from "../ui/TitleBar";
import { EditorFooter } from "../editor/EditorFooter";
import { StatusBarDropdown } from "../ui/StatusBarDropdown";

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
  const { fileTree, currentDirectory } = useDirectory();
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const saveRef = useRef<(() => void) | null>(null);
  const togglePreviewRef = useRef<(() => void) | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const { workspaceConfig, updateWorkspaceConfig } = useConfigManager();
  const { themeMode, showEditorFooter, fontSize, fontFamily } = useAppearance();
  const navigate = useNavigate();

  const appStateRef = useRef<{
    activeFile: { path: string; name: string; content: string } | null;
    workspace: { path: string; name: string; files: any[] };
    settings: { vimMode: boolean; showLineNumbers: boolean; fontSize: number; fontFamily: string; theme: ThemeMode };
    theme: { mode: ThemeMode; colors: Record<string, any> };
  }>({
    activeFile: null,
    workspace: { path: '', name: '', files: [] },
    settings: { vimMode: false, showLineNumbers: true, fontSize: 14, fontFamily: 'Inter', theme: 'light' },
    theme: { mode: 'light', colors: {} }
  });

  const updateAppState = useCallback(() => {
    appStateRef.current = {
      activeFile: state.selectedFile ? {
        path: state.selectedFile,
        name: state.selectedFile.split('/').pop() || '',
        content: state.currentContent
      } : null,
      workspace: {
        path: currentDirectory || '',
        name: currentDirectory?.split('/').pop() || '',
        files: []
      },
      settings: {
        vimMode: workspaceConfig?.vimMode || false,
        showLineNumbers: workspaceConfig?.showLineNumbers || true,
        fontSize: fontSize || 14,
        fontFamily: fontFamily || 'Inter',
        theme: themeMode || ('light' as ThemeMode)
      },
      theme: {
        mode: themeMode || ('light' as ThemeMode),
        colors: {}
      }
    };
  }, [state.selectedFile, state.currentContent, currentDirectory, workspaceConfig, themeMode, fontSize, fontFamily]);

  useEffect(() => {
    updateAppState();
  }, [updateAppState]);

  const toggleSidebar = useCallback(() => {
    const currentState = workspaceConfig.sidebarVisible ?? true;
    const newState = !currentState;

    updateWorkspaceConfig({ sidebarVisible: newState })
      .then(() => {})
      .catch((_) => {});
  }, [workspaceConfig.sidebarVisible, updateWorkspaceConfig]);

  const handleFileSelect = useCallback((filePath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: filePath });
    dispatch({ type: 'RESET_ON_FILE_CHANGE' });
    (window as any).__activeFilePath = filePath;
  }, []);

  const handleFilePathChange = useCallback((newPath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: newPath });
  }, []);

  const handleSelectNote = useCallback((notePath: string) => {
    dispatch({ type: 'SET_SELECTED_FILE', payload: notePath });
    dispatch({ type: 'SET_PALETTE_OPEN', payload: false });
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

  const handleContentChange = useCallback((content: string) => {
    if (showEditorFooter) {
      dispatch({ type: 'SET_CURRENT_CONTENT', payload: content });
    }
  }, [showEditorFooter]);

  const previousShowFooterRef = useRef(showEditorFooter);
  
  useEffect(() => {
    if (previousShowFooterRef.current !== showEditorFooter) {
      previousShowFooterRef.current = showEditorFooter;
      if (!showEditorFooter) {
        dispatch({ type: 'SET_CURRENT_CONTENT', payload: '' });
      }
    }
  }, [showEditorFooter]);

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

  // Keyboard shortcuts moved inside PluginEngineProvider

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

  const sidebarVisible = workspaceConfig.sidebarVisible ?? true;

  // Component to handle keyboard shortcuts inside plugin context
  const KeyboardShortcutsHandler = memo(() => {
    useKeyboardShortcuts({
      onToggleSidebar: toggleSidebar,
      onSave: handleSave,
      onOpenNotePalette: () => dispatch({ type: 'SET_PALETTE_OPEN', payload: true }),
      onTogglePreview: handleTogglePreview,
      onOpenSettings: () => dispatch({ type: 'SET_SETTINGS_OPEN', payload: true }),
    });
    return null;
  });

  const StatusBarRenderer = memo(() => {
    const { plugins } = usePluginEngineContext();
    
    const sections = useMemo(() => {
      const pluginActions: any[] = [];
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
      
      if (pluginActions.length === 0) return [];
      
      return [{
        id: 'plugins',
        label: 'Plugins',
        actions: pluginActions
      }];
    }, [plugins]);

    if (sections.length === 0) {
      return null;
    }

    return (
      <div className="fixed bottom-0 right-4 z-20 p-2">
        <StatusBarDropdown sections={sections} />
      </div>
    );
  });

  return (
    <PluginEngineProvider appState={appStateRef.current} pluginsDirectory="~/.inkdown/plugins">
      <KeyboardShortcutsHandler />
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
          <div className="fixed bottom-2 right-2 z-30 pointer-events-none">
            <EditorFooter
              content={state.currentContent}
              isPreviewMode={state.isPreviewMode}
              onTogglePreview={togglePreviewMode}
            />
          </div>
        )}

        <FpsIndicator 
          isVisible={workspaceConfig?.devMode ?? false}
        />

        <StatusBarRenderer />
      </div>
    </PluginEngineProvider>
  );
});

export default WorkspacePage;
