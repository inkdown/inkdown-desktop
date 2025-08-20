import { memo, useMemo } from 'react';
import { StatusBarDropdown, type StatusBarAction } from './StatusBarDropdown';
import { Edit2, Trash2 } from 'lucide-react';

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  pluginId?: string;
  callback?: () => void;
  actions?: StatusBarAction[];
}

interface StatusBarProps {
  items: StatusBarItem[];
  onRename?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  className?: string;
}

export const StatusBar = memo(function StatusBar({
  items,
  onRename,
  onDelete,
  className = ''
}: StatusBarProps) {
  const processedItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      actions: item.actions || [
        {
          id: 'rename',
          label: 'Renomear',
          icon: <Edit2 size={12} />,
          onClick: () => onRename?.(item.id)
        },
        {
          id: 'delete',
          label: 'Excluir',
          icon: <Trash2 size={12} />,
          onClick: () => onDelete?.(item.id),
          separator: true
        }
      ]
    }));
  }, [items, onRename, onDelete]);

  if (processedItems.length === 0) {
    return null;
  }

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1 
      border-t border-border
      text-xs
      ${className}
    `}>
      {processedItems.map(item => (
        <div
          key={item.id}
          className="flex items-center gap-1 group"
        >
          <button
            onClick={item.callback}
            title={item.tooltip}
            className="
              px-2 py-1 rounded text-muted-foreground
              hover:bg-accent hover:text-accent-foreground
              transition-colors duration-150
              cursor-pointer
            "
          >
            {item.text}
          </button>
          
          <StatusBarDropdown
            sections={[{
              id: 'default',
              label: 'Ações',
              actions: item.actions
            }]}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
          />
        </div>
      ))}
    </div>
  );
});