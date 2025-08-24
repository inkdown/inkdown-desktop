import { memo } from 'react';
import { FileTree } from './FileTree';
import { FileNode } from '../../stores/directoryStore';

interface SidebarContentProps {
  fileTree: FileNode;
  selectedFile: string | null;
  onFileSelect: (filePath: string, event?: React.MouseEvent) => void;
  onFileDoubleClick?: (filePath: string, event?: React.MouseEvent) => void;
  onFileDeleted: (deletedPath: string) => void;
}

export const SidebarContent = memo(function SidebarContent({
  fileTree,
  selectedFile,
  onFileSelect,
  onFileDoubleClick,
  onFileDeleted
}: SidebarContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <FileTree
        fileTree={fileTree}
        onFileSelect={onFileSelect}
        onFileDoubleClick={onFileDoubleClick}
        onFileDeleted={onFileDeleted}
        selectedFile={selectedFile}
        className="h-full"
      />
    </div>
  );
});