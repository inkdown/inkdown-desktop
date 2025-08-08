import { memo } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';

interface EditorToolbarProps {
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

export const EditorToolbar = memo(function EditorToolbar({  
  isPreviewMode, 
  onTogglePreview 
}: EditorToolbarProps) {
  return (
    <div 
      className="px-4 py-2 flex items-center gap-2"
      style={{ 
        backgroundColor: 'var(--inkdown-editor-bg)'
      }}
    >
      <button
        onClick={onTogglePreview}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:opacity-80"
        style={{
          color: 'var(--theme-secondary-foreground)'
        }}
        title={isPreviewMode ? "Voltar ao Editor" : "Visualizar Preview"}
      >
        {isPreviewMode ? <Edit3 size={16} /> : <BookOpen size={16} />}
      </button>
      
      <div className="flex-1" />
    </div>
  );
});