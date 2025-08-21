import { BaseComponent } from './BaseComponent';

export class SliderComponent extends BaseComponent {
  public sliderEl: HTMLInputElement;
  private valueDisplayEl?: HTMLElement;
  private changeCallback?: (value: number) => void;
  private isDynamicTooltip = false;
  private tooltipEl?: HTMLElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementsInitialized();
  }

  private ensureElementsInitialized(): void {
    if (!this.sliderEl && this.componentEl) {
      const sliderInput = this.componentEl.querySelector('input[type="range"]') as HTMLInputElement;
      if (sliderInput) {
        this.sliderEl = sliderInput;
      }
    }
    if (!this.valueDisplayEl && this.componentEl) {
      const valueDisplay = this.componentEl.querySelector('span') as HTMLElement;
      if (valueDisplay) {
        this.valueDisplayEl = valueDisplay;
      }
    }
  }

  protected createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex items-center gap-3 w-full';

    this.sliderEl = this.createBaseInput('range');
    this.sliderEl.className = 'flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer';
    
    this.valueDisplayEl = document.createElement('span');
    this.valueDisplayEl.className = 'text-sm font-medium w-12 text-center';
    this.valueDisplayEl.style.color = 'var(--theme-foreground)';

    this.setupEvents();
    this.setupSliderStyles();

    container.appendChild(this.sliderEl);
    container.appendChild(this.valueDisplayEl);

    return container;
  }

  private setupEvents(): void {
    this.sliderEl.addEventListener('input', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      this.updateValueDisplay(value);
      this.updateTooltip(value);
      
      if (this.changeCallback) {
        this.changeCallback(value);
      }
    });

    this.sliderEl.addEventListener('change', (e) => {
      const value = Number((e.target as HTMLInputElement).value);
      if (this.changeCallback) {
        this.changeCallback(value);
      }
    });
  }

  private setupSliderStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .slider-component input[type="range"] {
        background: var(--theme-muted);
        border-radius: 8px;
        height: 8px;
        outline: none;
        transition: background 0.2s;
      }
      
      .slider-component input[type="range"]:hover {
        background: var(--theme-muted-foreground);
      }
      
      .slider-component input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--theme-primary);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.2s;
      }
      
      .slider-component input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      }
      
      .slider-component input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: var(--theme-primary);
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .slider-component input[type="range"]:focus::-webkit-slider-thumb {
        box-shadow: 0 0 0 3px var(--theme-ring);
      }
      
      .slider-component input[type="range"]:focus::-moz-range-thumb {
        box-shadow: 0 0 0 3px var(--theme-ring);
      }
    `;
    
    if (!document.head.querySelector('#slider-styles')) {
      style.id = 'slider-styles';
      document.head.appendChild(style);
    }
    
    if (this.componentEl) {
      this.componentEl.classList.add('slider-component');
    }
  }

  private updateValueDisplay(value: number): void {
    if (this.valueDisplayEl) {
      this.valueDisplayEl.textContent = value.toString();
    }
  }

  private updateTooltip(value: number): void {
    if (this.isDynamicTooltip && this.tooltipEl) {
      this.tooltipEl.textContent = value.toString();
    }
  }

  setLimits(min: number, max: number, step: number = 1): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.min = min.toString();
      this.sliderEl.max = max.toString();
      this.sliderEl.step = step.toString();
    }
    return this;
  }

  setMin(min: number): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.min = min.toString();
    }
    return this;
  }

  setMax(max: number): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.max = max.toString();
    }
    return this;
  }

  setStep(step: number): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.step = step.toString();
    }
    return this;
  }

  setValue(value: number): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.value = value.toString();
      this.updateValueDisplay(value);
      this.updateTooltip(value);
    }
    return this;
  }

  getValue(): number {
    if (!this.sliderEl) this.ensureElementsInitialized();
    return this.sliderEl ? Number(this.sliderEl.value) : 0;
  }

  setDisabled(disabled: boolean): this {
    if (!this.sliderEl) this.ensureElementsInitialized();
    if (this.sliderEl) {
      this.sliderEl.disabled = disabled;
    }
    if (this.componentEl) {
      if (disabled) {
        this.componentEl.classList.add('opacity-50', 'cursor-not-allowed');
      } else {
        this.componentEl.classList.remove('opacity-50', 'cursor-not-allowed');
      }
    }
    return this;
  }

  setDynamicTooltip(): this {
    this.isDynamicTooltip = true;
    
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'absolute bg-gray-800 text-white px-2 py-1 rounded text-xs pointer-events-none opacity-0 transition-opacity';
    this.tooltipEl.style.bottom = '100%';
    this.tooltipEl.style.left = '50%';
    this.tooltipEl.style.transform = 'translateX(-50%) translateY(-8px)';
    this.tooltipEl.style.zIndex = '1000';
    
    const sliderContainer = this.sliderEl.parentElement;
    if (sliderContainer) {
      sliderContainer.style.position = 'relative';
      sliderContainer.appendChild(this.tooltipEl);
    }
    
    this.sliderEl.addEventListener('mouseenter', () => {
      if (this.tooltipEl) {
        this.tooltipEl.style.opacity = '1';
        this.updateTooltip(this.getValue());
      }
    });
    
    this.sliderEl.addEventListener('mouseleave', () => {
      if (this.tooltipEl) {
        this.tooltipEl.style.opacity = '0';
      }
    });
    
    return this;
  }

  hideValueDisplay(): this {
    if (this.valueDisplayEl) {
      this.valueDisplayEl.style.display = 'none';
    }
    return this;
  }

  showValueDisplay(): this {
    if (this.valueDisplayEl) {
      this.valueDisplayEl.style.display = 'block';
    }
    return this;
  }

  setValueFormatter(formatter: (value: number) => string): this {
    const originalUpdateDisplay = this.updateValueDisplay.bind(this);
    this.updateValueDisplay = (value: number) => {
      if (this.valueDisplayEl) {
        this.valueDisplayEl.textContent = formatter(value);
      }
    };
    return this;
  }

  onChange(callback: (value: number) => void): this {
    this.changeCallback = callback;
    return this;
  }

  focus(): this {
    this.sliderEl.focus();
    return this;
  }

  blur(): this {
    this.sliderEl.blur();
    return this;
  }

  getMin(): number {
    return Number(this.sliderEl.min);
  }

  getMax(): number {
    return Number(this.sliderEl.max);
  }

  getStep(): number {
    return Number(this.sliderEl.step);
  }

  increment(): this {
    const currentValue = this.getValue();
    const step = this.getStep();
    const max = this.getMax();
    const newValue = Math.min(currentValue + step, max);
    this.setValue(newValue);
    if (this.changeCallback) {
      this.changeCallback(newValue);
    }
    return this;
  }

  decrement(): this {
    const currentValue = this.getValue();
    const step = this.getStep();
    const min = this.getMin();
    const newValue = Math.max(currentValue - step, min);
    this.setValue(newValue);
    if (this.changeCallback) {
      this.changeCallback(newValue);
    }
    return this;
  }
}