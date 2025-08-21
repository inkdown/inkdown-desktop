import { BaseComponent } from './BaseComponent';

export class ToggleComponent extends BaseComponent {
  public toggleEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private changeCallback?: (value: boolean) => void;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementsInitialized();
  }

  private ensureElementsInitialized(): void {
    if (!this.toggleEl && this.componentEl && this.componentEl.tagName === 'LABEL') {
      this.toggleEl = this.componentEl;
      const input = this.toggleEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
      if (input) {
        this.inputEl = input;
      }
    }
  }

  protected createElement(): HTMLElement {
    this.toggleEl = document.createElement('label');
    this.toggleEl.className = 'relative inline-flex items-center cursor-pointer';
    
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'checkbox';
    this.inputEl.className = 'sr-only';
    
    const sliderEl = document.createElement('div');
    sliderEl.className = 'w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[\'\'] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600';
    sliderEl.style.backgroundColor = 'var(--theme-muted)';
    
    this.setupEvents();
    this.setupStyles(sliderEl);
    
    this.toggleEl.appendChild(this.inputEl);
    this.toggleEl.appendChild(sliderEl);
    
    return this.toggleEl;
  }

  private setupEvents(): void {
    this.inputEl.addEventListener('change', (e) => {
      if (this.changeCallback) {
        this.changeCallback((e.target as HTMLInputElement).checked);
      }
    });
  }

  protected setupStyles(sliderEl: HTMLElement): void {
    // Override base styles for toggle-specific styling
    const style = document.createElement('style');
    style.textContent = `
      .toggle-component input:checked + div {
        background-color: var(--theme-primary) !important;
      }
      
      .toggle-component input:focus + div {
        box-shadow: 0 0 0 2px var(--theme-ring);
      }
      
      .toggle-component div::after {
        background-color: white;
        border: 2px solid var(--theme-border);
        transition: all 0.2s ease-in-out;
      }
      
      .toggle-component input:checked + div::after {
        transform: translateX(100%);
        border-color: white;
      }
    `;
    
    if (!document.head.querySelector('#toggle-styles')) {
      style.id = 'toggle-styles';
      document.head.appendChild(style);
    }
    
    this.toggleEl.classList.add('toggle-component');
  }

  setValue(value: boolean): this {
    if (!this.inputEl) this.ensureElementsInitialized();
    if (this.inputEl) {
      this.inputEl.checked = value;
    }
    return this;
  }

  getValue(): boolean {
    if (!this.inputEl) this.ensureElementsInitialized();
    return this.inputEl ? this.inputEl.checked : false;
  }

  setDisabled(disabled: boolean): this {
    if (!this.inputEl) this.ensureElementsInitialized();
    if (!this.toggleEl) this.ensureElementsInitialized();
    
    if (this.inputEl) {
      this.inputEl.disabled = disabled;
    }
    if (this.toggleEl) {
      if (disabled) {
        this.toggleEl.classList.add('opacity-50', 'cursor-not-allowed');
        this.toggleEl.style.pointerEvents = 'none';
      } else {
        this.toggleEl.classList.remove('opacity-50', 'cursor-not-allowed');
        this.toggleEl.style.pointerEvents = 'auto';
      }
    }
    return this;
  }

  setTooltip(tooltip: string): this {
    if (!this.toggleEl) this.ensureElementsInitialized();
    if (this.toggleEl) {
      this.toggleEl.title = tooltip;
    }
    return this;
  }

  onChange(callback: (value: boolean) => void): this {
    this.changeCallback = callback;
    return this;
  }

  toggle(): this {
    this.inputEl.checked = !this.inputEl.checked;
    if (this.changeCallback) {
      this.changeCallback(this.inputEl.checked);
    }
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
}