import { useRef, forwardRef, useImperativeHandle, useEffect, useMemo, useCallback, memo } from 'react';
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
  getCoreEditor: () => any; // Expose core editor for plugins
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
  const currentContentRef = useRef(initialContent);

  const configVimMode = workspaceConfig?.vimMode ?? false;
  const configShowLineNumbers = workspaceConfig?.showLineNumbers ?? true;
  const configHighlightCurrentLine = workspaceConfig?.highlightCurrentLine ?? true;
  const configReadOnly = workspaceConfig?.readOnly ?? false;
  const configFontSize = appearanceConfig?.["font-size"] ?? 14;
  const configFontFamily = appearanceConfig?.["font-family"] ?? "Inter, system-ui, sans-serif";
  const configPasteUrlsAsLinks = workspaceConfig?.pasteUrlsAsLinks ?? true;

  const finalTheme: 'light' | 'dark' = useMemo(() => themeName || effectiveTheme, [themeName, effectiveTheme]);

  const editorConfigRef = useRef<EditorConfig | null>(null);
  
  const themeConfig = useMemo(() => ({
    theme: finalTheme,
  }), [finalTheme]);
  
  const editorSettings = useMemo(() => ({
    readOnly: configReadOnly ?? readOnly ?? false,
    vim: configVimMode ?? plugins.includes('vim'),
    showLineNumbers: configShowLineNumbers ?? showLineNumbers ?? true,
    highlightCurrentLine: configHighlightCurrentLine ?? highlightCurrentLine ?? true,
  }), [configReadOnly, readOnly, configVimMode, plugins, configShowLineNumbers, showLineNumbers, configHighlightCurrentLine, highlightCurrentLine]);
  
  const fontSettings = useMemo(() => ({
    fontSize: configFontSize ?? fontSize ?? 14,
    fontFamily: configFontFamily ?? fontFamily ?? 'Inter, system-ui, sans-serif',
  }), [configFontSize, fontSize, configFontFamily, fontFamily]);
  
  const behaviorSettings = useMemo(() => ({
    markdownShortcuts: true,
    githubMarkdown: false,
    pasteUrlsAsLinks: configPasteUrlsAsLinks,
  }), [configPasteUrlsAsLinks]);
  
  const editorConfig = useMemo((): EditorConfig => {
    return {
      container: editorContainerRef.current!,
      content: initialContent,
      ...themeConfig,
      ...editorSettings,
      ...fontSettings,
      ...behaviorSettings,
    };
  }, [initialContent, themeConfig, editorSettings, fontSettings, behaviorSettings]);

  const handleStateChange = useCallback((state: EditorStateInfo) => {
    currentContentRef.current = state.content;
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
        ...editorConfig,
        container: editorContainerRef.current,
        onChange: handleStateChange,
      };
      
      editorConfigRef.current = config;
      editorRef.current = new Editor(config);

      if (showPreview && previewContainerRef.current) {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: finalTheme,
        });
        previewRef.current.updateFromContent(initialContent);
      }

      isInitialized.current = true;

    } catch (error) {
      onError?.(error as Error);
    }
  }, [editorConfig, handleStateChange, showPreview, finalTheme, onError]);

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

  const prevInitialContentRef = useRef(initialContent);
  useEffect(() => {
    if (editorRef.current && isInitialized.current && initialContent !== prevInitialContentRef.current) {
      editorRef.current.setContent(initialContent);
      currentContentRef.current = initialContent;
      prevInitialContentRef.current = initialContent;
    }
  }, [initialContent]);

  const prevConfigRef = useRef<{
    theme: string;
    vim: boolean;
    showLineNumbers: boolean;
    highlightCurrentLine: boolean;
    readOnly: boolean;
    fontSize: number;
    fontFamily: string;
    pasteUrlsAsLinks: boolean;
  }>({
    theme: finalTheme,
    vim: configVimMode,
    showLineNumbers: configShowLineNumbers,
    highlightCurrentLine: configHighlightCurrentLine,
    readOnly: configReadOnly,
    fontSize: configFontSize,
    fontFamily: configFontFamily,
    pasteUrlsAsLinks: configPasteUrlsAsLinks,
  });

  useEffect(() => {
    if (!editorRef.current || !isInitialized.current) return;

    const current = prevConfigRef.current;
    const changes: Partial<EditorConfig> = {};
    let hasChanges = false;

    if (current.theme !== finalTheme) {
      changes.theme = finalTheme;
      current.theme = finalTheme;
      hasChanges = true;
    }
    if (current.vim !== configVimMode) {
      changes.vim = configVimMode;
      current.vim = configVimMode;
      hasChanges = true;
    }
    if (current.showLineNumbers !== configShowLineNumbers) {
      changes.showLineNumbers = configShowLineNumbers;
      current.showLineNumbers = configShowLineNumbers;
      hasChanges = true;
    }
    if (current.highlightCurrentLine !== configHighlightCurrentLine) {
      changes.highlightCurrentLine = configHighlightCurrentLine;
      current.highlightCurrentLine = configHighlightCurrentLine;
      hasChanges = true;
    }
    if (current.readOnly !== configReadOnly) {
      changes.readOnly = configReadOnly;
      current.readOnly = configReadOnly;
      hasChanges = true;
    }
    if (current.fontSize !== configFontSize) {
      changes.fontSize = configFontSize;
      current.fontSize = configFontSize;
      hasChanges = true;
    }
    if (current.fontFamily !== configFontFamily) {
      changes.fontFamily = configFontFamily;
      current.fontFamily = configFontFamily;
      hasChanges = true;
    }
    if (current.pasteUrlsAsLinks !== configPasteUrlsAsLinks) {
      changes.pasteUrlsAsLinks = configPasteUrlsAsLinks;
      current.pasteUrlsAsLinks = configPasteUrlsAsLinks;
      hasChanges = true;
    }

    if (hasChanges) {
      editorRef.current.updateConfig(changes);
      
      if (editorConfigRef.current) {
        Object.assign(editorConfigRef.current, changes);
      }

      if (previewRef.current && changes.theme) {
        previewRef.current.updateConfig({
          theme: changes.theme,
        });
      }
    }
  }, [finalTheme, configVimMode, configShowLineNumbers, configHighlightCurrentLine, configReadOnly, configFontSize, configFontFamily, configPasteUrlsAsLinks]);

  const handlePreviewToggle = useCallback(() => {
    if (!isInitialized.current) return;

    if (showPreview && !previewRef.current && previewContainerRef.current) {
      try {
        previewRef.current = new MarkdownPreview({
          container: previewContainerRef.current,
          theme: finalTheme,
        });
        const editorContent = editorRef.current?.getContent();
        const currentContent = editorContent || currentContentRef.current || initialContent;
        if (currentContent) {
          previewRef.current.updateFromContent(currentContent);
        }
      } catch (error) {
        console.error('Failed to create preview:', error);
      }
    } else if (!showPreview && previewRef.current) {
      try {
        previewRef.current.destroy();
      } catch (error) {
        console.error('Failed to destroy preview:', error);
      } finally {
        previewRef.current = null;
      }
    }

    if (editorRef.current) {
      if (showPreview) {
        editorRef.current.blur?.();
      } else {
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
    getCoreEditor: () => editorRef.current, // Expose core editor for plugins
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
  const pluginsEqual = (prevProps.plugins?.length === nextProps.plugins?.length) &&
    (prevProps.plugins?.every((plugin, index) => plugin === nextProps.plugins?.[index]) ?? true);
    
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
    pluginsEqual
  );
});

EditorComponent.displayName = 'EditorComponent';
export default EditorComponent;

