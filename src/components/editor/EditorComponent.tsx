import { useRef, forwardRef, useImperativeHandle, useMemo, useEffect } from 'react';
import { Editor, EditorConfig, EditorStateInfo } from './core/Editor';
import { MarkdownPreview } from './preview/MarkdownPreview';
import { useSimpleTheme } from '../../contexts/SimpleThemeContext';
import '../../styles/unified-theme.css';

export interface EditorComponentProps {
  initialContent?: string;
  themeName?: 'light' | 'dark';
  plugins?: string[];
  readOnly?: boolean;
  showPreview?: boolean;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
  fontSize?: number;
  fontFamily?: string;
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
  fontSize,
  fontFamily,
  className = '',
  onContentChange,
  onStateChange,
  onSave,
  onError,
}, ref) => {
  const { effectiveTheme } = useSimpleTheme();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const previewRef = useRef<MarkdownPreview | null>(null);
  const isInitialized = useRef(false);
  
  const finalTheme: 'light' | 'dark' = themeName || effectiveTheme;

  const initializeEditor = () => {
    if (!editorContainerRef.current || isInitialized.current) return;

    try {
      const config: EditorConfig = {
        container: editorContainerRef.current,
        content: initialContent,
        readOnly,
        theme: finalTheme,
        markdown: true,
        vim: plugins.includes('vim'),
        showLineNumbers,
        highlightCurrentLine,
        fontSize,
        fontFamily,
      };

      editorRef.current = new Editor(config);

      editorRef.current.on('change', (state: EditorStateInfo) => {
        onStateChange?.(state);
        onContentChange?.(state.content);
      });

      if (showPreview && previewContainerRef.current) {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: finalTheme,
        });
        previewRef.current.connectToEditor(editorRef.current);
      }

      isInitialized.current = true;

    } catch (error) {
      onError?.(error as Error);
    }
  };

  useEffect(() => {
    initializeEditor();
    
    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
      if (previewRef.current) {
        previewRef.current.destroy();
        previewRef.current = null;
      }
      isInitialized.current = false;
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && isInitialized.current) {
      editorRef.current.updateTheme(finalTheme);
    }
    if (previewRef.current) {
      previewRef.current.setTheme(finalTheme);
    }
  }, [finalTheme]);

  useEffect(() => {
    if (editorRef.current && isInitialized.current) {
      const currentContent = editorRef.current.getContent();
      if (initialContent !== currentContent) {
        editorRef.current.setContent(initialContent);
      }
    }
  }, [initialContent]);


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
    backgroundColor: 'var(--theme-border)',
  }), [showPreview]);


  return (
    <div className={`editor-wrapper ${className}`}>      
      <div style={layoutStyle}>
        <div
          ref={editorContainerRef}
          className={`editor-container inkdown-editor cm-theme-${finalTheme}`}
          style={{ backgroundColor: 'var(--inkdown-editor-bg)' }}
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