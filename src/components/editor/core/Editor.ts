import { EditorView } from '@codemirror/view';
import { EditorState, StateEffect, type Extension } from '@codemirror/state';
import { ExtensionsFactory } from '../codemirror/extensions';

export interface EditorConfig {
  container: HTMLElement;
  content?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  markdownShortcuts?: boolean;
  githubMarkdown?: boolean;
  vim?: boolean;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
  fontSize?: number;
  fontFamily?: string;
  pasteUrlsAsLinks?: boolean;
  tabIndentation?: boolean;
  onChange?: (state: EditorStateInfo) => void;
  onCursor?: (cursor: { line: number; column: number }) => void;
}

export interface EditorStateInfo {
  content: string;
  selection: {
    start: number;
    end: number;
  };
  cursor: {
    line: number;
    column: number;
  };
  modified: boolean;
  totalLines: number;
}

export class Editor {
  private container: HTMLElement;
  private view!: EditorView;
  private config: EditorConfig;
  private lastContent = '';
  private isModified = false;
  private debounceTimer?: number;
  private extensionsCache = new Map<string, Extension[]>();
  private lastExtensionKey = '';

  constructor(config: EditorConfig) {
    this.config = config;
    this.container = config.container;
    this.lastContent = config.content || '';
    this.initialize();
  }

  private initialize(): void {
    this.createEditor();
  }

  private createEditor(): void {
    this.container.innerHTML = '';
    
    const extensions = this.getCachedExtensions({
      markdownShortcuts: true,
      githubMarkdown: this.config.githubMarkdown || false,
      vim: this.config.vim || false,
      showLineNumbers: this.config.showLineNumbers !== false,
      highlightCurrentLine: this.config.highlightCurrentLine !== false,
      theme: this.config.theme || 'light',
      fontSize: this.config.fontSize,
      fontFamily: this.config.fontFamily,
      pasteUrlsAsLinks: this.config.pasteUrlsAsLinks,
      tabIndentation: this.config.tabIndentation !== false,
    });

    const state = EditorState.create({
      doc: this.config.content || '',
      extensions: [
        ...extensions,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.debouncedDocumentChange(update);
          }
          if (update.selectionSet) {
            this.handleSelectionUpdate(update);
          }
        }),
      ],
    });
    
    this.view = new EditorView({
      state,
      parent: this.container,
    });
    
    this.applyTheme();
  }

  private getCachedExtensions(config: {
    markdownShortcuts?: boolean;
    githubMarkdown?: boolean;
    vim?: boolean;
    showLineNumbers?: boolean;
    highlightCurrentLine?: boolean;
    theme?: 'light' | 'dark';
    fontSize?: number;
    fontFamily?: string;
    pasteUrlsAsLinks?: boolean;
    tabIndentation?: boolean;
  }): Extension[] {
    const key = JSON.stringify(config);
    
    if (this.lastExtensionKey === key && this.extensionsCache.has(key)) {
      return this.extensionsCache.get(key)!;
    }
    
    const extensions = ExtensionsFactory.buildExtensions(config);
    
    // Cache management - keep only last 3 extension sets
    if (this.extensionsCache.size >= 3) {
      const firstKey = this.extensionsCache.keys().next().value;
      
      if(firstKey) {
        this.extensionsCache.delete(firstKey);
      }
    }
    
    this.extensionsCache.set(key, extensions);
    this.lastExtensionKey = key;
    
    return extensions;
  }

  private applyTheme(): void {
    this.container.classList.remove('cm-theme-light', 'cm-theme-dark');
    const theme = this.config.theme || 'light';
    this.container.classList.add(`cm-theme-${theme}`);
  }

  private debouncedDocumentChange = (update: any): void => {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(() => {
      this.handleDocumentChange(update);
    }, 100); // Reduced debounce frequency for better performance
  };

  private handleDocumentChange(update: any): void {
    const content = update.state.doc.toString();
    
    if (content !== this.lastContent) {
      this.lastContent = content;
      this.isModified = true;
      this.config.onChange?.(this.getState());
    }
  }

  private handleSelectionUpdate(update: any): void {
    const selection = update.state.selection.main;
    const doc = update.state.doc;
    const line = doc.lineAt(selection.head);
    const lineNumber = line.number - 1;
    const column = selection.head - line.from;
    
    this.config.onCursor?.({ line: lineNumber, column });
  }

  public getContent(): string {
    return this.view.state.doc.toString();
  }

  public setContent(content: string): void {
    if (this.getContent() === content) return;
    
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });
    
    this.lastContent = content;
    this.isModified = false;
  }

  public getState(): EditorStateInfo {
    const doc = this.view.state.doc;
    const selection = this.view.state.selection.main;
    const line = doc.lineAt(selection.head);
    
    return {
      content: this.getContent(),
      selection: {
        start: selection.from,
        end: selection.to,
      },
      cursor: {
        line: line.number - 1,
        column: selection.head - line.from,
      },
      modified: this.isModified,
      totalLines: doc.lines,
    };
  }


  public focus(): void {
    this.view.focus();
  }

  public blur(): void {
    this.view.contentDOM.blur();
  }

  public getView(): EditorView {
    return this.view;
  }

  public getConfig(): EditorConfig {
    return { ...this.config };
  }

  public isReady(): boolean {
    return !!this.view;
  }

  public updateTheme(theme: 'light' | 'dark'): void {
    if (this.config.theme === theme) return;
    
    this.config.theme = theme;
    this.applyTheme();
    
    const extensions = this.getCachedExtensions({
      markdownShortcuts: this.config.markdownShortcuts !== false,
      githubMarkdown: this.config.githubMarkdown || false,
      vim: this.config.vim || false,
      showLineNumbers: this.config.showLineNumbers !== false,
      highlightCurrentLine: this.config.highlightCurrentLine !== false,
      theme: theme,
      fontSize: this.config.fontSize,
      fontFamily: this.config.fontFamily,
      pasteUrlsAsLinks: this.config.pasteUrlsAsLinks,
      tabIndentation: this.config.tabIndentation !== false,
    });
    
    this.view.dispatch({
      effects: StateEffect.reconfigure.of(extensions)
    });
  }

  public updateConfig(updates: Partial<EditorConfig>): void {
    const hasChanges = Object.keys(updates).some(key => 
      this.config[key as keyof EditorConfig] !== updates[key as keyof EditorConfig]
    );
    
    if (!hasChanges) return;
    
    this.config = { ...this.config, ...updates };
    
    if (updates.theme) {
      this.applyTheme();
    }
    
    const extensions = this.getCachedExtensions({
      markdownShortcuts: this.config.markdownShortcuts !== false,
      githubMarkdown: this.config.githubMarkdown || false,
      vim: this.config.vim || false,
      showLineNumbers: this.config.showLineNumbers !== false,
      highlightCurrentLine: this.config.highlightCurrentLine !== false,
      theme: this.config.theme || 'light',
      fontSize: this.config.fontSize,
      fontFamily: this.config.fontFamily,
      pasteUrlsAsLinks: this.config.pasteUrlsAsLinks,
      tabIndentation: this.config.tabIndentation !== false,
    });
    
    this.view.dispatch({
      effects: StateEffect.reconfigure.of(extensions)
    });
  }

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.extensionsCache.clear();
    this.view.destroy();
  }
}