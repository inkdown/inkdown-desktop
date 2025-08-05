import { EventEmitter } from '../utils/EventEmitter';
import type { Editor } from '../core/Editor';

export interface PreviewConfig {
  container: HTMLElement;
  theme?: 'light' | 'dark';
}

export class MarkdownPreview extends EventEmitter {
  private container: HTMLElement;
  private previewElement: HTMLElement;
  private editor?: Editor;
  private config: PreviewConfig;
  private updateTimeout?: number;

  constructor(config: PreviewConfig) {
    super();
    this.config = config;
    this.container = config.container;
    this.initialize();
  }

  private initialize(): void {
    this.createPreviewElement();
    this.emit('initialized');
  }

  private createPreviewElement(): void {
    this.previewElement = document.createElement('pre');
    this.previewElement.className = `markdown-preview theme-${this.config.theme || 'light'}`;
    this.previewElement.style.cssText = `
      width: 100%;
      height: auto;
      min-height: 200px;
      overflow-y: visible;
      padding: 20px;
      margin: 0;
      background: var(--preview-bg, #ffffff);
      color: var(--preview-text, #24292f);
      font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      border: none;
      outline: none;
    `;
    this.container.appendChild(this.previewElement);
  }

  public connectToEditor(editor: Editor): void {
    this.editor = editor;
    this.editor.on('change', this.debouncedUpdate);
    this.updateContent();
  }

  public disconnectFromEditor(): void {
    if (this.editor) {
      this.editor.off('change', this.debouncedUpdate);
      this.editor = undefined;
    }
  }

  private debouncedUpdate = (): void => {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = window.setTimeout(() => {
      this.updateContent();
    }, 250);
  };

  private updateContent(): void {
    if (!this.editor) return;
    const markdown = this.editor.getContent();
    this.previewElement.textContent = markdown;
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.previewElement.className = `markdown-preview theme-${theme}`;
  }

  public destroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.disconnectFromEditor();
    if (this.container.contains(this.previewElement)) {
      this.container.removeChild(this.previewElement);
    }
    this.removeAllListeners();
  }
}