import { memo } from 'react';
import { SidebarContent } from './SidebarContent';
import { FileNode } from '../../stores/directoryStore';

interface SidebarProps {
  width: number;
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string, event?: React.MouseEvent) => void;
  onFileDoubleClick?: (filePath: string, event?: React.MouseEvent) => void;
  onFileDeleted: (deletedPath: string) => void;
}

export const Sidebar = memo(function Sidebar({
  width,
  fileTree,
  selectedFile,
  onFileSelect,
  onFileDoubleClick,
  onFileDeleted,
}: SidebarProps) {
  
  return (
    <div 
      className="flex flex-col h-screen pt-5"
      style={{ 
        width,
        backgroundColor: 'var(--theme-sidebar-background)',
        borderRight: '1px solid var(--theme-border)',
      }}
    >
      <SidebarContent
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={onFileSelect}
        onFileDoubleClick={onFileDoubleClick}
        onFileDeleted={onFileDeleted}
      />
    </div>
  );
});