import { memo } from 'react';
import { SidebarContent } from './SidebarContent';
import { FileNode } from '../../contexts/DirectoryContext';

interface SidebarProps {
  width: number;
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  onFileDeleted: (deletedPath: string) => void;
}

export const Sidebar = memo(function Sidebar({
  width,
  fileTree,
  selectedFile,
  onFileSelect,
  onFileDeleted,
}: SidebarProps) {
  
  return (
    <div 
      className="flex flex-col h-screen pt-12"
      style={{ 
        width,
        backgroundColor: 'var(--theme-sidebar-background)',
        borderRight: '1px solid var(--theme-sidebar-border)'
      }}
    >
      <SidebarContent
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={onFileSelect}
        onFileDeleted={onFileDeleted}
      />
    </div>
  );
});