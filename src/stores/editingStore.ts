import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface ActiveFile {
  path: string;
  name: string;
  content: string;
}

export interface EditingState {
  editingPath: string | null;
  activeFile: ActiveFile | null;
  isModified: boolean;
  
  // Performance tracking
  lastContentUpdate: number;
}

export interface EditingActions {
  // Editing state
  setEditingPath: (path: string | null) => void;
  setActiveFile: (path: string, content: string) => void;
  updateContent: (content: string) => void;
  setModified: (modified: boolean) => void;
  
  // Utilities
  isEditing: (path: string) => boolean;
  getActiveFile: () => ActiveFile | null;
  
  // Cleanup
  clearActiveFile: () => void;
  resetEditingState: () => void;
}

export type EditingStore = EditingState & EditingActions;

export const useEditingStore = create<EditingStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    editingPath: null,
    activeFile: null,
    isModified: false,
    lastContentUpdate: 0,

    // Set editing path (for rename mode)
    setEditingPath: (path) => {
      set({ editingPath: path });
      
      // Update global context for plugins
      if (typeof window !== 'undefined') {
        (window as any).__editingContext = { editingPath: path };
        
        // Clear active file if no path
        if (!path) {
          (window as any).__activeFile = null;
          set({ activeFile: null });
        }
      }
    },

    // Set active file (for editing)
    setActiveFile: (path, content) => {
      const fileName = path.split('/').pop() || 'unknown';
      const fileObj: ActiveFile = {
        path,
        name: fileName,
        content
      };
      
      set({ 
        activeFile: fileObj, 
        isModified: false,
        lastContentUpdate: Date.now()
      });
      
      // Update global for plugins
      if (typeof window !== 'undefined') {
        (window as any).__activeFile = fileObj;
      }
    },

    // Update content
    updateContent: (content) => {
      const { activeFile } = get();
      if (!activeFile) return;

      const updatedFile = { ...activeFile, content };
      set({ 
        activeFile: updatedFile,
        lastContentUpdate: Date.now()
      });
      
      // Update global for plugins
      if (typeof window !== 'undefined') {
        (window as any).__activeFile = updatedFile;
      }
    },

    // Set modified state
    setModified: (modified) => set({ isModified: modified }),

    // Check if editing a specific path
    isEditing: (path) => {
      const { editingPath } = get();
      return editingPath === path;
    },

    // Get active file
    getActiveFile: () => {
      const { activeFile } = get();
      return activeFile;
    },

    // Clear active file
    clearActiveFile: () => {
      set({ activeFile: null, isModified: false });
      
      if (typeof window !== 'undefined') {
        (window as any).__activeFile = null;
      }
    },

    // Reset entire editing state
    resetEditingState: () => {
      set({
        editingPath: null,
        activeFile: null,
        isModified: false,
        lastContentUpdate: 0
      });
      
      if (typeof window !== 'undefined') {
        (window as any).__editingContext = { editingPath: null };
        (window as any).__activeFile = null;
      }
    },
  }))
);

// Optimized selectors
export const useEditingPath = () => useEditingStore((state) => state.editingPath);
export const useActiveFile = () => useEditingStore((state) => state.activeFile);
export const useIsModified = () => useEditingStore((state) => state.isModified);
export const useActiveFileContent = () => useEditingStore((state) => state.activeFile?.content || '');
export const useActiveFilePath = () => useEditingStore((state) => state.activeFile?.path || null);
export const useLastContentUpdate = () => useEditingStore((state) => state.lastContentUpdate);