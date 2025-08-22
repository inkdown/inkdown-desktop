import { memo } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';
import { useContentStats } from '../../hooks/useContentStats';

interface EditorFooterProps {
  content: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
}

export const EditorFooter = memo(function EditorFooter({
  content,
  isPreviewMode,
  onTogglePreview
}: EditorFooterProps) {
  const stats = useContentStats(content, true);

  return (
    <div
      className="flex items-center border-[1px] gap-3 px-3 py-1 text-xs rounded-lg shadow-lg backdrop-blur-sm pointer-events-auto"
      style={{
        backgroundColor: 'var(--theme-secondary)',
        borderColor: 'var(--theme-muted)',
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
