import { memo, useMemo } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';

interface EditorToolbarProps {
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  currentTheme: any;
}

export const EditorToolbar = memo(function EditorToolbar({  
  isPreviewMode, 
  onTogglePreview, 
  currentTheme 
}: EditorToolbarProps) {
  const toolbarStyle = useMemo(() => ({
    borderBottom: `1px solid ${currentTheme.border}`,
    backgroundColor: currentTheme.background
  }), [currentTheme.border, currentTheme.background]);

  const previewButtonStyle = useMemo(() => ({
    backgroundColor: isPreviewMode ? currentTheme.primary : currentTheme.muted,
    color: isPreviewMode ? currentTheme.primaryForeground : currentTheme.foreground,
    border: `1px solid ${currentTheme.border}`
  }), [isPreviewMode, currentTheme]);

  return (
    <div className="px-4 py-2 flex items-center gap-2" style={toolbarStyle}>
      <button
        onClick={onTogglePreview}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
        style={previewButtonStyle}
        title={isPreviewMode ? "Voltar ao Editor" : "Visualizar Preview"}
      >
        {isPreviewMode ? <Edit3 size={16} /> : <BookOpen size={16} />}
        {isPreviewMode ? "Editar" : "Preview"}
      </button>
      
      <div className="flex-1" />
    </div>
  );
});