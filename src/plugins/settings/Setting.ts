import { TextComponent } from './components/TextComponent';
import { TextAreaComponent } from './components/TextAreaComponent';
import { ToggleComponent } from './components/ToggleComponent';
import { DropdownComponent } from './components/DropdownComponent';
import { SliderComponent } from './components/SliderComponent';
import { ButtonComponent } from './components/ButtonComponent';
import { ColorComponent } from './components/ColorComponent';

export class Setting {
  public settingEl: HTMLElement;
  private nameEl?: HTMLElement;
  private descEl?: HTMLElement;
  private controlEl?: HTMLElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement('div');
    this.settingEl.className = 'setting-item flex items-center justify-between gap-4 py-3';
    containerEl.appendChild(this.settingEl);
    
    this.createStructure();
  }

  private createStructure(): void {
    const infoEl = document.createElement('div');
    infoEl.className = 'setting-info flex-1';
    
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'setting-name text-sm font-medium';
    this.nameEl.style.color = 'var(--theme-foreground)';
    
    this.descEl = document.createElement('div');
    this.descEl.className = 'setting-description text-xs mt-1';
    this.descEl.style.color = 'var(--theme-muted-foreground)';
    this.descEl.style.display = 'none';
    
    this.controlEl = document.createElement('div');
    this.controlEl.className = 'setting-control flex-shrink-0 min-w-48';
    
    infoEl.appendChild(this.nameEl);
    infoEl.appendChild(this.descEl);
    
    this.settingEl.appendChild(infoEl);
    this.settingEl.appendChild(this.controlEl);
  }

  setName(name: string): this {
    if (this.nameEl) {
      this.nameEl.textContent = name;
    }
    return this;
  }

  setDesc(desc: string): this {
    if (this.descEl) {
      this.descEl.textContent = desc;
      this.descEl.style.display = desc ? 'block' : 'none';
    }
    return this;
  }

  setClass(cls: string): this {
    this.settingEl.classList.add(cls);
    return this;
  }

  setTooltip(tooltip: string): this {
    this.settingEl.title = tooltip;
    return this;
  }

  addText(cb: (text: TextComponent) => void): this {
    if (!this.controlEl) return this;
    const textComponent = new TextComponent(this.controlEl);
    cb(textComponent);
    return this;
  }

  addTextArea(cb: (textArea: TextAreaComponent) => void): this {
    if (!this.controlEl) return this;
    const textAreaComponent = new TextAreaComponent(this.controlEl);
    cb(textAreaComponent);
    return this;
  }

  addToggle(cb: (toggle: ToggleComponent) => void): this {
    if (!this.controlEl) return this;
    const toggleComponent = new ToggleComponent(this.controlEl);
    cb(toggleComponent);
    return this;
  }

  addDropdown(cb: (dropdown: DropdownComponent) => void): this {
    if (!this.controlEl) return this;
    const dropdownComponent = new DropdownComponent(this.controlEl);
    cb(dropdownComponent);
    return this;
  }

  addSlider(cb: (slider: SliderComponent) => void): this {
    if (!this.controlEl) return this;
    const sliderComponent = new SliderComponent(this.controlEl);
    cb(sliderComponent);
    return this;
  }

  addButton(cb: (button: ButtonComponent) => void): this {
    if (!this.controlEl) return this;
    const buttonComponent = new ButtonComponent(this.controlEl);
    cb(buttonComponent);
    return this;
  }

  addColorPicker(cb: (colorPicker: ColorComponent) => void): this {
    if (!this.controlEl) return this;
    const colorComponent = new ColorComponent(this.controlEl);
    cb(colorComponent);
    return this;
  }
}