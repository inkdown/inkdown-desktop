import { memo } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { SidebarContent } from './SidebarContent';
import { FileNode } from '../../contexts/DirectoryContext';

interface SidebarProps {
  width: number;
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
}

export const Sidebar = memo(function Sidebar({
  width,
  fileTree,
  selectedFile,
  onFileSelect,
}: SidebarProps) {
  
  return (
    <div 
      className="theme-sidebar flex flex-col"
      style={{
        width,
        backgroundColor: 'var(--theme-sidebar-background)',
        borderRight: '1px solid var(--theme-sidebar-border)'
      }}
    >
      <SidebarHeader
        projectName={fileTree.name}
      />
      
      <SidebarContent
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={onFileSelect}
      />
    </div>
  );
});