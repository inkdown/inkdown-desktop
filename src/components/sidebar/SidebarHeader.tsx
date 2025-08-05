import { memo } from 'react';
import { Folder } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarHeaderProps {
  projectName: string;
}

export const SidebarHeader = memo(function SidebarHeader({
  projectName,
}: SidebarHeaderProps) {
  const { currentTheme } = useTheme();
  
  return (
    <div 
      className="p-3"
      style={{ 
        borderBottom: `1px solid ${currentTheme.colors.sidebar.border}`,
        backgroundColor: currentTheme.colors.sidebar.background
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Folder 
              size={14} 
              className="flex-shrink-0" 
              style={{ color: currentTheme.colors.primary }}
            />
            <h3 
              className="text-sm font-medium truncate"
              style={{ color: currentTheme.colors.sidebar.foreground }}
            >
              {projectName}
            </h3>
          </div>
          <p 
            className="text-xs truncate ml-6 theme-text-muted"
            style={{ color: currentTheme.colors.mutedForeground }}
          >
            Workspace
          </p>
        </div>
      </div>
    </div>
  );
});