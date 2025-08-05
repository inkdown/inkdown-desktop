import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDirectory } from '../../contexts/DirectoryContext';

interface EditableTitleProps {
  filePath: string;
  onFilePathChange?: (newPath: string) => void;
  className?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({ 
  filePath, 
  onFilePathChange,
  className = '' 
}) => {
  const { refreshFileTree } = useDirectory();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const originalTitle = useRef('');

  // Extract filename without extension
  const extractTitle = useCallback((path: string) => {
    const filename = path.split('/').pop() || path.split('\\').pop() || '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  }, []);

  // Update title when filePath changes
  useEffect(() => {
    const extractedTitle = extractTitle(filePath);
    setTitle(extractedTitle);
    originalTitle.current = extractedTitle;
  }, [filePath, extractTitle]);

  // Handle double click to edit
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    originalTitle.current = title;
  }, [title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    
    // If empty or same as original, cancel
    if (!trimmedTitle || trimmedTitle === originalTitle.current) {
      setTitle(originalTitle.current);
      setIsEditing(false);
      return;
    }

    try {
      // Call Rust command to rename file
      const newPath = await invoke<string>('rename_file', {
        oldPath: filePath,
        newName: trimmedTitle
      });

      // Update the title and notify parent component if needed
      setTitle(trimmedTitle);
      onFilePathChange?.(newPath);
      setIsEditing(false);

      // Refresh file tree to reflect changes
      await refreshFileTree();

    } catch (error) {
      console.error('Failed to rename file:', error);
      // Revert to original title on error
      setTitle(originalTitle.current);
      setIsEditing(false);
      
      // Show error to user
      alert(`Failed to rename file: ${error}`);
    }
  }, [title, filePath, onFilePathChange, refreshFileTree]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setTitle(originalTitle.current);
    setIsEditing(false);
  }, []);

  // Handle key events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  // Handle blur (when input loses focus)
  const handleBlur = useCallback(() => {
    handleSave();
  }, [handleSave]);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`editable-title-input ${className}`}
        style={{
          background: 'transparent',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '4px 8px',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          fontFamily: 'inherit',
          outline: 'none',
          minWidth: '200px',
        }}
      />
    );
  }

  return (
    <h1
      onDoubleClick={handleDoubleClick}
      className={`editable-title ${className}`}
      style={{
        cursor: 'pointer',
        margin: 0,
        padding: '4px 8px',
        borderRadius: '4px',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title="Double-click to edit"
    >
      {title}
    </h1>
  );
};