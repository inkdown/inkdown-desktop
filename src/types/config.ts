export interface Theme {
  name: string;
  url: string;
  author: string;
  enable: boolean;
}

export interface AppearanceConfig {
  themes: Theme[];
  'font-size': number;
  'font-family': string;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  sidebar: {
    background: string;
    foreground: string;
    border: string;
    hover: string;
    active: string;
  };
  editor: {
    background: string;
    foreground: string;
    selection: string;
    cursor: string;
    border: string;
    lineNumber: string;
    activeLine: string;
    scrollbar: string;
  };
  headings: {
    h1: string;
    h2: string;
    h3: string;
    h4: string;
    h5: string;
    h6: string;
  };
}

export interface CustomTheme {
  id: string;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
}

export interface WorkspaceConfig {
  workspace_path: string | null;
  vimMode?: boolean;
  showLineNumbers?: boolean;
  highlightCurrentLine?: boolean;
  markdown?: boolean;
  theme?: ThemeMode;
  customTheme?: string;
  fontSize?: number;
  fontFamily?: string;
  readOnly?: boolean;
}