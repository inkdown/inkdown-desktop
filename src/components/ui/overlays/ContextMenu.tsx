import { useEffect, useRef, useMemo, memo } from 'react';
import { FolderPlus, FileText, Edit, Trash2 } from 'lucide-react';

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

export const ContextMenu = memo(function ContextMenu({
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

  const menuItems = useMemo(() => {
    const items = [];
    
    // Add folder/file creation options for directories
    if (isDirectory) {
      items.push({
        icon: <FolderPlus size={16} />,
        label: 'Nova Pasta',
        onClick: onCreateFolder
      });
      items.push({
        icon: <FileText size={16} />,
        label: 'Nova Nota',
        onClick: onCreateFile
      });
    }
    
    // Add rename option (not for root directories)
    if (onRename && !isRootDirectory) {
      items.push({
        icon: <Edit size={16} />,
        label: 'Renomear',
        onClick: onRename
      });
    }
    
    // Add delete option (not for root directories)
    if (onDelete && !isRootDirectory) {
      items.push({
        icon: <Trash2 size={16} />,
        label: 'Excluir',
        onClick: onDelete,
        isDangerous: true
      });
    }
    
    return items;
  }, [isDirectory, isRootDirectory, onCreateFolder, onCreateFile, onRename, onDelete]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = Math.max(10, viewportWidth - rect.width - 10);
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = Math.max(10, viewportHeight - rect.height - 10);
      }

      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [x, y]);

  // Always render if we have at least one item
  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg py-1"
      style={{ 
        left: x, 
        top: y,
        backgroundColor: 'var(--theme-background)',
        border: '1px solid var(--theme-border)',
        minWidth: '160px',
        width: 'max-content'
      }}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full flex items-center px-4 py-2 text-sm text-left transition-colors whitespace-nowrap"
          style={{
            color: (item as any).isDangerous ? 'var(--theme-destructive)' : 'var(--theme-foreground)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = (item as any).isDangerous 
              ? 'var(--theme-destructive-foreground)20' 
              : 'var(--theme-muted)';
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
});