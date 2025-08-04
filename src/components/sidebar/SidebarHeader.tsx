import { memo } from 'react';
import { Folder } from 'lucide-react';

interface SidebarHeaderProps {
  projectName: string;
}

export const SidebarHeader = memo(function SidebarHeader({
  projectName,
}: SidebarHeaderProps) {
  return (
    <div className="p-3 border-b border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Folder size={14} className="text-blue-500 flex-shrink-0" />
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {projectName}
            </h3>
          </div>
          <p className="text-xs text-gray-500 truncate ml-6">
            Workspace
          </p>
        </div>
      </div>
    </div>
  );
});