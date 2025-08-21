import { memo, useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  EditorComponent,
  EditorComponentHandle,
} from "../editor/EditorComponent";
import { Title } from "../editor/Title";
import { useError } from "../../contexts/ErrorContext";
import { useEditingStore } from "../../stores/editingStore";
import { usePluginStore } from "../../stores/pluginStore";

interface WindowContentProps {
  selectedFile: string;
  onFilePathChange?: (newPath: string) => void;
  onToggleSidebar: () => void;
  onSelectNote?: (notePath: string) => void;
  workspaceConfig: any;
  themeMode: string;
  onSaveRef: React.MutableRefObject<(() => void) | null>;
  onTogglePreviewRef?: React.MutableRefObject<(() => void) | null>;
  onContentChange?: (content: string) => void;
  onPreviewModeChange?: (isPreviewMode: boolean) => void;
  showEditorFooter?: boolean;
}

export const WindowContent = memo(function WindowContent({
  selectedFile,
  onFilePathChange,
  themeMode,
  onSaveRef,
  onTogglePreviewRef,
  onContentChange: externalOnContentChange,
  onPreviewModeChange,
  showEditorFooter,
}: WindowContentProps) {
  const [content, setContent] = useState<string>(""); // Single source of truth for content
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const editorRef = useRef<EditorComponentHandle>(null);
  const originalContentRef = useRef<string>(""); // Track original file content for comparison
  const { showError } = useError();
  const { setActiveFile } = useEditingStore();
  const { setActiveEditor, clearActiveEditor } = usePluginStore();

  const loadFileContent = useCallback(async (filePath: string) => {
    if (!filePath) return;

    setIsLoading(true);
    setIsModified(false);

    try {
      const fileContent = await invoke<string>("read_file", { path: filePath });
      setContent(fileContent);
      originalContentRef.current = fileContent; // Track original for modification detection
      setActiveFile(filePath, fileContent);

      // Connect plugin to editor AFTER content is loaded
      setTimeout(() => {
        if (editorRef.current && typeof editorRef.current.getCoreEditor === 'function') {
          const coreEditor = editorRef.current.getCoreEditor();
          if (coreEditor) {
            console.log('🔌 [WindowContent] Connecting plugin to editor after content load');
            console.log('🔌 [WindowContent] Editor content length after load:', coreEditor.getContent().length);
            setActiveEditorRef.current(coreEditor);
          }
        }
      }, 100); // Small delay to ensure editor has rendered with content

    } catch (err) {
      console.error("Error loading file:", err);
      showError({
        title: "Não foi possível abrir o arquivo",
        message: "Ocorreu um problema ao tentar abrir este arquivo. Verifique se o arquivo existe e se você tem permissão para acessá-lo.",
        details: err instanceof Error ? err.message : "Erro desconhecido",
        onRetry: () => loadFileContent(filePath)
      });
      setContent("");
    } finally {
      setIsLoading(false);
    }
  }, [showError, setActiveFile]);

  const saveFileContent = useCallback(async (filePath: string, content: string) => {
    try {
      await invoke("write_file", { filePath, content });
      return true;
    } catch (err) {
      console.error("Error saving file:", err);
      showError({
        title: "Não foi possível salvar o arquivo",
        message: "Ocorreu um problema ao tentar salvar suas alterações. Tente novamente ou verifique se você tem permissão para escrever neste local.",
        details: err instanceof Error ? err.message : "Erro desconhecido"
      });
      return false;
    }
  }, [showError]);

  const previousFileRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (selectedFile && selectedFile !== previousFileRef.current) {
      previousFileRef.current = selectedFile;
      loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  // Notify footer about initial content when file loads
  useEffect(() => {
    if (showEditorFooter && content && externalOnContentChange) {
      externalOnContentChange(content);
    }
  }, [content, showEditorFooter, externalOnContentChange]);

  const handleContentChange = useCallback((newContent: string) => {
    // DON'T update content state during typing - this causes cursor resets
    // Only update modification state and notify external consumers
    setIsModified(newContent !== originalContentRef.current);
    
    // Notify footer about content changes
    if (showEditorFooter && externalOnContentChange) {
      externalOnContentChange(newContent);
    }
  }, [showEditorFooter, externalOnContentChange]);

  const handleSave = useCallback(
    async (contentToSave: string) => {
      if (!selectedFile) return;

      try {
        const success = await saveFileContent(selectedFile, contentToSave);
        if (success) {
          originalContentRef.current = contentToSave; // Update original content reference
          // DON'T update content state - this would trigger editor reset and cursor jump
          setIsModified(false);
          console.log('💾 [WindowContent] File saved successfully, cursor position preserved');
          
          // Update footer with saved content
          if (showEditorFooter && externalOnContentChange) {
            externalOnContentChange(contentToSave);
          }
        }
      } catch (error) {
        console.error("Error in handleSave:", error);
      }
    },
    [selectedFile, saveFileContent, showEditorFooter, externalOnContentChange],
  );

  const handleError = useCallback((error: Error) => {
    console.error("Editor error:", error);
    showError({
      title: "Erro no editor",
      message: "Ocorreu um problema no editor de texto. Suas alterações podem não ter sido salvas.",
      details: error.message
    });
  }, [showError]);

  const handleFilePathChange = useCallback(
    (newPath: string) => {
      onFilePathChange?.(newPath);
    },
    [onFilePathChange],
  );

  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode((prev) => {
      const newMode = !prev;
      onPreviewModeChange?.(newMode);
      return newMode;
    });
  }, [onPreviewModeChange]);

  const performSave = useCallback(() => {
    if (editorRef.current) {
      const currentContent = editorRef.current.getContent();
      handleSave(currentContent);
    }
  }, [handleSave]);

  useEffect(() => {
    onSaveRef.current = performSave;
    return () => {
      if (onSaveRef) {
        onSaveRef.current = null;
      }
    };
  }, [performSave, onSaveRef]);

  useEffect(() => {
    if (onTogglePreviewRef) {
      onTogglePreviewRef.current = togglePreviewMode;
      return () => {
        if (onTogglePreviewRef) {
          onTogglePreviewRef.current = null;
        }
      };
    }
  }, [togglePreviewMode, onTogglePreviewRef]);

  // Stable refs to avoid dependency issues - update in useEffect to avoid render-time updates
  const setActiveEditorRef = useRef(setActiveEditor);
  const clearActiveEditorRef = useRef(clearActiveEditor);
  
  useEffect(() => {
    setActiveEditorRef.current = setActiveEditor;
    clearActiveEditorRef.current = clearActiveEditor;
  }, [setActiveEditor, clearActiveEditor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearActiveEditorRef.current();
    };
  }, []);

  if (!selectedFile) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold theme-text-primary mb-2">
            Selecione um arquivo
          </h2>
          <p className="theme-text-muted">
            Escolha um arquivo markdown na barra lateral para começar a editar
          </p>
        </div>
      </div>
    );
  }

  const fileName = selectedFile?.split("/").pop();

  const resolvedTheme =
    themeMode === "auto"
      ? typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : (themeMode as "light" | "dark");

  if (isLoading) {
    return (
      <div
        className="flex-1 flex items-center justify-center"
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderBottomColor: "var(--theme-primary)" }}
          ></div>
          <p className="theme-text-muted">Carregando arquivo...</p>
          <p className="text-xs theme-text-muted mt-1">{fileName}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex ml-[8vw] mr-[8vw] flex-col h-full relative">
      {isModified && (
        <div className="absolute top-2 right-2 z-10">
          <div
            className="px-2 py-1 rounded text-xs font-medium"
            style={{
              backgroundColor: "var(--theme-accent)",
              color: "var(--theme-accent-foreground)",
            }}
          >
            Não salvo
          </div>
        </div>
      )}

      <div
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
      >
        <Title
          filePath={selectedFile}
          onFilePathChange={handleFilePathChange}
          className="text-xl font-semibold theme-text-primary"
        />
      </div>

      <div className="theme-editor flex-1 flex flex-col min-h-0 relative">
        <EditorComponent
          ref={editorRef}
          initialContent={content}
          themeName={resolvedTheme}
          showPreview={isPreviewMode}
          onContentChange={handleContentChange}
          onSave={handleSave}
          onError={handleError}
        />
      </div>
    </div>
  );
});
