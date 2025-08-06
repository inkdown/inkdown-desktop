import { useState, useCallback, useMemo, useRef, memo, useEffect } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText } from 'lucide-react';
import { confirm } from '@tauri-apps/plugin-dialog';
import { FileNode } from '../../contexts/DirectoryContext';
import { ContextMenu } from '../ui/overlays/ContextMenu';
import { useFileOperations } from '../../hooks/useFileOperations';
import { useEditing } from '../../contexts/EditingContext';
import { useAppearance } from '../../contexts/AppearanceContext';

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
  
  const { createDirectory, createFile, deleteFileOrDirectory, renameFileOrDirectory } = useFileOperations();
  const { setEditingPath, isEditing } = useEditing();
  const { currentTheme } = useAppearance();
  
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedFile === node.path;
  const isRootDirectory = level === 0 && node.is_directory;
  const isCurrentlyEditing = isEditing(node.path);

  const displayName = useMemo(() => 
    node.is_directory ? node.name : node.name.replace(/\.md$/, ''),
    [node.name, node.is_directory]
  );

  const containerStyle = useMemo(() => ({
    paddingLeft: `${level * 16 + 8}px`,
    backgroundColor: isSelected ? currentTheme.primary : 'transparent',
    color: isSelected ? currentTheme.primaryForeground : currentTheme.sidebar.foreground
  }), [level, isSelected, currentTheme.primary, currentTheme.primaryForeground, currentTheme.sidebar.foreground]);

  const iconStyle = useMemo(() => ({
    color: currentTheme.primary
  }), [currentTheme.primary]);

  const textStyle = useMemo(() => ({
    color: isSelected ? currentTheme.primaryForeground : 
           node.is_directory ? currentTheme.sidebar.foreground : 
           currentTheme.mutedForeground
  }), [isSelected, node.is_directory, currentTheme.primaryForeground, currentTheme.sidebar.foreground, currentTheme.mutedForeground]);

  const chevronClasses = useMemo(() => 
    `mr-1 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`,
    [isExpanded]
  );
  
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
    try {
      const shouldDelete = await confirm(`Tem certeza que deseja excluir "${node.name}"? Esta ação não pode ser desfeita.`, {
        title: 'Confirmar exclusão',
        kind: 'warning'
      });
      
      if (shouldDelete) {
        await deleteFileOrDirectory(node.path);
      }
    } catch (error) {
      console.error('Erro ao confirmar exclusão:', error);
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

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = currentTheme.sidebar.hover;
    }
  }, [isSelected, currentTheme.sidebar.hover]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelected) {
      e.currentTarget.style.backgroundColor = 'transparent';
    }
  }, [isSelected]);

  useEffect(() => {
    if (isCurrentlyEditing && !editValue) {
      setEditValue(displayName);
    }
  }, [isCurrentlyEditing, displayName]);

  const icon = useMemo(() => {
    if (node.is_directory) {
      return isExpanded ? 
        <FolderOpen size={16} style={iconStyle} /> : 
        <Folder size={16} style={iconStyle} />;
    }
    return <FileText size={16} style={{ color: currentTheme.mutedForeground }} />;
  }, [node.is_directory, isExpanded, iconStyle, currentTheme.mutedForeground]);

  return (
    <div className="select-none">
      <div
        className="file-tree-item flex items-center py-1 px-2 cursor-pointer rounded theme-transition"
        style={containerStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={node.is_directory ? handleToggle : handleSelect}
        onContextMenu={handleContextMenu}
      >
        {hasChildren && (
          <ChevronRight 
            size={14} 
            className={chevronClasses}
            style={{ color: currentTheme.mutedForeground }}
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
            className="flex-1 text-sm theme-input rounded px-1 py-0.5 theme-focus-ring"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span 
            className={`text-sm truncate flex-1 ${node.is_directory ? 'font-medium' : ''} ${isSelected ? 'font-semibold' : ''}`}
            title={displayName}
            style={textStyle}
          >
            {displayName}
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
  const { currentTheme } = useAppearance();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const { createDirectory, createFile } = useFileOperations();
  const { setEditingPath } = useEditing();
  
  const handleRefresh = useCallback(() => {
  }, []);

  const handleEmptyAreaContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest('.file-tree-item');
    
    if (!isFileTreeItem) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const newPath = await createDirectory(fileTree.path);
    if (newPath) {
      requestAnimationFrame(() => setEditingPath(newPath));
    }
    closeContextMenu();
  }, [createDirectory, fileTree.path, setEditingPath, closeContextMenu]);

  const handleCreateFile = useCallback(async () => {
    const newPath = await createFile(fileTree.path);
    if (newPath) {
      requestAnimationFrame(() => setEditingPath(newPath));
    }
    closeContextMenu();
  }, [createFile, fileTree.path, setEditingPath, closeContextMenu]);

  const memoizedTree = useMemo(() => {
    return (
      <div 
        className={`h-full overflow-auto theme-scrollbar ${className}`}
        onContextMenu={handleEmptyAreaContextMenu}
      >
        <div className="p-2">
          <div 
            className="text-xs font-semibold uppercase tracking-wide mb-2 px-2"
            style={{ color: currentTheme.mutedForeground }}
          >
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
        
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={closeContextMenu}
            onCreateFolder={handleCreateFolder}
            onCreateFile={handleCreateFile}
            isDirectory={true}
            isRootDirectory={true}
          />
        )}
      </div>
    );
  }, [fileTree, onFileSelect, selectedFile, className, handleRefresh, currentTheme.mutedForeground, contextMenu, handleEmptyAreaContextMenu, closeContextMenu, handleCreateFolder, handleCreateFile]);

  return memoizedTree;
}