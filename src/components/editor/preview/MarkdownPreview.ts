
export interface PreviewConfig {
  container: HTMLElement;
  theme?: 'light' | 'dark';
}

export class MarkdownPreview {
  private container: HTMLElement;
  private previewElement!: HTMLElement;
  private config: PreviewConfig;
  private updateTimeout?: number;

  constructor(config: PreviewConfig) {
    this.config = config;
    this.container = config.container;
    this.initialize();
  }

  private initialize(): void {
    this.createPreviewElement();
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

  public updateFromContent(content: string): void {
    this.debouncedUpdate(content);
  }

  private debouncedUpdate = (content: string): void => {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = window.setTimeout(() => {
      this.updateContent(content);
    }, 250);
  };

  private updateContent(content: string): void {
    this.previewElement.textContent = content;
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.previewElement.className = `markdown-preview theme-${theme}`;
  }

  public destroy(): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.container.contains(this.previewElement)) {
      this.container.removeChild(this.previewElement);
    }
  }
}