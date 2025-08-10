import { useState, useCallback, memo, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDirectory } from "../../contexts/DirectoryContext";
import { useSidebarResize } from "../../hooks/useSidebarResize";
import { useConfigManager } from "../../hooks/useConfigManager";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useAppearance } from "../../contexts/AppearanceContext";
import { Sidebar, SidebarResizer } from "../sidebar";
import { MainWindow } from "../window";
import { NotePalette } from "../palette";
import { SettingsModal } from "../settings";

export const WorkspacePage = memo(function WorkspacePage() {
  const { fileTree, currentDirectory } = useDirectory();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const saveRef = useRef<(() => void) | null>(null);
  const togglePreviewRef = useRef<(() => void) | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const { workspaceConfig, updateWorkspaceConfig } = useConfigManager();
  const { themeMode } = useAppearance();
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

  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onSave: handleSave,
    onOpenNotePalette: () => setIsPaletteOpen(true),
    onTogglePreview: handleTogglePreview,
    onOpenSettings: () => setIsSettingsOpen(true),
  });

  if (!fileTree || !currentDirectory) {
    return (
      <div className="h-screen flex items-center justify-center theme-card relative">
        <div className="text-center">
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: "var(--theme-foreground)" }}
          >
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
    <div className="h-screen flex relative">
      {(workspaceConfig.sidebarVisible ?? true) && (
        <>
          <Sidebar
            width={sidebarWidth}
            fileTree={fileTree}
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            onOpenSettings={() => setIsSettingsOpen(true)}
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
      />

      {useMemo(
        () => (
          <NotePalette
            isOpen={isPaletteOpen}
            onClose={handleClosePalette}
            onSelectNote={handleSelectNote}
            workspacePath={workspaceConfig.workspace_path}
          />
        ),
        [
          isPaletteOpen,
          handleClosePalette,
          handleSelectNote,
          workspaceConfig.workspace_path,
        ],
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
});
