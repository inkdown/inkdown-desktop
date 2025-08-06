import { memo, useState } from 'react';
import { Folder, Settings } from 'lucide-react';
import { useAppearance } from '../../contexts/AppearanceContext';
import { SettingsModal } from '../settings';

interface SidebarHeaderProps {
  projectName: string;
}

export const SidebarHeader = memo(function SidebarHeader({
  projectName,
}: SidebarHeaderProps) {
  const { currentTheme } = useAppearance();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  return (
    <>
      <div 
        className="p-3"
        style={{ 
          borderBottom: `1px solid ${currentTheme.sidebar.border}`,
          backgroundColor: currentTheme.sidebar.background
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Folder 
                size={14} 
                className="flex-shrink-0" 
                style={{ color: currentTheme.primary }}
              />
              <h3 
                className="text-sm font-medium truncate"
                style={{ color: currentTheme.sidebar.foreground }}
              >
                {projectName}
              </h3>
            </div>
            <p 
              className="text-xs truncate ml-6 theme-text-muted"
              style={{ color: currentTheme.mutedForeground }}
            >
              Workspace
            </p>
          </div>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded transition-colors"
            title="Configurações"
            style={{ 
              color: currentTheme.mutedForeground,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = currentTheme.sidebar.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Settings size={14} />
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