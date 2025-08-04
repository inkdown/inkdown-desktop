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

export interface WorkspaceConfig {
  workspace_path: string | null;
}