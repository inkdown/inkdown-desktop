import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { FileNode } from '../contexts/DirectoryContext';
import { ContextMenu } from './ContextMenu';
import { useFileOperations } from '../hooks/useFileOperations';
import { useEditing } from '../contexts/EditingContext';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  onRefresh: () => void;
}

const FileTreeItem = memo(function FileTreeItem({ node, level, onFileSelect, selectedFile, onRefresh }: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { createDirectory, createFile, deleteFileOrDirectory, renameFileOrDirectory, getLastError } = useFileOperations();
  const { editingPath, setEditingPath, isEditing } = useEditing();
  
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFile === node.path;
  const isRootDirectory = level === 0;
  const isCurrentlyEditing = isEditing(node.path);
  
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  }, [hasChildren, isExpanded]);

  const handleSelect = useCallback(() => {
    if (!node.is_directory) {
      onFileSelect(node.path);
    }
  }, [node.is_directory, node.path, onFileSelect]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!isExpanded) setIsExpanded(true);
    
    const newPath = await createDirectory(node.path);
    if (newPath) {
      requestAnimationFrame(() => setEditingPath(newPath));
    }
  }, [createDirectory, node.path, isExpanded, setEditingPath]);

  const handleCreateFile = useCallback(async () => {
    if (!isExpanded) setIsExpanded(true);
    
    const newPath = await createFile(node.path);
    if (newPath) {
      requestAnimationFrame(() => setEditingPath(newPath));
    }
  }, [createFile, node.path, isExpanded, setEditingPath]);

  const handleRename = useCallback(() => {
    const nameWithoutExt = node.is_directory ? node.name : node.name.replace(/\.md$/, '');
    setEditValue(nameWithoutExt);
    setEditingPath(node.path);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [node.name, node.is_directory, node.path, setEditingPath]);

  const handleDelete = useCallback(async () => {
    if (window.confirm(`Tem certeza que deseja excluir "${node.name}"? Esta ação não pode ser desfeita.`)) {
      await deleteFileOrDirectory(node.path);
    }
  }, [node.name, node.path, deleteFileOrDirectory]);

  const handleEditSubmit = useCallback(async () => {
    if (editValue.trim()) {
      await renameFileOrDirectory(node.path, editValue.trim());
    }
    setEditingPath(null);
  }, [editValue, node.path, renameFileOrDirectory, setEditingPath]);

  const handleEditCancel = useCallback(() => {
    setEditingPath(null);
    setEditValue('');
  }, [setEditingPath]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    }
  }, [handleEditSubmit, handleEditCancel]);

  if (isCurrentlyEditing && !editValue) {
    const nameWithoutExt = node.is_directory ? node.name : node.name.replace(/\.md$/, '');
    setEditValue(nameWithoutExt);
  }

  // Memoize the icon to avoid re-renders
  const icon = useMemo(() => {
    if (node.is_directory) {
      return isExpanded ? 
        <FolderOpen size={16} className="text-blue-600" /> : 
        <Folder size={16} className="text-blue-500" />;
    }
    return <FileText size={16} className="text-gray-500" />;
  }, [node.is_directory, isExpanded]);

  return (
    <div className="select-none">
      <div
        className={`
          flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 rounded
          ${isSelected ? 'bg-blue-100 text-blue-800' : ''}
          ${!node.is_directory ? 'hover:bg-blue-50' : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={node.is_directory ? handleToggle : handleSelect}
        onContextMenu={handleContextMenu}
      >
        {hasChildren && (
          <ChevronRight 
            size={14} 
            className={`mr-1 text-gray-500 hover:text-gray-700 transition-transform duration-150 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
        
        <span className="mr-2">{icon}</span>
        
        {isCurrentlyEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleEditSubmit}
            className="flex-1 text-sm bg-white border border-blue-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className={`
              text-sm truncate flex-1
              ${node.is_directory ? 'font-medium text-gray-700' : 'text-gray-600'}
              ${isSelected ? 'font-semibold' : ''}
            `}
            title={node.name}
          >
            {node.name}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-2">
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onRename={!isRootDirectory ? handleRename : undefined}
          onDelete={!isRootDirectory ? handleDelete : undefined}
          isDirectory={node.is_directory}
          isRootDirectory={isRootDirectory}
        />
      )}

    </div>
  );
});

interface FileTreeProps {
  fileTree: FileNode;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  className?: string;
}

export function FileTree({ fileTree, onFileSelect, selectedFile, className = '' }: FileTreeProps) {
  const handleRefresh = useCallback(() => {
  }, []);

  const memoizedTree = useMemo(() => {
    return (
      <div className={`h-full overflow-auto ${className}`}>
        <div className="p-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-2">
            Explorer
          </div>
          {fileTree.children?.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onRefresh={handleRefresh}
            />
          )) || (
            <FileTreeItem
              node={fileTree}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onRefresh={handleRefresh}
            />
          )}
        </div>
      </div>
    );
  }, [fileTree, onFileSelect, selectedFile, className, handleRefresh]);

  return memoizedTree;
}