export abstract class BaseComponent {
  protected containerEl: HTMLElement;
  protected componentEl: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
    this.componentEl = this.createElement();
    this.containerEl.appendChild(this.componentEl);
    this.setupStyles();
  }

  protected abstract createElement(): HTMLElement;
  
  protected setupStyles(): void {
    if (this.componentEl) {
      this.componentEl.style.backgroundColor = 'var(--theme-input)';
      this.componentEl.style.borderColor = 'var(--theme-border)';
      this.componentEl.style.color = 'var(--theme-foreground)';
    }
  }

  protected createBaseInput(type: string = 'text'): HTMLInputElement {
    const input = document.createElement('input');
    input.type = type;
    input.className = 'w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
    return input;
  }

  protected createBaseSelect(): HTMLSelectElement {
    const select = document.createElement('select');
    select.className = 'w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
    return select;
  }

  protected createBaseTextArea(): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.className = 'w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical transition-colors';
    return textarea;
  }

  protected createBaseButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'px-4 py-2 rounded font-medium transition-colors hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500';
    return button;
  }
}