import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDirectory } from '../../contexts/DirectoryContext';

interface TitleProps {
  filePath: string;
  onFilePathChange?: (newPath: string) => void;
  className?: string;
}

export const Title: React.FC<TitleProps> = ({ 
  filePath, 
  onFilePathChange,
  className = '' 
}) => {
  const { refreshFileTree } = useDirectory();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const originalTitle = useRef('');

  const extractTitle = useCallback((path: string) => {
    const filename = path.split('/').pop() || path.split('\\').pop() || '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  }, []);

  useEffect(() => {
    const extractedTitle = extractTitle(filePath);
    setTitle(extractedTitle);
    originalTitle.current = extractedTitle;
  }, [filePath, extractTitle]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    originalTitle.current = title;
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleSave = useCallback(async () => {
    const trimmedTitle = title.trim();
    
    if (!trimmedTitle || trimmedTitle === originalTitle.current) {
      setTitle(originalTitle.current);
      setIsEditing(false);
      return;
    }

    try {
      const newPath = await invoke<string>('rename_file', {
        oldPath: filePath,
        newName: trimmedTitle
      });

      setTitle(trimmedTitle);
      onFilePathChange?.(newPath);
      setIsEditing(false);

      await refreshFileTree();

    } catch (error) {
      console.error('Failed to rename file:', error);
      setTitle(originalTitle.current);
      setIsEditing(false);
      alert(`Failed to rename file: ${error}`);
    }
  }, [title, filePath, onFilePathChange, refreshFileTree]);

  const handleCancel = useCallback(() => {
    setTitle(originalTitle.current);
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

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