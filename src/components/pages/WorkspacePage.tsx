import { useState, useCallback, memo, useRef, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useDirectory } from "../../contexts/DirectoryContext";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { useConfigManager } from "../../hooks/useConfigManager";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAppearance } from "../../contexts/AppearanceContext";
import { Sidebar, SidebarResizer } from "../sidebar";
import { SidebarHeader } from "../sidebar/SidebarHeader";
import { MainWindow } from "../window";
import { NotePalette } from "../palette";
import { FpsIndicator } from "../dev/FpsIndicator";
import { TitleBar } from "../ui/TitleBar";
import { EditorFooter } from "../editor/EditorFooter";

const SettingsModal = lazy(() => import("../settings/SettingsModal"));

export const WorkspacePage = memo(function WorkspacePage() {
  const { fileTree, currentDirectory } = useDirectory();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const saveRef = useRef<(() => void) | null>(null);
  const togglePreviewRef = useRef<(() => void) | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const { workspaceConfig, updateWorkspaceConfig } = useConfigManager();
  const { themeMode, showEditorFooter } = useAppearance();
  const navigate = useNavigate();

  const toggleSidebar = useCallback(() => {
    const currentState = workspaceConfig.sidebarVisible ?? true;
    const newState = !currentState;

    updateWorkspaceConfig({ sidebarVisible: newState })
      .then(() => {})
      .catch((_) => {});
  }, [workspaceConfig.sidebarVisible, updateWorkspaceConfig]);

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
    setCurrentContent(""); // Reset content when switching files
    setIsPreviewMode(false); // Reset preview mode when switching files
  }, []);

  const handleFilePathChange = useCallback((newPath: string) => {
    setSelectedFile(newPath);
  }, []);

  const handleSelectNote = useCallback((notePath: string) => {
    setSelectedFile(notePath);
    setIsPaletteOpen(false); // Close palette when selecting note
  }, []);

  const handleClosePalette = useCallback(() => {
    setIsPaletteOpen(false);
  }, []);

  const handleSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  const handleTogglePreview = useCallback(() => {
    togglePreviewRef.current?.();
  }, []);

  const handleContentChange = useCallback((content: string) => {
    if (showEditorFooter) {
      setCurrentContent(content);
    }
  }, [showEditorFooter]);

  // Reset content when footer is disabled
  const [previousShowFooter, setPreviousShowFooter] = useState(showEditorFooter);
  if (previousShowFooter !== showEditorFooter) {
    setPreviousShowFooter(showEditorFooter);
    if (!showEditorFooter) {
      setCurrentContent("");
    }
  }

  const handlePreviewModeChange = useCallback((previewMode: boolean) => {
    setIsPreviewMode(previewMode);
  }, []);

  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode((prev) => !prev);
  }, []);

  const handleFileDeleted = useCallback((deletedPath: string) => {
    if (selectedFile === deletedPath) {
      setSelectedFile(null);
      setCurrentContent(""); // Clear content when file is deleted
      setIsPreviewMode(false); // Reset preview mode when file is deleted
    }
  }, [selectedFile]);

  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onSave: handleSave,
    onOpenNotePalette: () => setIsPaletteOpen(true),
    onTogglePreview: handleTogglePreview,
    onOpenSettings: () => setIsSettingsOpen(true),
  });

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

  return (
    <>
      <TitleBar 
        sidebarWidth={sidebarWidth}
        sidebarVisible={sidebarVisible}
      />
      {sidebarVisible && (
        <SidebarHeader
          projectName={fileTree.name}
          onOpenSettings={() => setIsSettingsOpen(true)}
          width={sidebarWidth}
        />
      )}
      <div className="h-screen flex relative overflow-hidden">
        {sidebarVisible && (
          <>
            <Sidebar
            width={sidebarWidth}
            fileTree={fileTree}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onFileDeleted={handleFileDeleted}
          />
          <SidebarResizer onMouseDown={handleMouseDown} />
        </>
      )}

      <MainWindow
        selectedFile={selectedFile}
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

      {useMemo(
        () => (
          <NotePalette
            isOpen={isPaletteOpen}
            onClose={handleClosePalette}
            onSelectNote={handleSelectNote}
            workspacePath={currentDirectory}
          />
        ),
        [
          isPaletteOpen,
          handleClosePalette,
          handleSelectNote,
          currentDirectory,
        ],
      )}

      {isSettingsOpen && (
        <Suspense fallback={null}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />
        </Suspense>
      )}

        {selectedFile && showEditorFooter && (
          <div className="fixed bottom-2 right-2 z-30 pointer-events-none">
            <EditorFooter
              content={currentContent}
              isPreviewMode={isPreviewMode}
              onTogglePreview={togglePreviewMode}
            />
          </div>
        )}

        <FpsIndicator 
          isVisible={workspaceConfig?.devMode ?? false}
        />
      </div>
    </>
  );
});

export default WorkspacePage;
