import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { ExtensionsFactory } from '../codemirror/extensions';
import { EventEmitter } from '../utils/EventEmitter';

export interface EditorConfig {
  container: HTMLElement;
  content?: string;
  readOnly?: boolean;
  theme?: 'light' | 'dark';
  markdown?: boolean;
  vim?: boolean;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
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

export class Editor extends EventEmitter {
  private container: HTMLElement;
  private view!: EditorView;
  private config: EditorConfig;
  private lastContent = '';
  private isModified = false;
  private debounceTimer?: number;

  constructor(config: EditorConfig) {
    super();
    this.config = config;
    this.container = config.container;
    this.lastContent = config.content || '';
    this.initialize();
  }

  private initialize(): void {
    this.createEditor();
    this.emit('initialized');
  }

  private createEditor(): void {
    this.container.innerHTML = '';
    
    const extensions = ExtensionsFactory.buildExtensions({
      markdown: this.config.markdown !== false,
      vim: this.config.vim || false,
      showLineNumbers: this.config.showLineNumbers !== false,
      highlightCurrentLine: this.config.highlightCurrentLine !== false,
      theme: this.config.theme || 'light',
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
    }, 150);
  };

  private handleDocumentChange(update: any): void {
    const content = update.state.doc.toString();
    
    if (content !== this.lastContent) {
      this.lastContent = content;
      this.isModified = true;
      this.emit('change', this.getState());
    }
  }

  private handleSelectionUpdate(update: any): void {
    const selection = update.state.selection.main;
    const doc = update.state.doc;
    const line = doc.lineAt(selection.head);
    const lineNumber = line.number - 1;
    const column = selection.head - line.from;
    
    this.emit('cursor', { line: lineNumber, column });
  }

  public getContent(): string {
    return this.view.state.doc.toString();
  }

  public setContent(content: string): void {
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content,
      },
    });
    
    this.lastContent = content;
    this.isModified = false;
    this.emit('change', this.getState());
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

  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.view.destroy();
    this.removeAllListeners();
  }

  public isReady(): boolean {
    return !!this.view;
  }

  public updateTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.applyTheme();
    const currentContent = this.getContent();
    this.createEditor();
    this.setContent(currentContent);
  }
}