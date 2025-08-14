import { memo } from 'react';
import { Folder, Settings } from 'lucide-react';

interface SidebarHeaderProps {
  projectName: string;
  onOpenSettings: () => void;
  width?: number;
}

export const SidebarHeader = memo(function SidebarHeader({
  projectName,
  onOpenSettings,
  width = 280,
}: SidebarHeaderProps) {
  
  return (
    <div 
      className="px-3 py-3 fixed top-0 left-0 h-12 rounded-lg sidebar-header z-20"
      style={{ 
        width: `${width}px`,
        backgroundColor: 'var(--theme-sidebar-background)',
      }}
    >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Folder 
                size={14} 
                className="flex-shrink-0 folder-icon opacity-70" 
              />
              <h3 className="text-sm font-medium truncate project-name">
                {projectName}
              </h3>
            </div>
          </div>
          
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded settings-button hover:bg-opacity-10 transition-colors"
            title="Configurações"
          >
            <Settings size={14} className="opacity-60 hover:opacity-100" />
          </button>
        </div>
    </div>
  );
});