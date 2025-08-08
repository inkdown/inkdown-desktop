import { memo, useState } from 'react';
import { Folder, Settings } from 'lucide-react';
import { SettingsModal } from '../settings';

interface SidebarHeaderProps {
  projectName: string;
}

export const SidebarHeader = memo(function SidebarHeader({
  projectName,
}: SidebarHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <>
      <div className="px-3 py-2.5 sidebar-header">
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
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded settings-button hover:bg-opacity-10 transition-colors"
            title="Configurações"
          >
            <Settings size={14} className="opacity-60 hover:opacity-100" />
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
});