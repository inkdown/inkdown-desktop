import { memo } from 'react';
import { FileTree } from './FileTree';
import { FileNode } from '../../contexts/DirectoryContext';

interface SidebarContentProps {
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
}

export const SidebarContent = memo(function SidebarContent({
  fileTree,
  selectedFile,
  onFileSelect
}: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <FileTree
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        selectedFile={selectedFile}
        className="h-full"
      />
    </div>
  );
});