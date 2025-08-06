import { useEffect, useRef } from 'react';
import { FolderPlus, FileText, Edit, Trash2 } from 'lucide-react';
import { useAppearance } from '../../../contexts/AppearanceContext';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  isDirectory: boolean;
  isRootDirectory?: boolean;
}

export function ContextMenu({
  x,
  y,
  onClose,
  onCreateFolder,
  onCreateFile,
  onRename,
  onDelete,
  isDirectory,
  isRootDirectory = false
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useAppearance();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  const menuItems = [
    ...(isDirectory ? [
      {
        icon: <FolderPlus size={16} />,
        label: 'Nova Pasta',
        onClick: onCreateFolder
      },
      {
        icon: <FileText size={16} />,
        label: 'Nova Nota',
        onClick: onCreateFile
      }
    ] : []),
    ...(!isRootDirectory && onRename ? [
      {
        icon: <Edit size={16} />,
        label: 'Renomear',
        onClick: onRename
      }
    ] : []),
    ...(!isRootDirectory && onDelete ? [
      {
        icon: <Trash2 size={16} />,
        label: 'Excluir',
        onClick: onDelete,
        isDangerous: true
      }
    ] : [])
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg py-1 min-w-36"
      style={{ 
        left: x, 
        top: y,
        backgroundColor: currentTheme.background,
        border: `1px solid ${currentTheme.border}`
      }}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full flex items-center px-3 py-2 text-sm text-left transition-colors"
          style={{
            color: (item as any).isDangerous ? currentTheme.destructive : currentTheme.foreground
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = (item as any).isDangerous 
              ? `${currentTheme.destructive}20` 
              : currentTheme.muted;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="mr-3">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}