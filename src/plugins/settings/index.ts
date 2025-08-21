export { Setting } from './Setting';

export { BaseComponent } from './components/BaseComponent';
export { TextComponent } from './components/TextComponent';
export { TextAreaComponent } from './components/TextAreaComponent';
export { ToggleComponent } from './components/ToggleComponent';
export { DropdownComponent } from './components/DropdownComponent';
export { SliderComponent } from './components/SliderComponent';
export { ButtonComponent } from './components/ButtonComponent';
export { ColorComponent } from './components/ColorComponent';

export interface SettingOptions {
  name?: string;
  description?: string;
  className?: string;
  tooltip?: string;
}
