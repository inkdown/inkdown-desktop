import { memo } from 'react';
import { BookOpen, Edit3 } from 'lucide-react';
import { useContentStats } from '../../hooks/useContentStats';
import { StatusBarDropdown, type StatusBarSection } from '../ui/StatusBarDropdown';

interface EditorFooterProps {
  content: string;
  isPreviewMode: boolean;
  onTogglePreview: () => void;
  statusBarSections?: StatusBarSection[];
}

export const EditorFooter = memo(function EditorFooter({
  content,
  isPreviewMode,
  onTogglePreview,
  statusBarSections = []
}: EditorFooterProps) {
  const stats = useContentStats(content, true);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 text-xs z-30"
      style={{
        backgroundColor: 'var(--theme-sidebar-background)',
        color: 'var(--theme-sidebar-foreground)',
      }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors duration-150 hover:bg-opacity-80"
          style={{
            backgroundColor: 'transparent',
            color: 'var(--theme-sidebar-foreground)'
          }}
          title={isPreviewMode ? "Voltar ao Editor" : "Visualizar Preview"}
        >
          {isPreviewMode ? <Edit3 size={12} /> : <BookOpen size={12} />}
          <span className="text-xs">
            {isPreviewMode ? "Editor" : "Preview"}
          </span>
        </button>

        <div className="w-px h-4 bg-current opacity-30 mx-1"></div>

        <span>{stats.words} palavras</span>
        <span>{stats.characters} caracteres</span>
      </div>

      {statusBarSections.length > 0 && (
        <StatusBarDropdown sections={statusBarSections} />
      )}
    </div>
  );
});
