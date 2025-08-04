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
      className="bg-white border-r border-gray-200 flex flex-col"
      style={{ width }}
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