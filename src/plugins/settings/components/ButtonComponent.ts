import { BaseComponent } from './BaseComponent';

export class ButtonComponent extends BaseComponent {
  public buttonEl: HTMLButtonElement;
  private clickCallback?: () => void;
  private iconEl?: HTMLElement;
  private textEl?: HTMLElement;

  constructor(containerEl: HTMLElement) {
    super(containerEl);
    this.ensureElementsInitialized();
  }

  private ensureElementsInitialized(): void {
    if (!this.buttonEl && this.componentEl && this.componentEl.tagName === 'BUTTON') {
      this.buttonEl = this.componentEl as HTMLButtonElement;
      this.textEl = this.buttonEl.querySelector('span') as HTMLElement;
    }
  }

  protected createElement(): HTMLElement {
    this.buttonEl = this.createBaseButton();
    this.setupStructure();
    this.setupEvents();
    return this.buttonEl;
  }

  private setupStructure(): void {
    this.buttonEl.className = 'inline-flex items-center gap-2 px-4 py-2 rounded font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    this.textEl = document.createElement('span');
    this.buttonEl.appendChild(this.textEl);
  }

  private setupEvents(): void {
    this.buttonEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (!this.buttonEl.disabled && this.clickCallback) {
        this.clickCallback();
      }
    });
  }

  protected setupStyles(): void {
    this.setVariant('primary');
  }

  setButtonText(text: string): this {
    if (!this.textEl) this.ensureElementsInitialized();
    if (this.textEl) {
      this.textEl.textContent = text;
    }
    return this;
  }

  getButtonText(): string {
    if (!this.textEl) this.ensureElementsInitialized();
    return this.textEl?.textContent || '';
  }

  setTooltip(tooltip: string): this {
    if (!this.buttonEl) this.ensureElementsInitialized();
    if (this.buttonEl) {
      this.buttonEl.title = tooltip;
    }
    return this;
  }

  setClass(cls: string): this {
    if (!this.buttonEl) this.ensureElementsInitialized();
    if (this.buttonEl) {
      this.buttonEl.classList.add(cls);
    }
    return this;
  }

  removeClass(cls: string): this {
    this.buttonEl.classList.remove(cls);
    return this;
  }

  setIcon(iconHtml: string): this {
    if (this.iconEl) {
      this.iconEl.remove();
    }
    
    this.iconEl = document.createElement('span');
    this.iconEl.innerHTML = iconHtml;
    this.iconEl.className = 'w-4 h-4 flex-shrink-0';
    
    this.buttonEl.insertBefore(this.iconEl, this.textEl);
    return this;
  }

  removeIcon(): this {
    if (this.iconEl) {
      this.iconEl.remove();
      this.iconEl = undefined;
    }
    return this;
  }

  setVariant(variant: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'): this {
    // Remove existing variant classes
    this.buttonEl.classList.remove(
      'btn-primary', 'btn-secondary', 'btn-destructive', 'btn-outline', 'btn-ghost'
    );
    
    this.buttonEl.classList.add(`btn-${variant}`);
    
    // Apply variant-specific styles
    switch (variant) {
      case 'primary':
        this.buttonEl.style.backgroundColor = 'var(--theme-primary)';
        this.buttonEl.style.color = 'var(--theme-primary-foreground)';
        this.buttonEl.style.borderColor = 'var(--theme-primary)';
        break;
      case 'secondary':
        this.buttonEl.style.backgroundColor = 'var(--theme-secondary)';
        this.buttonEl.style.color = 'var(--theme-secondary-foreground)';
        this.buttonEl.style.borderColor = 'var(--theme-secondary)';
        break;
      case 'destructive':
        this.buttonEl.style.backgroundColor = 'var(--theme-destructive)';
        this.buttonEl.style.color = 'var(--theme-destructive-foreground)';
        this.buttonEl.style.borderColor = 'var(--theme-destructive)';
        break;
      case 'outline':
        this.buttonEl.style.backgroundColor = 'transparent';
        this.buttonEl.style.color = 'var(--theme-foreground)';
        this.buttonEl.style.borderColor = 'var(--theme-border)';
        this.buttonEl.style.border = '1px solid';
        break;
      case 'ghost':
        this.buttonEl.style.backgroundColor = 'transparent';
        this.buttonEl.style.color = 'var(--theme-foreground)';
        this.buttonEl.style.border = 'none';
        break;
    }
    
    return this;
  }

  setSize(size: 'sm' | 'md' | 'lg'): this {
    this.buttonEl.classList.remove('btn-sm', 'btn-md', 'btn-lg');
    this.buttonEl.classList.add(`btn-${size}`);
    
    switch (size) {
      case 'sm':
        this.buttonEl.style.padding = '0.25rem 0.5rem';
        this.buttonEl.style.fontSize = '0.75rem';
        break;
      case 'md':
        this.buttonEl.style.padding = '0.5rem 1rem';
        this.buttonEl.style.fontSize = '0.875rem';
        break;
      case 'lg':
        this.buttonEl.style.padding = '0.75rem 1.5rem';
        this.buttonEl.style.fontSize = '1rem';
        break;
    }
    
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.buttonEl.disabled = disabled;
    if (disabled) {
      this.buttonEl.classList.add('opacity-50', 'cursor-not-allowed');
      this.buttonEl.style.pointerEvents = 'none';
    } else {
      this.buttonEl.classList.remove('opacity-50', 'cursor-not-allowed');
      this.buttonEl.style.pointerEvents = 'auto';
    }
    return this;
  }

  setLoading(loading: boolean, loadingText?: string): this {
    if (loading) {
      this.buttonEl.disabled = true;
      this.buttonEl.classList.add('opacity-75');
      
      // Add loading spinner
      const spinner = document.createElement('div');
      spinner.className = 'animate-spin rounded-full h-4 w-4 border-b-2 border-current';
      spinner.setAttribute('data-loading-spinner', 'true');
      
      this.buttonEl.insertBefore(spinner, this.buttonEl.firstChild);
      
      if (loadingText && this.textEl) {
        this.textEl.setAttribute('data-original-text', this.textEl.textContent || '');
        this.textEl.textContent = loadingText;
      }
    } else {
      this.buttonEl.disabled = false;
      this.buttonEl.classList.remove('opacity-75');
      
      const spinner = this.buttonEl.querySelector('[data-loading-spinner]');
      if (spinner) {
        spinner.remove();
      }
      
      if (this.textEl) {
        const originalText = this.textEl.getAttribute('data-original-text');
        if (originalText) {
          this.textEl.textContent = originalText;
          this.textEl.removeAttribute('data-original-text');
        }
      }
    }
    return this;
  }

  setFullWidth(fullWidth: boolean): this {
    if (fullWidth) {
      this.buttonEl.classList.add('w-full');
    } else {
      this.buttonEl.classList.remove('w-full');
    }
    return this;
  }

  onClick(callback: () => void): this {
    this.clickCallback = callback;
    return this;
  }

  focus(): this {
    this.buttonEl.focus();
    return this;
  }

  blur(): this {
    this.buttonEl.blur();
    return this;
  }

  click(): this {
    this.buttonEl.click();
    return this;
  }

  setTabIndex(tabIndex: number): this {
    this.buttonEl.tabIndex = tabIndex;
    return this;
  }

  setAriaLabel(label: string): this {
    this.buttonEl.setAttribute('aria-label', label);
    return this;
  }

  setAriaExpanded(expanded: boolean): this {
    this.buttonEl.setAttribute('aria-expanded', expanded.toString());
    return this;
  }

  setAriaPressed(pressed: boolean): this {
    this.buttonEl.setAttribute('aria-pressed', pressed.toString());
    return this;
  }

  onMouseEnter(callback: () => void): this {
    this.buttonEl.addEventListener('mouseenter', callback);
    return this;
  }

  onMouseLeave(callback: () => void): this {
    this.buttonEl.addEventListener('mouseleave', callback);
    return this;
  }

  onFocus(callback: () => void): this {
    this.buttonEl.addEventListener('focus', callback);
    return this;
  }

  onBlur(callback: () => void): this {
    this.buttonEl.addEventListener('blur', callback);
    return this;
  }
}