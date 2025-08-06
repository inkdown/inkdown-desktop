import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { EditorComponent, EditorComponentHandle } from '../editor/EditorComponent';
import { Title } from '../editor/Title';
import { useAppearance } from '../../contexts/AppearanceContext';

interface WindowContentProps {
  selectedFile: string;
}

export const WindowContent = memo(function WindowContent({ selectedFile }: WindowContentProps) {
  const { currentTheme, themeMode } = useAppearance();
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  const editorRef = useRef<EditorComponentHandle>(null);

  const loadFileContent = useCallback(async (filePath: string) => {
    if (!filePath) return;
    
    setIsLoading(true);
    setError(null);
    setIsModified(false);
    
    try {
      const content = await invoke<string>('read_file', { path: filePath });
      setFileContent(content);
    } catch (err) {
      console.error('Error loading file:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar arquivo');
      setFileContent('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveFileContent = useCallback(async (filePath: string, content: string) => {
    try {
      await invoke('write_file', { path: filePath, content });
      return true;
    } catch (err) {
      console.error('Error saving file:', err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar arquivo');
      return false;
    }
  }, []);

  useEffect(() => {
    if (selectedFile) {
      loadFileContent(selectedFile);
    }
  }, [selectedFile, loadFileContent]);

  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
    setIsModified(true);
    setError(null);
  }, []);

  const handleSave = useCallback(async (content: string) => {
    if (!selectedFile) return;
    
    try {
      const success = await saveFileContent(selectedFile, content);
      if (success) {
        setFileContent(content);
        setIsModified(false);
        setError(null);
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
    }
  }, [selectedFile, saveFileContent]);

  const handleError = useCallback((error: Error) => {
    console.error('Editor error:', error);
    setError(error.message);
  }, []);

  const handleFilePathChange = useCallback((_: string) => {
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (editorRef.current) {
          const currentContent = editorRef.current.getContent();
          handleSave(currentContent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (!selectedFile) {
    return (
      <div className="flex-1 flex items-center justify-center theme-card">
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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center theme-card">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" style={{ borderBottomColor: currentTheme.primary }}></div>
          <p className="theme-text-muted">Carregando arquivo...</p>
          <p className="text-xs theme-text-muted mt-1">{selectedFile.split('/').pop()}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center theme-card">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4" style={{ color: currentTheme.destructive }}>⚠️</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: currentTheme.foreground }}>Erro ao carregar arquivo</h3>
          <p className="theme-text-muted mb-4">{error}</p>
          <p className="text-xs theme-text-muted mb-4">{selectedFile}</p>
          <button
            onClick={() => loadFileContent(selectedFile)}
            className="theme-button px-4 py-2 rounded-lg theme-transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 theme-card relative flex flex-col overflow-auto">
      {isModified && (
        <div className="absolute top-2 right-2 z-10">
          <div className="px-2 py-1 rounded text-xs font-medium" style={{ 
            backgroundColor: '#fef3c7', 
            color: '#92400e' 
          }}>
            Não salvo
          </div>
        </div>
      )}
      
      <div className="px-4 py-3 theme-border flex items-center justify-between" style={{ 
        borderBottom: `1px solid ${currentTheme.border}`,
        backgroundColor: currentTheme.muted
      }}>
        <Title 
          filePath={selectedFile}
          onFilePathChange={handleFilePathChange}
          className="text-xl font-semibold theme-text-primary"
        />
      </div>

      <div className="theme-editor">
        <EditorComponent
        ref={editorRef}
        initialContent={fileContent}
        themeName={themeMode === 'auto' 
          ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : (themeMode as 'light' | 'dark')}
        onContentChange={handleContentChange}
        onSave={handleSave}
        onError={handleError}
      />
      </div>
    </div>
  );
});