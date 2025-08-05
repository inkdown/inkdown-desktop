import { memo } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { SidebarContent } from './SidebarContent';
import { FileNode } from '../../contexts/DirectoryContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { currentTheme } = useTheme();
  
  return (
    <div 
      className="theme-sidebar flex flex-col"
      style={{ 
        width,
        backgroundColor: currentTheme.colors.sidebar.background,
        borderRight: `1px solid ${currentTheme.colors.sidebar.border}`
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