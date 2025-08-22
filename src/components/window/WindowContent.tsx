import { useState, useEffect, useCallback, useRef, memo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EditorComponent } from "../editor/EditorComponent";
import { Title } from "../editor/Title";
import type { EditorComponentHandle } from "../editor/EditorComponent";
import { useError } from "../../contexts/ErrorContext";
import { useEditingStore } from "../../stores/editingStore";
import { usePluginStore } from "../../stores/pluginStore";
import type { ThemeMode } from "../../types/appearance";

interface WindowContentProps {
  selectedFile: string | null;
  onFilePathChange?: (newPath: string) => void;
  themeMode: ThemeMode;
  onSaveRef?: React.MutableRefObject<(() => void) | null>;
  onTogglePreviewRef?: React.MutableRefObject<(() => void) | null>;
  onContentChange?: (content: string) => void;
  onPreviewModeChange?: (isPreview: boolean) => void;
  showEditorFooter?: boolean;
}

const WindowContentInternal = ({
  selectedFile,
  onFilePathChange,
  themeMode,
  onSaveRef,
  onTogglePreviewRef,
  onContentChange,
  onPreviewModeChange,
  showEditorFooter,
}: WindowContentProps) => {
  const [fileContent, setFileContent] = useState<string>("");
  const [currentContent, setCurrentContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModified, setIsModified] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const editorRef = useRef<EditorComponentHandle>(null);
  const originalContentRef = useRef<string>("");
  const contentChangeTimeoutRef = useRef<number>();
  
  const { showError } = useError();
  const { setActiveFile } = useEditingStore();
  const { setActiveEditor, clearActiveEditor } = usePluginStore();

  const saveFileContent = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    try {
      console.log('Saving file:', { filePath, contentLength: content.length });
      await invoke("write_file", { filePath, content });
      return true;
    } catch (error) {
      console.error("Error saving file:", error);
      throw error;
    }
  }, []);

  // Handle external content change notifications with debouncing
  const lastNotifiedContentRef = useRef<string>("");
  
  useEffect(() => {
    if (showEditorFooter && currentContent && onContentChange && currentContent !== lastNotifiedContentRef.current) {
      // Clear any existing timeout
      if (contentChangeTimeoutRef.current) {
        clearTimeout(contentChangeTimeoutRef.current);
      }
      
      // Debounce the content change notification
      contentChangeTimeoutRef.current = window.setTimeout(() => {
        onContentChange(currentContent);
        lastNotifiedContentRef.current = currentContent;
      }, 100);
      
      // Cleanup timeout on unmount
      return () => {
        if (contentChangeTimeoutRef.current) {
          clearTimeout(contentChangeTimeoutRef.current);
        }
      };
    }
  }, [currentContent, showEditorFooter, onContentChange]);

  const loadFileContent = useCallback(async (filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
      console.error('Invalid file path:', filePath);
      return;
    }

    setIsLoading(true);
    setIsModified(false);

    try {
      // Use the correct parameter name for the Rust command
      const contentStr = await invoke<string>("read_file", { path: filePath });
      
      console.log('📖 File loaded:', {
        path: filePath,
        contentLength: contentStr.length,
        contentPreview: contentStr.substring(0, 50) + '...'
      });
      
      // Simple state updates - key-based remounting prevents cursor issues
      setFileContent(contentStr);
      setCurrentContent(contentStr);
      originalContentRef.current = contentStr;
      
      setActiveFile(filePath, contentStr);
      
    } catch (error) {
      console.error("Error loading file:", error);
      showError({
        title: "Erro ao carregar arquivo",
        message: `Não foi possível abrir o arquivo: ${filePath}`,
        details: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setIsLoading(false);
    }
  }, [setActiveFile, showError]);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  const handleContentChange = useCallback((newContent: string) => {
    const wasModified = newContent !== originalContentRef.current;
    setIsModified(wasModified);
    setCurrentContent(prevContent => {
      if (prevContent === newContent) {
        return prevContent;
      }
      return newContent;
    });
  }, []);

  const handleSave = useCallback(async (contentToSave: string) => {
    if (!selectedFile) return;

    try {
      const success = await saveFileContent(selectedFile, contentToSave);
      if (success) {
        // Update all content references after successful save - but DON'T change fileContent
        // to avoid triggering initialContent changes that reset cursor
        originalContentRef.current = contentToSave;
        setCurrentContent(contentToSave);
        setIsModified(false);
        
        // Update the active file store with saved content
        setActiveFile(selectedFile, contentToSave);
      }
    } catch (error) {
      console.error("Error in handleSave:", error);
      showError({
        title: "Erro ao salvar",
        message: "Não foi possível salvar o arquivo",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }, [selectedFile, saveFileContent, showError, setActiveFile]);

  const handleError = useCallback((error: Error) => {
    console.error("Editor error:", error);
    showError({
      title: "Erro no editor",
      message: "Ocorreu um problema no editor de texto. Suas alterações podem não ter sido salvas.",
      details: error.message
    });
  }, [showError]);

  const togglePreviewMode = useCallback(() => {
    setIsPreviewMode((prev) => {
      const newMode = !prev;
      onPreviewModeChange?.(newMode);
      return newMode;
    });
  }, [onPreviewModeChange]);

  const performSave = useCallback(() => {
    if (editorRef.current) {
      const contentToSave = editorRef.current.getContent();
      handleSave(contentToSave);
    }
  }, [handleSave]);

  // Set up save and toggle preview refs
  useEffect(() => {
    if (onSaveRef) {
      onSaveRef.current = performSave;
    }
    if (onTogglePreviewRef) {
      onTogglePreviewRef.current = togglePreviewMode;
    }
  }, [performSave, togglePreviewMode, onSaveRef, onTogglePreviewRef]);

  // Plugin integration - ensure the editor is properly registered
  useEffect(() => {
    const editor = editorRef.current?.getCoreEditor();
    if (editor && selectedFile) {
      setActiveEditor(editor);
      
      // Update global active file for plugins
      (window as any).__activeFile = {
        path: selectedFile,
        name: selectedFile.split("/").pop() || "",
        content: currentContent || fileContent,
      };
      (window as any).__activeFilePath = selectedFile;
    } else {
      clearActiveEditor();
    }
    
    return () => {
      clearActiveEditor();
      (window as any).__activeFile = null;
      (window as any).__activeFilePath = null;
    };
  }, [editorRef.current, selectedFile, currentContent, fileContent, setActiveEditor, clearActiveEditor]);

  // Handle file path changes
  useEffect(() => {
    if (selectedFile && onFilePathChange) {
      onFilePathChange(selectedFile);
    }
  }, [selectedFile, onFilePathChange]);

  // Handle file path changes (for Title component rename functionality)
  const handleFilePathChange = useCallback((newPath: string) => {
    if (onFilePathChange) {
      onFilePathChange(newPath);
    }
  }, [onFilePathChange]);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando arquivo...</p>
        </div>
      </div>
    );
  }

  if (!selectedFile) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            Nenhum arquivo selecionado
          </h3>
          <p className="text-sm text-muted-foreground">
            Selecione um arquivo na barra lateral para começar a editar.
          </p>
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

      <div className="px-4 py-3 flex items-center justify-between flex-shrink-0">
        <Title
          filePath={selectedFile}
          onFilePathChange={handleFilePathChange}
          className="text-xl font-semibold theme-text-primary"
        />
      </div>

      <div className="theme-editor flex-1 flex flex-col min-h-0 relative">
        <EditorComponent
          ref={editorRef}
          initialContent={fileContent}
          themeName={themeMode}
          showPreview={isPreviewMode}
          onContentChange={handleContentChange}
          onSave={handleSave}
          onError={handleError}
        />
      </div>
    </div>
  );
};



const WindowContent = memo(WindowContentInternal, (prevProps, nextProps) => {
  return (
    prevProps.selectedFile === nextProps.selectedFile &&
    prevProps.themeMode === nextProps.themeMode &&
    prevProps.showEditorFooter === nextProps.showEditorFooter &&
    prevProps.onFilePathChange === nextProps.onFilePathChange &&
    prevProps.onContentChange === nextProps.onContentChange &&
    prevProps.onPreviewModeChange === nextProps.onPreviewModeChange
  );
});

export { WindowContent };