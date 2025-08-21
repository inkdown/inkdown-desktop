import { useEffect, useRef, useMemo, memo } from "react";
import { FolderPlus, FileText, Edit, Trash2, Calendar } from "lucide-react";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onCreateDailyNote?: () => void;
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
  onCreateDailyNote,
  onRename,
  onDelete,
  isDirectory,
  isRootDirectory = false,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const menuItems = useMemo(() => {
    const items = [];

    if (isDirectory) {
      items.push({
        icon: <FolderPlus size={15} />,
        label: "Nova Pasta",
        onClick: onCreateFolder,
      });
      items.push({
        icon: <FileText size={15} />,
        label: "Nova Nota",
        onClick: onCreateFile,
      });
      
      if (onCreateDailyNote) {
        items.push({
          icon: <Calendar size={15} />,
          label: "Nota Diária",
          onClick: onCreateDailyNote,
        });
      }
    }

    if (onRename && !isRootDirectory) {
      items.push({
        icon: <Edit size={15} />,
        label: "Renomear",
        onClick: onRename,
      });
    }

    if (onDelete && !isRootDirectory) {
      items.push({
        icon: <Trash2 size={15} />,
        label: "Excluir",
        onClick: onDelete,
        isDangerous: true,
      });
    }

    return items;
  }, [
    isDirectory,
    isRootDirectory,
    onCreateFolder,
    onCreateFile,
    onCreateDailyNote,
    onRename,
    onDelete,
  ]);

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

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 rounded-lg shadow-lg py-2 px-2"
      style={{
        left: x,
        top: y,
        backgroundColor: "var(--theme-background)",
        border: "1px solid var(--theme-border)",
        minWidth: "135px",
        width: "max-content",
      }}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          className="w-full text-xs hover:cursor-pointer rounded-lg flex items-center px-2 py-2 text-left transition-colors whitespace-nowrap"
          style={{
            color: (item as any).isDangerous
              ? "var(--theme-destructive)"
              : "var(--theme-foreground)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--theme-muted)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <span className="mr-2">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
});
