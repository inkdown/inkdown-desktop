import { invoke } from '@tauri-apps/api/core';

interface ParseResult {
  html: string;
  word_count: number;
  error?: string;
}

export interface PreviewConfig {
  container: HTMLElement;
  theme?: 'light' | 'dark';
}

export class MarkdownPreview {
  private container: HTMLElement;
  private previewElement!: HTMLElement;
  private config: PreviewConfig;
  private updateTimeout?: number;
  private lastContent: string = '';
  private lastHtml: string = '';

  constructor(config: PreviewConfig) {
    this.config = config;
    this.container = config.container;
    this.initialize();
  }

  private initialize(): void {
    this.createPreviewElement();
  }

  private createPreviewElement(): void {
    this.previewElement = document.createElement('div');
    this.previewElement.className = 'markdown-preview-content';
    this.container.appendChild(this.previewElement);
  }

  public updateFromContent(content: string): void {
    this.debouncedUpdate(content);
  }

  private debouncedUpdate = (content: string): void => {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    // Reduced debounce time for better responsiveness
    this.updateTimeout = window.setTimeout(() => {
      this.updateContent(content);
    }, 50);
  };

  private async updateContent(content: string): Promise<void> {
    try {
      // Skip update if content hasn't changed
      if (content === this.lastContent) {
        return;
      }

      if (!content.trim()) {
        if (this.lastHtml !== '') {
          this.previewElement.innerHTML = '';
          this.lastHtml = '';
        }
        this.lastContent = content;
        return;
      }

      const result: ParseResult = await invoke('parse_markdown_to_html', { 
        markdown: content 
      });

      if (result.error) {
        console.error('Markdown parsing error:', result.error);
        const errorHtml = `<div class="error">Erro ao processar markdown: ${result.error}</div>`;
        // Only update if different
        if (this.lastHtml !== errorHtml) {
          this.previewElement.innerHTML = errorHtml;
          this.lastHtml = errorHtml;
        }
        this.lastContent = content;
        return;
      }

      // Only update DOM if HTML has actually changed
      if (result.html !== this.lastHtml) {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
          this.previewElement.innerHTML = result.html;
        });
        this.lastHtml = result.html;
      }
      
      this.lastContent = content;
    } catch (error) {
      console.error('Error updating preview:', error);
      const errorHtml = `<div class="error">Erro ao renderizar preview: ${error}</div>`;
      if (this.lastHtml !== errorHtml) {
        this.previewElement.innerHTML = errorHtml;
        this.lastHtml = errorHtml;
      }
      this.lastContent = content;
    }
  }

  public setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    // O tema agora é controlado através de CSS custom properties
    // Não precisamos alterar as classes
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