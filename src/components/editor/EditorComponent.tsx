import { useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback } from 'react';
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
  const currentContentRef = useRef(initialContent);

  const {
    vimMode: configVimMode,
    showLineNumbers: configShowLineNumbers,
    highlightCurrentLine: configHighlightCurrentLine,
    readOnly: configReadOnly,
    fontSize: configFontSize,
    fontFamily: configFontFamily,
    pasteUrlsAsLinks: configPasteUrlsAsLinks
  } = useAppearance();

  const finalTheme: 'light' | 'dark' = themeName || effectiveTheme;

  // Memoize config to prevent unnecessary recreations
  const editorConfig = useMemo((): EditorConfig => ({
    container: editorContainerRef.current!,
    content: initialContent,
    readOnly: configReadOnly ?? readOnly ?? false,
    theme: finalTheme,
    markdownShortcuts: true,
    githubMarkdown: false,
    vim: configVimMode ?? plugins.includes('vim'),
    showLineNumbers: configShowLineNumbers ?? showLineNumbers ?? true,
    highlightCurrentLine: configHighlightCurrentLine ?? highlightCurrentLine ?? true,
    fontSize: configFontSize ?? fontSize ?? 14,
    fontFamily: configFontFamily ?? fontFamily ?? 'Inter, system-ui, sans-serif',
    pasteUrlsAsLinks: configPasteUrlsAsLinks,
  }), [
    initialContent,
    configReadOnly, readOnly,
    finalTheme,
    configVimMode, plugins,
    configShowLineNumbers, showLineNumbers,
    configHighlightCurrentLine, highlightCurrentLine,
    configFontSize, fontSize,
    configFontFamily, fontFamily,
    configPasteUrlsAsLinks
  ]);

  // Memoize handlers to prevent recreations
  const handleStateChange = useCallback((state: EditorStateInfo) => {
    currentContentRef.current = state.content;
    onStateChange?.(state);
    onContentChange?.(state.content);
    if (previewRef.current) {
      previewRef.current.updateFromContent(state.content);
    }
  }, [onStateChange, onContentChange]);

  const initializeEditor = useCallback(() => {
    if (!editorContainerRef.current || isInitialized.current) return;

    try {
      const config: EditorConfig = {
        ...editorConfig,
        container: editorContainerRef.current,
        onChange: handleStateChange,
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
  }, [editorConfig, handleStateChange, showPreview, finalTheme, initialContent, onError]);

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

  // Memoized config comparison for better performance
  const configUpdateNeeded = useMemo(() => {
    if (!isInitialized.current) return false;

    return {
      theme: finalTheme,
      vim: configVimMode,
      showLineNumbers: configShowLineNumbers,
      highlightCurrentLine: configHighlightCurrentLine,
      readOnly: configReadOnly,
      fontSize: configFontSize,
      fontFamily: configFontFamily,
      pasteUrlsAsLinks: configPasteUrlsAsLinks,
    };
  }, [finalTheme, configVimMode, configShowLineNumbers, configHighlightCurrentLine, configReadOnly, configFontSize, configFontFamily, configPasteUrlsAsLinks]);

  useEffect(() => {
    if (!editorRef.current || !isInitialized.current || !configUpdateNeeded) return;

    const hasContentChanged = initialContent !== editorRef.current.getContent();

    if (hasContentChanged) {
      editorRef.current.setContent(initialContent);
    }

    editorRef.current.updateConfig(configUpdateNeeded);

    if (previewRef.current) {
      previewRef.current.updateConfig({
        theme: finalTheme,
      });
    }
  }, [configUpdateNeeded, initialContent, finalTheme]);

  // Memoized preview effect handler
  const handlePreviewToggle = useCallback(() => {
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
  }, [showPreview, finalTheme, initialContent]);

  useEffect(() => {
    handlePreviewToggle();
  }, [handlePreviewToggle]);


  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() || '',
    setContent: (content: string) => editorRef.current?.setContent(content),
    focus: () => editorRef.current?.focus(),
  }), []);



  return (
    <div className={`editor-wrapper h-full ${className} relative`}>
      <div className="h-full relative">
        <div
          ref={editorContainerRef}
          className={`editor-container inkdown-editor cm-theme-${finalTheme} h-full ${showPreview ? 'hidden' : 'block'}`}
          style={{ backgroundColor: 'var(--inkdown-editor-bg)' }}
        />
        <div
          ref={previewContainerRef}
          className={`preview-container absolute inset-0 z-10 overflow-auto ${showPreview ? 'block' : 'hidden'}`}
          style={{ backgroundColor: 'var(--inkdown-editor-bg)' }}
        />
      </div>
    </div>
  );
});

EditorComponent.displayName = 'EditorComponent';
export default EditorComponent;

