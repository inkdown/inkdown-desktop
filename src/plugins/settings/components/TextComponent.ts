import { BaseComponent } from './BaseComponent';

export class TextComponent extends BaseComponent {
  public inputEl: HTMLInputElement;
  private changeCallback?: (value: string) => void;
  private enterCallback?: () => void;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementInitialized();
  }

  private ensureElementInitialized(): void {
    if (!this.inputEl && this.componentEl && this.componentEl.tagName === 'INPUT') {
      this.inputEl = this.componentEl as HTMLInputElement;
    }
  }

  protected createElement(): HTMLElement {
    this.inputEl = this.createBaseInput('text');
    this.setupEvents();
    return this.inputEl;
  }

  private setupEvents(): void {
    this.inputEl.addEventListener('input', (e) => {
      if (this.changeCallback) {
        this.changeCallback((e.target as HTMLInputElement).value);
      }
    });

    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.enterCallback) {
        e.preventDefault();
        this.enterCallback();
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
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.maxLength = maxLength;
    }
    return this;
  }

  setMinLength(minLength: number): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.minLength = minLength;
    }
    return this;
  }

  setRequired(required: boolean): this {
    if (!this.inputEl) this.ensureElementInitialized();
    if (this.inputEl) {
      this.inputEl.required = required;
    }
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.changeCallback = callback;
    return this;
  }

  onEnter(callback: () => void): this {
    this.enterCallback = callback;
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
}