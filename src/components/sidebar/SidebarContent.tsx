import { memo } from 'react';
import { FileTree } from './FileTree';
import { FileNode } from '../../stores/directoryStore';

interface SidebarContentProps {
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string) => void;
  onFileDeleted: (deletedPath: string) => void;
}

export const SidebarContent = memo(function SidebarContent({
  fileTree,
  selectedFile,
  onFileSelect,
  onFileDeleted
}: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <FileTree
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        onFileDeleted={onFileDeleted}
        selectedFile={selectedFile}
        className="h-full"
      />
    </div>
  );
});