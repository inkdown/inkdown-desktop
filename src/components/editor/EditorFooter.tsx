import { memo, useMemo } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';

interface EditorFooterStats {
  characters: number;
  words: number;
}

interface EditorFooterProps {
  content: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

const calculateStats = (content: string): EditorFooterStats => {
  const characters = content.length;
  const words = content.trim() 
    ? content.trim().split(/\s+/).filter(word => word.length > 0).length 
    : 0;

  return {
    characters,
    words
  };
};

export const EditorFooter = memo(function EditorFooter({
  content,
  isPreviewMode,
  onTogglePreview
}: EditorFooterProps) {
  const stats = useMemo(() => calculateStats(content), [content]);

  return (
    <div 
      className="flex items-center gap-3 px-1 py-1 mb-32 text-xs rounded-lg shadow-lg backdrop-blur-sm border pointer-events-auto"
      style={{ 
        backgroundColor: 'var(--theme-secondary)',
        borderColor: 'var(--theme-accent)',
      }}
    >
      <span>{stats.words} palavras</span>
      <span>{stats.characters} caracteres</span>
      
      <div className="w-px h-4 bg-current opacity-30 mx-1"></div>
      
      <button
        onClick={onTogglePreview}
        className="flex items-center justify-center w-6 h-6 rounded transition-colors duration-150 hover:opacity-80"
        style={{
          backgroundColor: isPreviewMode ? 'var(--theme-primary)' : 'transparent'
        }}
        title={isPreviewMode ? "Voltar ao Editor" : "Visualizar Preview"}
      >
        {isPreviewMode ? <Edit3 size={12} /> : <BookOpen size={12} />}
      </button>
    </div>
  );
});