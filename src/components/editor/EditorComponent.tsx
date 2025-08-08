import { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Editor, EditorConfig, EditorStateInfo } from './core/Editor';
import { MarkdownPreview } from './preview/MarkdownPreview';
import { useAppearance } from '../../contexts/AppearanceContext';

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
  onError,
}, ref) => {
  const { effectiveTheme } = useAppearance();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const previewRef = useRef<MarkdownPreview | null>(null);
  const isInitialized = useRef(false);
  
  const { 
    vimMode: configVimMode, 
    showLineNumbers: configShowLineNumbers, 
    highlightCurrentLine: configHighlightCurrentLine, 
    readOnly: configReadOnly, 
    fontSize: configFontSize, 
    fontFamily: configFontFamily 
  } = useAppearance();
  
  const finalTheme: 'light' | 'dark' = themeName || effectiveTheme;

  const initializeEditor = () => {
    if (!editorContainerRef.current || isInitialized.current) return;

    try {
      const config: EditorConfig = {
        container: editorContainerRef.current,
        content: initialContent,
        readOnly: configReadOnly ?? readOnly ?? false,
        theme: finalTheme,
        markdown: true,
        vim: configVimMode ?? plugins.includes('vim'),
        showLineNumbers: configShowLineNumbers ?? showLineNumbers ?? true,
        highlightCurrentLine: configHighlightCurrentLine ?? highlightCurrentLine ?? true,
        fontSize: configFontSize ?? fontSize ?? 14,
        fontFamily: configFontFamily ?? fontFamily ?? 'Inter, system-ui, sans-serif',
        onChange: (state) => {
          onStateChange?.(state);
          onContentChange?.(state.content);
          if (previewRef.current) {
            previewRef.current.updateFromContent(state.content);
          }
        },
      };

      editorRef.current = new Editor(config);

      if (showPreview && previewContainerRef.current) {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: finalTheme,
        });
        // Initial content sync
        previewRef.current.updateFromContent(initialContent);
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
    if (!editorRef.current || !isInitialized.current) return;

    const hasContentChanged = initialContent !== editorRef.current.getContent();
    if (hasContentChanged) {
      editorRef.current.setContent(initialContent);
    }

    editorRef.current.updateConfig({
      theme: finalTheme,
      vim: configVimMode,
      showLineNumbers: configShowLineNumbers,
      highlightCurrentLine: configHighlightCurrentLine,
      readOnly: configReadOnly,
      fontSize: configFontSize,
      fontFamily: configFontFamily,
    });

    if (previewRef.current) {
      previewRef.current.setTheme(finalTheme);
    }
  }, [finalTheme, initialContent, configVimMode, configShowLineNumbers, configHighlightCurrentLine, configReadOnly, configFontSize, configFontFamily]);

  // Effect to handle showPreview changes
  useEffect(() => {
    if (!isInitialized.current) return;

    if (showPreview && !previewRef.current && previewContainerRef.current) {
      // Create preview when showPreview becomes true
      try {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: finalTheme,
        });
        // Sync current content immediately
        const currentContent = editorRef.current?.getContent() || initialContent;
        if (currentContent) {
          previewRef.current.updateFromContent(currentContent);
        }
      } catch (error) {
        console.error('Failed to create preview:', error);
      }
    } else if (!showPreview && previewRef.current) {
      // Properly destroy preview when showPreview becomes false
      try {
        previewRef.current.destroy();
      } catch (error) {
        console.error('Failed to destroy preview:', error);
      } finally {
        previewRef.current = null;
      }
    }

    // Optimize editor performance when in preview mode
    if (editorRef.current) {
      if (showPreview) {
        // Reduce editor update frequency during preview
        editorRef.current.blur?.();
      } else {
        // Re-focus editor when switching back
        requestAnimationFrame(() => {
          editorRef.current?.focus?.();
        });
      }
    }
  }, [showPreview, finalTheme]);


  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() || '',
    setContent: (content: string) => editorRef.current?.setContent(content),
    focus: () => editorRef.current?.focus(),
  }), []);

  const layoutStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    position: 'relative' as const,
  };


  return (
    <div className={`editor-wrapper ${className}`}>      
      <div style={layoutStyle}>
        <div
          ref={editorContainerRef}
          className={`editor-container inkdown-editor cm-theme-${finalTheme}`}
          style={{ 
            backgroundColor: 'var(--inkdown-editor-bg)',
            flex: 1,
            display: showPreview ? 'none' : 'block'
          }}
        />
        <div
          ref={previewContainerRef}
          className="preview-container"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10,
            display: showPreview ? 'block' : 'none',
            backgroundColor: 'var(--inkdown-editor-bg)',
            overflow: 'auto'
          }}
        />
      </div>
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';

export default EditorComponent;