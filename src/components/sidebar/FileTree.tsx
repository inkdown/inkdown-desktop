import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react";
import { FileText, ChevronRight, ChevronDown } from "lucide-react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { FileNode, useDirectoryStore } from "../../stores/directoryStore";
import { ContextMenu } from "../ui/overlays/ContextMenu";
import { useFileOperations } from "../../hooks/useFileOperations";
import { useEditingStore } from "../../stores/editingStore";
import { useDragAndDrop } from "../../hooks/useDragAndDrop";

const WINDOWS_INVALID_CHARS = ['<', '>', ':', '"', '|', '?', '*'] as const;
const RESERVED_NAMES = [
  'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 
  'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 
  'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
] as const;

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileSelect: (path: string) => void;
  onFileDeleted: (deletedPath: string) => void;
  selectedFile: string | null;
  onRefresh: () => void;
  isWorkspaceRoot?: boolean;
  isNewlyCreated?: boolean;
  dragHandlers: ReturnType<typeof useDragAndDrop>;
}

const FileTreeItem = memo(function FileTreeItem({
  node,
  level,
  onFileSelect,
  onFileDeleted,
  selectedFile,
  onRefresh,
  isWorkspaceRoot = false,
  dragHandlers,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });
  const isInitializedRef = useRef(false);

  const {
    createDirectory,
    createFile,
    deleteFileOrDirectory,
    renameFileOrDirectory,
  } = useFileOperations();
  const { setEditingPath, setActiveFile, isEditing } = useEditingStore();

  const isSelected = selectedFile === node.path;
  const isCurrentlyEditing = isEditing(node.path);
  const isDraggedOver = dragHandlers.isDraggedOver(node.path);
  const isDragging = dragHandlers.isDragging(node.path);

  const displayName = useMemo(() => 
    node.is_directory ? node.name : node.name.replace(/\.md$/, ""),
    [node.is_directory, node.name]
  );


  const handleInputRef = useCallback((el: HTMLInputElement | null) => {
    if (el && !isInitializedRef.current) {
      if (!editValue) {
        setEditValue(displayName);
      }
      
      // Simple cross-platform focus handling
      setTimeout(() => {
        if (el.isConnected) {
          el.focus();
          el.select();
        }
      }, 50);
      
      isInitializedRef.current = true;
    }
  }, [editValue, displayName]);


  const validatePath = useCallback((pathInput: string) => {
    if (!pathInput.trim()) {
      setPathValidation({ isValid: true, message: "" });
      return;
    }

    const cleanPath = pathInput.trim();

    if (cleanPath.includes('..')) {
      setPathValidation({
        isValid: false,
        message: "Path traversal não é permitido"
      });
      return;
    }

    if (cleanPath.includes('/')) {
      setPathValidation({
        isValid: false,
        message: "Não é possível usar '/' no nome"
      });
      return;
    }

    if (cleanPath.length > 100) {
      setPathValidation({
        isValid: false,
        message: "Nome muito longo (máximo 100 caracteres)"
      });
      return;
    }

    const invalidChar = WINDOWS_INVALID_CHARS.find(char => cleanPath.includes(char));
    if (invalidChar) {
      setPathValidation({
        isValid: false,
        message: `Caractere inválido "${invalidChar}"`
      });
      return;
    }

    const namePart = cleanPath.split('.')[0].toUpperCase();
    if (RESERVED_NAMES.includes(namePart as any)) {
      setPathValidation({
        isValid: false,
        message: `Nome reservado "${cleanPath}"`
      });
      return;
    }

    if (cleanPath.endsWith('.') || cleanPath.endsWith(' ')) {
      setPathValidation({
        isValid: false,
        message: `"${cleanPath}" não pode terminar com ponto ou espaço`
      });
      return;
    }

    setPathValidation({ isValid: true, message: "" });
  }, []);

  const containerStyle = useMemo(() => ({
    paddingLeft: `${level * 14 + 8}px`,
  }), [level]);

  const baseClasses = "file-tree-item flex items-center py-1 px-2 cursor-pointer rounded text-sm";
  const selectedClass = isSelected ? " selected" : "";
  const typeClass = node.is_directory ? " directory" : " file";
  const dragOverClass = isDraggedOver ? " drag-over" : "";
  const draggingClass = isDragging ? " dragging" : "";
  
  const itemClasses = `${baseClasses}${selectedClass}${typeClass}${dragOverClass}${draggingClass}`;

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (node.is_directory) {
        setIsExpanded(!isExpanded);
      }
    },
    [node.is_directory, isExpanded],
  );

  const handleSelect = useCallback(() => {
    if (!node.is_directory) {
      onFileSelect(node.path);
      setActiveFile(node.path, "");
    }
  }, [node.is_directory, node.path, onFileSelect, setActiveFile]);

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
      setEditValue("");
      isInitializedRef.current = false;
      setTimeout(() => setEditingPath(newPath), 50);
    }
  }, [createDirectory, node.path, isExpanded, setEditingPath]);

  const handleCreateFile = useCallback(async () => {
    if (!isExpanded) setIsExpanded(true);

    const newPath = await createFile(node.path);
    if (newPath) {
      setEditValue("");
      isInitializedRef.current = false;
      setTimeout(() => setEditingPath(newPath), 50);
    }
  }, [createFile, node.path, isExpanded, setEditingPath]);

  const handleCreateDailyNote = useCallback(async () => {
    if (!isExpanded) setIsExpanded(true);
    
    // Generate daily note name with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dailyNoteName = `${dateStr}`;
    
    const newPath = await createFile(node.path, dailyNoteName);
    if (newPath) {
      onFileSelect(newPath);
    }
  }, [createFile, node.path, isExpanded, onFileSelect]);

  const handleRename = useCallback(() => {
    setEditValue(displayName);
    isInitializedRef.current = false; // Allow ref callback to run for focus/select
    setEditingPath(node.path);
  }, [node.path, setEditingPath, displayName]);

  const handleDelete = useCallback(async () => {
    try {
      const shouldDelete = await confirm(
        `Tem certeza que deseja excluir "${node.name}"? Esta ação não pode ser desfeita.`,
        {
          title: "Confirmar exclusão",
          kind: "warning",
        },
      );

      if (shouldDelete) {
        const success = await deleteFileOrDirectory(node.path);
        if (success) {
          onFileDeleted(node.path);
        }
      }
    } catch (error) {
    }
  }, [node.name, node.path, deleteFileOrDirectory, onFileDeleted]);

  const handleEditSubmit = useCallback(async () => {
    if (editValue.trim() && pathValidation.isValid && editValue.trim() !== displayName) {
      const oldPath = node.path;
      const newPath = await renameFileOrDirectory(oldPath, editValue.trim());
      
      if (newPath && !node.is_directory) {
        onFileSelect(newPath);
      }
    
    }
    setEditingPath(null);
    setEditValue("");
    setPathValidation({ isValid: true, message: "" });
    isInitializedRef.current = false;
  }, [
    editValue,
    pathValidation.isValid,
    displayName,
    node.path,
    node.is_directory,
    renameFileOrDirectory,
    setEditingPath,
    onFileSelect,
  ]);

  const handleEditCancel = useCallback(() => {
    setEditingPath(null);
    setEditValue("");
    setPathValidation({ isValid: true, message: "" });
    isInitializedRef.current = false;
  }, [setEditingPath]);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleEditSubmit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleEditCancel();
      }
    },
    [handleEditSubmit, handleEditCancel],
  );

  // Memoize icon to avoid recreation
  const icon = useMemo(() => 
    node.is_directory ? (
      <ChevronRight size={16} className={`folder-icon opacity-70 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
    ) : (
      <FileText size={16} className="file-icon opacity-60" />
    ),
    [node.is_directory, isExpanded]
  );

  return (
    <div className="select-none">
      <div
        className={itemClasses}
        style={containerStyle}
        draggable={!isWorkspaceRoot && !isCurrentlyEditing}
        onClick={node.is_directory ? handleToggle : handleSelect}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => dragHandlers.handleDragStart(e, node.path, node.is_directory, node.name)}
        onDragEnd={dragHandlers.handleDragEnd}
        onDragEnter={(e) => dragHandlers.handleDragEnter(e, node.path, node.is_directory)}
        onDragLeave={dragHandlers.handleDragLeave}
        onDragOver={(e) => dragHandlers.handleDragOver(e, node.path, node.is_directory)}
        onDrop={(e) => dragHandlers.handleDrop(e, node.path, node.is_directory)}
      >

        <span className="mr-2">{icon}</span>

        {isCurrentlyEditing ? (
          <div className="flex-1">
            <input
              ref={handleInputRef}
              type="text"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                validatePath(e.target.value);
              }}
              onKeyDown={handleEditKeyDown}
              onBlur={handleEditSubmit}
              className="w-full text-sm theme-input rounded px-1 py-0.5 theme-focus-ring"
              style={{
                borderColor: !pathValidation.isValid && editValue.trim() ? "var(--theme-destructive)" : undefined,
                opacity: !pathValidation.isValid && editValue.trim() ? 0.7 : 1,
              }}
              onClick={(e) => e.stopPropagation()}
            />
            {!pathValidation.isValid && editValue.trim() && (
              <div 
                className="mt-1 text-xs px-1 py-0.5 rounded border opacity-80"
                style={{
                  backgroundColor: "var(--theme-destructive)",
                  color: "var(--theme-destructive-foreground)",
                  borderColor: "var(--theme-destructive)",
                  fontSize: "10px",
                }}
              >
                {pathValidation.message}
              </div>
            )}
          </div>
        ) : (
          <span
            className="text-sm truncate flex-1 filename"
            title={displayName}
          >
            {displayName}
          </span>
        )}
      </div>

      {node.children && node.children.length > 0 && isExpanded && (
        <div className="ml-2">
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onFileDeleted={onFileDeleted}
              selectedFile={selectedFile}
              onRefresh={onRefresh}
              isWorkspaceRoot={false}
              dragHandlers={dragHandlers}
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
          onCreateDailyNote={handleCreateDailyNote}
          onRename={!isWorkspaceRoot ? handleRename : undefined}
          onDelete={!isWorkspaceRoot ? handleDelete : undefined}
          isDirectory={node.is_directory}
          isRootDirectory={isWorkspaceRoot}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  if (
    prevProps.node.path !== nextProps.node.path ||
    prevProps.node.name !== nextProps.node.name ||
    prevProps.node.is_directory !== nextProps.node.is_directory ||
    prevProps.selectedFile !== nextProps.selectedFile ||
    prevProps.level !== nextProps.level ||
    prevProps.isWorkspaceRoot !== nextProps.isWorkspaceRoot
  ) {
    return false;
  }
  
  const prevChildren = prevProps.node.children;
  const nextChildren = nextProps.node.children;
  
  if (!prevChildren && !nextChildren) return true;
  if (!prevChildren || !nextChildren) return false;
  if (prevChildren.length !== nextChildren.length) return false;
  
  for (let i = 0; i < prevChildren.length; i++) {
    if (prevChildren[i].path !== nextChildren[i].path ||
        prevChildren[i].name !== nextChildren[i].name ||
        prevChildren[i].is_directory !== nextChildren[i].is_directory) {
      return false;
    }
  }
  
  return true;
});

interface FileTreeProps {
  fileTree: FileNode;
  onFileSelect: (path: string) => void;
  onFileDeleted: (deletedPath: string) => void;
  selectedFile: string | null;
  className?: string;
}

export const FileTree = memo(function FileTree({
  fileTree,
  onFileSelect,
  onFileDeleted,
  selectedFile,
  className = "",
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const { createDirectory, createFile } = useFileOperations();
  const { setEditingPath } = useEditingStore();
  const { refreshFileTree } = useDirectoryStore();
  const dragHandlers = useDragAndDrop(onFileSelect);

  const handleRefresh = useCallback(() => {
    refreshFileTree(); // Force refresh when manually triggered
  }, [refreshFileTree]);

  const handleEmptyAreaContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest(".file-tree-item");
    const isExplorerLabel = target.closest(".explorer-label");

    if (!isFileTreeItem && !isExplorerLabel) {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleEmptyAreaDragOver = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest(".file-tree-item");
    
    if (!isFileTreeItem && dragHandlers.draggedItem) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      dragHandlers.handleDragOver(e, fileTree.path, true);
    }
  }, [dragHandlers, fileTree.path]);

  const handleEmptyAreaDrop = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest(".file-tree-item");
    
    if (!isFileTreeItem && dragHandlers.draggedItem) {
      e.preventDefault();
      dragHandlers.handleDrop(e, fileTree.path, true);
    }
  }, [dragHandlers, fileTree.path]);

  const handleEmptyAreaDragEnter = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest(".file-tree-item");
    
    if (!isFileTreeItem && dragHandlers.draggedItem) {
      e.preventDefault();
      dragHandlers.handleDragEnter(e, fileTree.path, true);
    }
  }, [dragHandlers, fileTree.path]);

  const handleEmptyAreaDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    const isFileTreeItem = target.closest(".file-tree-item");
    
    if (!isFileTreeItem && dragHandlers.draggedItem) {
      e.preventDefault();
      dragHandlers.handleDragLeave(e);
    }
  }, [dragHandlers]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    const newPath = await createDirectory(fileTree.path);
    if (newPath) {
      setTimeout(() => setEditingPath(newPath), 50);
    }
    closeContextMenu();
  }, [createDirectory, fileTree.path, setEditingPath, closeContextMenu]);

  const handleCreateFile = useCallback(async () => {
    const newPath = await createFile(fileTree.path);
    if (newPath) {
      setTimeout(() => setEditingPath(newPath), 50);
    }
    closeContextMenu();
  }, [createFile, fileTree.path, setEditingPath, closeContextMenu]);

  const handleCreateDailyNote = useCallback(async () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dailyNoteName = `${dateStr}`;
    
    const newPath = await createFile(fileTree.path, dailyNoteName);
    if (newPath) {
      onFileSelect(newPath);
    }
    closeContextMenu();
  }, [createFile, fileTree.path, onFileSelect, closeContextMenu]);

  const workspaceDropClasses = useMemo(() => {
    const baseClasses = `h-full overflow-auto theme-scrollbar rounded-lg ${className}`;
    const dragOverClass = dragHandlers.isDraggedOver(fileTree.path) ? "workspace-drag-over" : "";
    return `${baseClasses} ${dragOverClass}`.trim();
  }, [className, dragHandlers, fileTree.path]);

  return (
    <div
      className={workspaceDropClasses}
      onContextMenu={handleEmptyAreaContextMenu}
      onDragOver={handleEmptyAreaDragOver}
      onDrop={handleEmptyAreaDrop}
      onDragEnter={handleEmptyAreaDragEnter}
      onDragLeave={handleEmptyAreaDragLeave}
    >
      <div className="p-2 pb-20">
        <div className="explorer-label text-xs font-medium uppercase tracking-wide mb-2 px-2 opacity-70">
          Explorer
        </div>
        {!fileTree.children ? (
          <FileTreeItem
            key={fileTree.path}
            node={fileTree}
            level={0}
            onFileSelect={onFileSelect}
            onFileDeleted={onFileDeleted}
            selectedFile={selectedFile}
            onRefresh={handleRefresh}
            isWorkspaceRoot={true}
            dragHandlers={dragHandlers}
          />
        ) : (
          fileTree.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={0}
              onFileSelect={onFileSelect}
              onFileDeleted={onFileDeleted}
              selectedFile={selectedFile}
              onRefresh={handleRefresh}
              isWorkspaceRoot={false}
              dragHandlers={dragHandlers}
            />
          ))
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onCreateDailyNote={handleCreateDailyNote}
          isDirectory={true}
          isRootDirectory={true}
        />
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  if (
    prevProps.selectedFile !== nextProps.selectedFile ||
    prevProps.className !== nextProps.className ||
    prevProps.fileTree.path !== nextProps.fileTree.path ||
    prevProps.fileTree.name !== nextProps.fileTree.name
  ) {
    return false;
  }
  
  const prevChildren = prevProps.fileTree.children;
  const nextChildren = nextProps.fileTree.children;
  
  if (!prevChildren && !nextChildren) return true;
  if (!prevChildren || !nextChildren) return false;
  if (prevChildren.length !== nextChildren.length) return false;
  
  for (let i = 0; i < Math.min(prevChildren.length, 50); i++) {
    if (prevChildren[i].path !== nextChildren[i].path ||
        prevChildren[i].name !== nextChildren[i].name) {
      return false;
    }
  }
  
  return true;
});
