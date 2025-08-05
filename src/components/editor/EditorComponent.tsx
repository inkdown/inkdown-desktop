import { useRef, forwardRef, useImperativeHandle, useMemo, useEffect, useCallback } from 'react';
import { Editor, EditorConfig, EditorStateInfo } from './core/Editor';
import { MarkdownPreview } from './preview/MarkdownPreview';
import { useTheme } from '../../contexts/ThemeContext';
import './styles/editor.simple.css';

export interface EditorComponentProps {
  initialContent?: string;
  themeName?: 'light' | 'dark';
  plugins?: string[];
  readOnly?: boolean;
  showPreview?: boolean;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
  className?: string;
  onContentChange?: (content: string) => void;
  onStateChange?: (state: EditorStateInfo) => void;
  onSave?: (content: string) => void;
  onError?: (error: Error) => void;
}

export interface EditorComponentHandle {
  getContent: () => string;
  setContent: (content: string) => void;
  focus: () => void;
}

export const EditorComponent = forwardRef<EditorComponentHandle, EditorComponentProps>(({
  initialContent = '',
  themeName,
  plugins = [],
  readOnly = false,
  showPreview = false,
  showLineNumbers = true,
  highlightCurrentLine = true,
  className = '',
  onContentChange,
  onStateChange,
  onSave,
  onError,
}, ref) => {
  const { currentTheme } = useTheme();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const previewRef = useRef<MarkdownPreview | null>(null);
  
  const effectiveTheme: 'light' | 'dark' = currentTheme.mode === 'auto' 
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : (currentTheme.mode as 'light' | 'dark');

  const initializeEditor = useCallback(() => {
    if (!editorContainerRef.current || editorRef.current) return;

    try {
      const config: EditorConfig = {
        container: editorContainerRef.current,
        content: initialContent,
        readOnly,
        theme: effectiveTheme,
        markdown: true,
        vim: plugins.includes('vim'),
        showLineNumbers,
        highlightCurrentLine,
      };

      editorRef.current = new Editor(config);

      const handleChange = (state: EditorStateInfo) => {
        onStateChange?.(state);
        onContentChange?.(state.content);
      };

      editorRef.current.on('change', handleChange);

      if (showPreview && previewContainerRef.current) {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: effectiveTheme,
        });
        previewRef.current.connectToEditor(editorRef.current);
      }

    } catch (error) {
      onError?.(error as Error);
    }
  }, [effectiveTheme, readOnly, showPreview, showLineNumbers, highlightCurrentLine, plugins, onStateChange, onContentChange, onError]);

  const cleanup = useCallback(() => {
    editorRef.current?.destroy();
    previewRef.current?.destroy();
    editorRef.current = null;
    previewRef.current = null;
  }, []);

  useEffect(() => {
    initializeEditor();
    return cleanup;
  }, [initializeEditor, cleanup]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateTheme(effectiveTheme);
    }
    if (previewRef.current) {
      previewRef.current.setTheme(effectiveTheme);
    }
  }, [effectiveTheme]);

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() || '',
    setContent: (content: string) => editorRef.current?.setContent(content),
    focus: () => editorRef.current?.focus(),
  }), []);

  const layoutStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr',
    minHeight: '200px',
    gap: showPreview ? '1px' : '0',
    backgroundColor: currentTheme.colors.border,
  }), [showPreview, currentTheme.colors.border]);


  return (
    <div className={`editor-wrapper ${className}`}>      
      <div style={layoutStyle}>
        <div
          ref={editorContainerRef}
          className={`editor-container cm-theme-${effectiveTheme}`}
          style={{ backgroundColor: 'var(--theme-background)' }}
        />
        {showPreview && (
          <div
            ref={previewContainerRef}
            className="preview-container"
            style={{ 
              backgroundColor: 'var(--theme-background)', 
              color: 'var(--theme-foreground)',
              overflow: 'visible' 
            }}
          />
        )}
      </div>
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';

export default EditorComponent;