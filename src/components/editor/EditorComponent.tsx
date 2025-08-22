import { useRef, forwardRef, useImperativeHandle, useEffect, useCallback, memo, useMemo } from 'react';
import { Editor, EditorConfig, EditorStateInfo } from './core/Editor';
import { MarkdownPreview } from './preview/MarkdownPreview';
import { useEffectiveTheme } from '../../stores/appearanceStore';
import { useWorkspaceConfig, useAppearanceConfig } from '../../stores/configStore';

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
  getCoreEditor: () => any;
}

const EditorComponentInternal = forwardRef<EditorComponentHandle, EditorComponentProps>(({
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
  const effectiveTheme = useEffectiveTheme();
  const workspaceConfig = useWorkspaceConfig();
  const appearanceConfig = useAppearanceConfig();
  
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const previewRef = useRef<MarkdownPreview | null>(null);
  const isInitialized = useRef(false);

  const finalTheme: 'light' | 'dark' = themeName || effectiveTheme;

  const handleStateChange = useCallback((state: EditorStateInfo) => {
    onStateChange?.(state);
    
    if (onContentChange) {
      setTimeout(() => onContentChange(state.content), 0);
    }
    
    if (previewRef.current) {
      previewRef.current.updateFromContent(state.content);
    }
  }, [onStateChange, onContentChange]);

  const initializeEditor = useCallback(() => {
    if (!editorContainerRef.current || isInitialized.current) return;

    try {
      const config: EditorConfig = {
        container: editorContainerRef.current,
        content: initialContent,
        theme: finalTheme,
        readOnly: workspaceConfig?.readOnly ?? readOnly,
        vim: workspaceConfig?.vimMode ?? plugins.includes('vim'),
        showLineNumbers: workspaceConfig?.showLineNumbers ?? showLineNumbers,
        highlightCurrentLine: workspaceConfig?.highlightCurrentLine ?? highlightCurrentLine,
        fontSize: appearanceConfig?.["font-size"] ?? fontSize ?? 14,
        fontFamily: appearanceConfig?.["font-family"] ?? fontFamily ?? 'Inter, system-ui, sans-serif',
        markdownShortcuts: true,
        githubMarkdown: false,
        pasteUrlsAsLinks: workspaceConfig?.pasteUrlsAsLinks ?? true,
        onChange: handleStateChange,
      };
      
      editorRef.current = new Editor(config);
      isInitialized.current = true;

    } catch (error) {
      onError?.(error as Error);
    }
  }, [initialContent, handleStateChange, onError]);

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
  }, [initializeEditor]);

  // Update content when initialContent changes - but preserve cursor position
  const lastInitialContentRef = useRef(initialContent);
  useEffect(() => {
    if (editorRef.current && isInitialized.current && initialContent !== lastInitialContentRef.current) {
      console.log('📄 InitialContent changed, updating editor:', {
        from: lastInitialContentRef.current?.length,
        to: initialContent.length
      });
      editorRef.current.setContent(initialContent);
      lastInitialContentRef.current = initialContent;
    }
  }, [initialContent]);

  // Memoize editor config to prevent unnecessary re-renders
  const editorConfig = useMemo(() => ({
    theme: finalTheme,
    vim: workspaceConfig?.vimMode ?? plugins.includes('vim'),
    showLineNumbers: workspaceConfig?.showLineNumbers ?? showLineNumbers,
    highlightCurrentLine: workspaceConfig?.highlightCurrentLine ?? highlightCurrentLine,
    readOnly: workspaceConfig?.readOnly ?? readOnly,
    fontSize: appearanceConfig?.["font-size"] ?? fontSize ?? 14,
    fontFamily: appearanceConfig?.["font-family"] ?? fontFamily ?? 'Inter, system-ui, sans-serif',
    pasteUrlsAsLinks: workspaceConfig?.pasteUrlsAsLinks ?? true,
  }), [
    finalTheme,
    workspaceConfig?.vimMode,
    workspaceConfig?.showLineNumbers,
    workspaceConfig?.highlightCurrentLine,
    workspaceConfig?.readOnly,
    workspaceConfig?.pasteUrlsAsLinks,
    appearanceConfig?.["font-size"],
    appearanceConfig?.["font-family"],
    plugins,
    showLineNumbers,
    highlightCurrentLine,
    readOnly,
    fontSize,
    fontFamily
  ]);

  // Update config when memoized config changes
  useEffect(() => {
    if (!editorRef.current || !isInitialized.current) return;

    editorRef.current.updateConfig(editorConfig);

    if (previewRef.current) {
      previewRef.current.updateConfig({ theme: finalTheme });
    }
  }, [editorConfig, finalTheme]);

  // Handle preview show/hide without recreating editor
  useEffect(() => {
    if (!isInitialized.current) return;

    if (showPreview && !previewRef.current && previewContainerRef.current) {
      previewRef.current = new MarkdownPreview({
        container: previewContainerRef.current,
        theme: finalTheme,
      });
      if (editorRef.current) {
        previewRef.current.updateFromContent(editorRef.current.getContent());
      }
    } else if (!showPreview && previewRef.current) {
      previewRef.current.destroy();
      previewRef.current = null;
    }
  }, [showPreview, finalTheme]);

  // Handle editor focus when toggling preview
  useEffect(() => {
    if (!editorRef.current || !isInitialized.current) return;

    if (showPreview) {
      editorRef.current.blur?.();
    } else {
      requestAnimationFrame(() => {
        editorRef.current?.focus?.();
      });
    }
  }, [showPreview]);

  useImperativeHandle(ref, () => ({
    getContent: () => editorRef.current?.getContent() || '',
    setContent: (content: string) => editorRef.current?.setContent(content),
    focus: () => editorRef.current?.focus(),
    getCoreEditor: () => editorRef.current,
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

EditorComponentInternal.displayName = 'EditorComponentInternal';

export const EditorComponent = memo(EditorComponentInternal, (prevProps, nextProps) => {
  return (
    prevProps.initialContent === nextProps.initialContent &&
    prevProps.themeName === nextProps.themeName &&
    prevProps.readOnly === nextProps.readOnly &&
    prevProps.showPreview === nextProps.showPreview &&
    prevProps.showLineNumbers === nextProps.showLineNumbers &&
    prevProps.highlightCurrentLine === nextProps.highlightCurrentLine &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.fontFamily === nextProps.fontFamily &&
    prevProps.className === nextProps.className &&
    JSON.stringify(prevProps.plugins) === JSON.stringify(nextProps.plugins)
  );
});

EditorComponent.displayName = 'EditorComponent';
export default EditorComponent;