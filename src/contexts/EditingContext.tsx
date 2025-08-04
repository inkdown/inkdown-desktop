import { createContext, useContext, useState, ReactNode } from 'react';

interface EditingContextType {
  editingPath: string | null;
  setEditingPath: (path: string | null) => void;
  isEditing: (path: string) => boolean;
}

const EditingContext = createContext<EditingContextType | undefined>(undefined);

interface EditingProviderProps {
  children: ReactNode;
}

export function EditingProvider({ children }: EditingProviderProps) {
  const [editingPath, setEditingPath] = useState<string | null>(null);

  const isEditing = (path: string) => editingPath === path;

  return (
    <EditingContext.Provider value={{
      editingPath,
      setEditingPath,
      isEditing
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