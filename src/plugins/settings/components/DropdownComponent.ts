import { BaseComponent } from './BaseComponent';

export class DropdownComponent extends BaseComponent {
  public selectEl: HTMLSelectElement;
  private changeCallback?: (value: string) => void;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    // Ensure selectEl is available immediately after construction
    if (!this.selectEl && this.componentEl && this.componentEl.tagName === 'SELECT') {
      this.selectEl = this.componentEl as HTMLSelectElement;
    }
  }

  protected createElement(): HTMLElement {
    this.selectEl = this.createBaseSelect();
    this.setupEvents();
    return this.selectEl;
  }

  private setupEvents(): void {
    this.selectEl.addEventListener('change', (e) => {
      if (this.changeCallback) {
        this.changeCallback((e.target as HTMLSelectElement).value);
      }
    });
  }

  addOption(value: string, text: string): this {
    if (!this.selectEl) {
      // Try to recover by finding the select element
      if (this.componentEl && this.componentEl.tagName === 'SELECT') {
        this.selectEl = this.componentEl as HTMLSelectElement;
      } else {
        return this;
      }
    }
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    this.selectEl.appendChild(option);
    return this;
  }

  addOptions(options: Record<string, string>): this {
    Object.entries(options).forEach(([value, text]) => {
      this.addOption(value, text);
    });
    return this;
  }

  addOptionGroup(label: string, options: Record<string, string>): this {
    const optgroup = document.createElement('optgroup');
    optgroup.label = label;
    
    Object.entries(options).forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      optgroup.appendChild(option);
    });
    
    this.selectEl.appendChild(optgroup);
    return this;
  }

  setValue(value: string): this {
    if (!this.selectEl) {
      if (this.componentEl && this.componentEl.tagName === 'SELECT') {
        this.selectEl = this.componentEl as HTMLSelectElement;
      } else {
        return this;
      }
    }
    this.selectEl.value = value;
    return this;
  }

  getValue(): string {
    if (!this.selectEl) {
      if (this.componentEl && this.componentEl.tagName === 'SELECT') {
        this.selectEl = this.componentEl as HTMLSelectElement;
      } else {
        return '';
      }
    }
    return this.selectEl.value;
  }

  getSelectedOption(): HTMLOptionElement | null {
    const selectedIndex = this.selectEl.selectedIndex;
    return selectedIndex >= 0 ? this.selectEl.options[selectedIndex] : null;
  }

  getSelectedText(): string {
    const option = this.getSelectedOption();
    return option ? option.textContent || '' : '';
  }

  setDisabled(disabled: boolean): this {
    this.selectEl.disabled = disabled;
    if (disabled) {
      this.selectEl.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
      this.selectEl.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    return this;
  }

  setRequired(required: boolean): this {
    this.selectEl.required = required;
    return this;
  }

  setMultiple(multiple: boolean): this {
    this.selectEl.multiple = multiple;
    if (multiple) {
      this.selectEl.size = Math.min(this.selectEl.options.length, 4);
    }
    return this;
  }

  setSize(size: number): this {
    this.selectEl.size = size;
    return this;
  }

  clearOptions(): this {
    this.selectEl.innerHTML = '';
    return this;
  }

  removeOption(value: string): this {
    const option = this.selectEl.querySelector(`option[value="${value}"]`);
    if (option) {
      option.remove();
    }
    return this;
  }

  getValues(): string[] {
    if (this.selectEl.multiple) {
      return Array.from(this.selectEl.selectedOptions).map(option => option.value);
    }
    return [this.selectEl.value];
  }

  setValues(values: string[]): this {
    if (this.selectEl.multiple) {
      Array.from(this.selectEl.options).forEach(option => {
        option.selected = values.includes(option.value);
      });
    } else if (values.length > 0) {
      this.selectEl.value = values[0];
    }
    return this;
  }

  onChange(callback: (value: string) => void): this {
    this.changeCallback = callback;
    return this;
  }

  onMultipleChange(callback: (values: string[]) => void): this {
    this.selectEl.addEventListener('change', () => {
      if (this.selectEl.multiple) {
        callback(this.getValues());
      }
    });
    return this;
  }

  focus(): this {
    this.selectEl.focus();
    return this;
  }

  blur(): this {
    this.selectEl.blur();
    return this;
  }

  getOptionCount(): number {
    return this.selectEl.options.length;
  }

  selectIndex(index: number): this {
    if (index >= 0 && index < this.selectEl.options.length) {
      this.selectEl.selectedIndex = index;
      if (this.changeCallback) {
        this.changeCallback(this.selectEl.value);
      }
    }
    return this;
  }

  selectFirst(): this {
    return this.selectIndex(0);
  }

  selectLast(): this {
    return this.selectIndex(this.selectEl.options.length - 1);
  }
}