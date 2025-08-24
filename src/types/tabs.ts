export interface CursorPosition {
  line: number;
  column: number;
}

export interface ScrollPosition {
  top: number;
  left: number;
}

export interface TabData {
  id: string;
  title: string;
  file_path: string | null;
  content: string | null;
  is_dirty: boolean;
  is_active: boolean;
  created_at: number;
  last_accessed: number;
  cursor_position: CursorPosition | null;
  scroll_position: ScrollPosition | null;
}

export interface TabSession {
  workspace_path: string;
  tabs: TabData[];
  active_tab_id: string | null;
  created_at: number;
  last_updated: number;
}

export interface CreateTabOptions {
  file_path?: string;
  content?: string;
  title?: string;
}

export interface TabContextMenu {
  x: number;
  y: number;
  tabId: string;
}

export type TabChangeHandler = (tabId: string) => void;
export type TabCloseHandler = (tabId: string) => void;
export type TabCreateHandler = (options?: CreateTabOptions) => Promise<void>;