import { memo, useMemo } from 'react';
import { SidebarHeader } from './SidebarHeader';
import { SidebarContent } from './SidebarContent';
import { FileNode } from '../../contexts/DirectoryContext';
import { useAppearance } from '../../contexts/AppearanceContext';

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
  const { currentTheme } = useAppearance();
  
  const containerStyle = useMemo(() => ({
    width,
    backgroundColor: currentTheme.sidebar.background,
    borderRight: `1px solid ${currentTheme.sidebar.border}`
  }), [width, currentTheme.sidebar.background, currentTheme.sidebar.border]);
  
  return (
    <div 
      className="theme-sidebar flex flex-col"
      style={containerStyle}
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