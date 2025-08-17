import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface ActiveFile {
  path: string;
  name: string;
  content: string;
}

interface EditingContextType {
  editingPath: string | null;
  activeFile: ActiveFile | null;
  isModified: boolean;
  setEditingPath: (path: string | null) => void;
  setActiveFile: (path: string, content: string) => void;
  updateContent: (content: string) => void;
  setModified: (modified: boolean) => void;
  isEditing: (path: string) => boolean;
  getActiveFile: () => ActiveFile | null;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

interface EditingProviderProps {
  children: ReactNode;
}

export function EditingProvider({ children }: EditingProviderProps) {
  const [editingPath, setEditingPathState] = useState<string | null>(null);
  const [activeFile, setActiveFileState] = useState<ActiveFile | null>(null);
  const [isModified, setIsModified] = useState(false);

  const setEditingPath = useCallback((path: string | null) => {
    setEditingPathState(path);
    if (typeof window !== 'undefined') {
      (window as any).__editingContext = { editingPath: path };
    }
  }, []);

  const setActiveFile = useCallback((path: string, content: string) => {
    const fileName = path.split('/').pop() || 'unknown';
    setActiveFileState({
      path,
      name: fileName,
      content
    });
    setEditingPath(path);
    setIsModified(false);
  }, []);

  const updateContent = useCallback((content: string) => {
    if (activeFile) {
      setActiveFileState(prev => prev ? { ...prev, content } : null);
    }
  }, [activeFile]);

  const setModified = useCallback((modified: boolean) => {
    setIsModified(modified);
  }, []);

  const isEditing = useCallback((path: string) => editingPath === path, [editingPath]);

  const getActiveFile = useCallback(() => activeFile, [activeFile]);

  return (
    <EditingContext.Provider value={{
      editingPath,
      activeFile,
      isModified,
      setEditingPath,
      setActiveFile,
      updateContent,
      setModified,
      isEditing,
      getActiveFile
    }}>
      {children}
    </EditingContext.Provider>
  );
}

export function useEditing() {
  const context = useContext(EditingContext);
  if (context === undefined) {
    throw new Error('useEditing deve ser usado dentro de um EditingProvider');
  }
  return context;
}