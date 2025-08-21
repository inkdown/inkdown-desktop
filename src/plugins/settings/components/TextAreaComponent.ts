import { BaseComponent } from './BaseComponent';

export class TextAreaComponent extends BaseComponent {
  public inputEl: HTMLTextAreaElement;
  private changeCallback?: (value: string) => void;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementInitialized();
  }

  private ensureElementInitialized(): void {
    if (!this.inputEl && this.componentEl && this.componentEl.tagName === 'TEXTAREA') {
      this.inputEl = this.componentEl as HTMLTextAreaElement;
    }
  }

  protected createElement(): HTMLElement {
    this.inputEl = this.createBaseTextArea();
    this.setupEvents();
    return this.inputEl;
  }

  private setupEvents(): void {
    this.inputEl.addEventListener('input', (e) => {
      if (this.changeCallback) {
        this.changeCallback((e.target as HTMLTextAreaElement).value);
      }
    });
  }

  setValue(value: string): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.value = value;
    }
    return this;
  }

  getValue(): string {
    if (!this.inputEl) this.ensureElementInitialized();
    return this.inputEl ? this.inputEl.value : '';
  }

  setPlaceholder(placeholder: string): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.placeholder = placeholder;
    }
    return this;
  }

  setRows(rows: number): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.rows = rows;
    }
    return this;
  }

  setCols(cols: number): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.cols = cols;
    }
    return this;
  }

  setDisabled(disabled: boolean): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.disabled = disabled;
      if (disabled) {
        this.inputEl.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        this.inputEl.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
    return this;
  }

  setMaxLength(maxLength: number): this {
    this.inputEl.maxLength = maxLength;
    return this;
  }

  setMinLength(minLength: number): this {
    this.inputEl.minLength = minLength;
    return this;
  }

  setRequired(required: boolean): this {
    this.inputEl.required = required;
    return this;
  }

  setResizable(resizable: boolean): this {
    if (resizable) {
      this.inputEl.style.resize = 'vertical';
      this.inputEl.classList.remove('resize-none');
    } else {
      this.inputEl.style.resize = 'none';
      this.inputEl.classList.add('resize-none');
    }
    return this;
  }

  setWrap(wrap: 'soft' | 'hard' | 'off'): this {
    this.inputEl.wrap = wrap;
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.changeCallback = callback;
    return this;
  }

  focus(): this {
    this.inputEl.focus();
    return this;
  }

  blur(): this {
    this.inputEl.blur();
    return this;
  }

  select(): this {
    this.inputEl.select();
    return this;
  }

  clear(): this {
    this.inputEl.value = '';
    if (this.changeCallback) {
      this.changeCallback('');
    }
    return this;
  }

  insertAtCursor(text: string): this {
    const start = this.inputEl.selectionStart;
    const end = this.inputEl.selectionEnd;
    const value = this.inputEl.value;
    
    this.inputEl.value = value.substring(0, start) + text + value.substring(end);
    this.inputEl.selectionStart = this.inputEl.selectionEnd = start + text.length;
    
    if (this.changeCallback) {
      this.changeCallback(this.inputEl.value);
    }
    
    return this;
  }

  getSelection(): { start: number; end: number; text: string } {
    return {
      start: this.inputEl.selectionStart || 0,
      end: this.inputEl.selectionEnd || 0,
      text: this.inputEl.value.substring(
        this.inputEl.selectionStart || 0,
        this.inputEl.selectionEnd || 0
      )
    };
  }

  setSelection(start: number, end: number): this {
    this.inputEl.setSelectionRange(start, end);
    return this;
  }
}