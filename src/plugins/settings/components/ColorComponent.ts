import { BaseComponent } from './BaseComponent';

export class ColorComponent extends BaseComponent {
  public colorEl: HTMLInputElement;
  private changeCallback?: (value: string) => void;
  private previewEl?: HTMLElement;
  private textInputEl?: HTMLInputElement;
  private containerEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementsInitialized();
  }

  private ensureElementsInitialized(): void {
    if (!this.colorEl && this.componentEl) {
      const colorInput = this.componentEl.querySelector('input[type="color"]') as HTMLInputElement;
      if (colorInput) {
        this.colorEl = colorInput;
      }
      this.textInputEl = this.componentEl.querySelector('input[type="text"]') as HTMLInputElement;
      this.previewEl = this.componentEl.querySelector('.color-preview') as HTMLElement;
    }
  }

  protected createElement(): HTMLElement {
    this.containerEl = document.createElement('div');
    this.containerEl.className = 'flex items-center gap-2';
    
    this.colorEl = this.createBaseInput('color');
    this.colorEl.className = 'w-12 h-10 rounded border cursor-pointer';
    this.colorEl.style.borderColor = 'var(--theme-border)';
    
    this.setupTextInput();
    this.setupPreview();
    this.setupEvents();
    
    this.containerEl.appendChild(this.colorEl);
    if (this.textInputEl) {
      this.containerEl.appendChild(this.textInputEl);
    }
    if (this.previewEl) {
      this.containerEl.appendChild(this.previewEl);
    }
    
    return this.containerEl;
  }

  private setupTextInput(): void {
    this.textInputEl = this.createBaseInput('text');
    this.textInputEl.className = 'flex-1 p-2 rounded border text-sm font-mono';
    this.textInputEl.placeholder = '#000000';
    this.textInputEl.maxLength = 7;
    this.textInputEl.style.minWidth = '100px';
  }

  private setupPreview(): void {
    this.previewEl = document.createElement('div');
    this.previewEl.className = 'w-8 h-8 rounded border flex-shrink-0';
    this.previewEl.style.borderColor = 'var(--theme-border)';
    this.previewEl.title = 'Color preview';
  }

  private setupEvents(): void {
    this.colorEl.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.updateTextInput(value);
      this.updatePreview(value);
      if (this.changeCallback) {
        this.changeCallback(value);
      }
    });

    if (this.textInputEl) {
      this.textInputEl.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (this.isValidColor(value)) {
          this.colorEl.value = value;
          this.updatePreview(value);
          if (this.changeCallback) {
            this.changeCallback(value);
          }
        }
      });

      this.textInputEl.addEventListener('blur', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (!this.isValidColor(value)) {
          this.textInputEl.value = this.colorEl.value;
        }
      });
    }
  }

  private updateTextInput(value: string): void {
    if (this.textInputEl) {
      this.textInputEl.value = value.toUpperCase();
    }
  }

  private updatePreview(value: string): void {
    if (this.previewEl) {
      this.previewEl.style.backgroundColor = value;
    }
  }

  private isValidColor(color: string): boolean {
    if (!color) return false;
    
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(hex);
    }
    
    const tempDiv = document.createElement('div');
    tempDiv.style.color = color;
    return tempDiv.style.color !== '';
  }

  private normalizeColor(color: string): string {
    if (color.startsWith('#') && color.length === 4) {
      // Convert #RGB to #RRGGBB
      const r = color[1];
      const g = color[2];
      const b = color[3];
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return color;
  }

  setValue(value: string): this {
    if (!this.colorEl) this.ensureElementsInitialized();
    if (this.colorEl) {
      const normalizedValue = this.normalizeColor(value);
      this.colorEl.value = normalizedValue;
      this.updateTextInput(normalizedValue);
      this.updatePreview(normalizedValue);
    }
    return this;
  }

  getValue(): string {
    if (!this.colorEl) this.ensureElementsInitialized();
    return this.colorEl ? this.colorEl.value : '#000000';
  }

  getHexValue(): string {
    if (!this.colorEl) this.ensureElementsInitialized();
    return this.colorEl ? this.colorEl.value : '#000000';
  }

  getRgbValue(): { r: number; g: number; b: number } {
    const hex = this.colorEl.value.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  getHslValue(): { h: number; s: number; l: number } {
    const { r, g, b } = this.getRgbValue();
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const diff = max - min;
    
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case r / 255:
          h = ((g / 255 - b / 255) / diff) + (g < b ? 6 : 0);
          break;
        case g / 255:
          h = (b / 255 - r / 255) / diff + 2;
          break;
        case b / 255:
          h = (r / 255 - g / 255) / diff + 4;
          break;
      }
      h /= 6;
    }
    
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  }

  setFromRgb(r: number, g: number, b: number): this {
    const hex = '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    this.setValue(hex);
    return this;
  }

  setFromHsl(h: number, s: number, l: number): this {
    h = h / 360;
    s = s / 100;
    l = l / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h * 12) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    
    this.setFromRgb(r, g, b);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.colorEl.disabled = disabled;
    if (this.textInputEl) {
      this.textInputEl.disabled = disabled;
    }
    
    if (disabled) {
      this.containerEl.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      this.containerEl.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    return this;
  }

  setPlaceholder(placeholder: string): this {
    if (this.textInputEl) {
      this.textInputEl.placeholder = placeholder;
    }
    return this;
  }

  hideTextInput(): this {
    if (this.textInputEl) {
      this.textInputEl.style.display = 'none';
    }
    return this;
  }

  showTextInput(): this {
    if (this.textInputEl) {
      this.textInputEl.style.display = 'block';
    }
    return this;
  }

  hidePreview(): this {
    if (this.previewEl) {
      this.previewEl.style.display = 'none';
    }
    return this;
  }

  showPreview(): this {
    if (this.previewEl) {
      this.previewEl.style.display = 'block';
    }
    return this;
  }

  setPreviewSize(size: 'sm' | 'md' | 'lg'): this {
    if (this.previewEl) {
      this.previewEl.classList.remove('w-6', 'h-6', 'w-8', 'h-8', 'w-10', 'h-10');
      switch (size) {
        case 'sm':
          this.previewEl.classList.add('w-6', 'h-6');
          break;
        case 'md':
          this.previewEl.classList.add('w-8', 'h-8');
          break;
        case 'lg':
          this.previewEl.classList.add('w-10', 'h-10');
          break;
      }
    }
    return this;
  }

  addColorPresets(colors: string[]): this {
    const presetsContainer = document.createElement('div');
    presetsContainer.className = 'flex gap-1 mt-2';
    
    colors.forEach(color => {
      const presetEl = document.createElement('button');
      presetEl.className = 'w-6 h-6 rounded border cursor-pointer hover:scale-110 transition-transform';
      presetEl.style.backgroundColor = color;
      presetEl.style.borderColor = 'var(--theme-border)';
      presetEl.title = color;
      
      presetEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.setValue(color);
        if (this.changeCallback) {
          this.changeCallback(color);
        }
      });
      
      presetsContainer.appendChild(presetEl);
    });
    
    this.containerEl.appendChild(presetsContainer);
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.changeCallback = callback;
    return this;
  }

  focus(): this {
    this.colorEl.focus();
    return this;
  }

  blur(): this {
    this.colorEl.blur();
    return this;
  }

  openColorPicker(): this {
    this.colorEl.click();
    return this;
  }
}