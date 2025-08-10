import { useState, useCallback, useRef, memo, useMemo } from "react";
import { Folder, FolderOpen, FileText } from "lucide-react";
import { confirm } from "@tauri-apps/plugin-dialog";
import { FileNode, useDirectory } from "../../contexts/DirectoryContext";
import { ContextMenu } from "../ui/overlays/ContextMenu";
import { useFileOperations } from "../../hooks/useFileOperations";
import { useEditing } from "../../contexts/EditingContext";

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
  onRefresh: () => void;
  isWorkspaceRoot?: boolean;
  isNewlyCreated?: boolean;
}

const FileTreeItem = memo(function FileTreeItem({
  node,
  level,
  onFileSelect,
  selectedFile,
  onRefresh,
  isWorkspaceRoot = false,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    createDirectory,
    createFile,
    deleteFileOrDirectory,
    renameFileOrDirectory,
  } = useFileOperations();
  const { setEditingPath, isEditing } = useEditing();

  const isSelected = selectedFile === node.path;
  const isRootDirectory = isWorkspaceRoot;
  const isCurrentlyEditing = isEditing(node.path);

  const displayName = node.is_directory
    ? node.name
    : node.name.replace(/\.md$/, "");

  const containerStyle = {
    paddingLeft: `${level * 14 + 8}px`,
  };

  const itemClasses = `file-tree-item flex items-center py-1 px-2 cursor-pointer rounded text-sm theme-transition ${isSelected ? "selected" : ""} ${node.is_directory ? "directory" : "file"}`;

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

  const handleCreateDailyNote = useCallback(async () => {
    if (!isExpanded) setIsExpanded(true);
    
    // Generate daily note name with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const dailyNoteName = `${dateStr}`;
    
    const newPath = await createFile(node.path, dailyNoteName);
    if (newPath) {
      // Auto-open the daily note
      onFileSelect(newPath);
    }
  }, [createFile, node.path, isExpanded, onFileSelect]);

  const handleRename = useCallback(() => {
    const nameWithoutExt = node.is_directory
      ? node.name
      : node.name.replace(/\.md$/, "");
    setEditValue(nameWithoutExt);
    setEditingPath(node.path);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [node.name, node.is_directory, node.path, setEditingPath]);

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
        await deleteFileOrDirectory(node.path);
      }
    } catch (error) {
      console.error("Erro ao confirmar exclusão:", error);
    }
  }, [node.name, node.path, deleteFileOrDirectory]);

  const handleEditSubmit = useCallback(async () => {
    if (editValue.trim()) {
      const oldPath = node.path;
      const newPath = await renameFileOrDirectory(oldPath, editValue.trim());
      if (newPath && !node.is_directory) {
        // Auto-select the renamed file if it's not a directory
        requestAnimationFrame(() => onFileSelect(newPath));
      }
    }
    setEditingPath(null);
    setEditValue("");
    // Clear initialization flag
    if (inputRef.current) {
      delete inputRef.current.dataset.initialized;
    }
  }, [
    editValue,
    node.path,
    node.is_directory,
    renameFileOrDirectory,
    setEditingPath,
    onFileSelect,
  ]);

  const handleEditCancel = useCallback(() => {
    setEditingPath(null);
    setEditValue("");
    // Clear initialization flag
    if (inputRef.current) {
      delete inputRef.current.dataset.initialized;
    }
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

  const icon = node.is_directory ? (
    isExpanded ? (
      <FolderOpen size={16} className="folder-icon opacity-70" />
    ) : (
      <Folder size={16} className="folder-icon opacity-70" />
    )
  ) : (
    <FileText size={16} className="file-icon opacity-60" />
  );

  return (
    <div className="select-none">
      <div
        className={itemClasses}
        style={containerStyle}
        onClick={node.is_directory ? handleToggle : handleSelect}
        onContextMenu={handleContextMenu}
      >

        <span className="mr-2">{icon}</span>

        {isCurrentlyEditing ? (
          <input
            ref={(el) => {
              if (el && !editValue && !el.dataset.initialized) {
                // Initialize value and focus when input is first rendered
                const nameWithoutExt = node.is_directory
                  ? node.name
                  : node.name.replace(/\.md$/, "");
                setEditValue(nameWithoutExt);
                el.dataset.initialized = "true";
                requestAnimationFrame(() => {
                  el.focus();
                  el.select();
                });
              }
            }}
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
            className={`text-sm truncate flex-1 filename ${isSelected ? "font-medium" : "font-normal"}`}
            title={displayName}
            ref={() => {
              // Clear edit value when not editing to ensure fresh state next time
              if (editValue && !isCurrentlyEditing) {
                setEditValue("");
              }
            }}
          >
            {displayName}
          </span>
        )}
      </div>

      {node.children && node.children.length > 0 && isExpanded && (
        <div className="ml-2">
          {node.children!.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onRefresh={onRefresh}
              isWorkspaceRoot={false}
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

export const FileTree = memo(function FileTree({
  fileTree,
  onFileSelect,
  selectedFile,
  className = "",
}: FileTreeProps) {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const { createDirectory, createFile } = useFileOperations();
  const { setEditingPath } = useEditing();
  const { refreshFileTree } = useDirectory();

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

  return (
    <div
      className={`h-full overflow-auto theme-scrollbar ${className}`}
      onContextMenu={handleEmptyAreaContextMenu}
    >
      <div className="p-2 pb-20">
        <div className="explorer-label text-xs font-medium uppercase tracking-wide mb-2 px-2 opacity-70">
          Explorer
        </div>
        {useMemo(() => {
          if (!fileTree.children) {
            return (
              <FileTreeItem
                key={fileTree.path}
                node={fileTree}
                level={0}
                onFileSelect={onFileSelect}
                selectedFile={selectedFile}
                onRefresh={handleRefresh}
                isWorkspaceRoot={true}
              />
            );
          }

          return fileTree.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={0}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
              onRefresh={handleRefresh}
              isWorkspaceRoot={false}
            />
          ));
        }, [fileTree, onFileSelect, selectedFile, handleRefresh])}
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
});
