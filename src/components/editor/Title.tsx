import React, { useState, useRef, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useDirectory } from '../../contexts/DirectoryContext';
import { useAppearance } from '../../contexts/AppearanceContext';

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
  const { currentTheme } = useAppearance();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const originalTitle = useRef('');
  const currentFilePath = useRef('');

  const extractTitle = useCallback((path: string) => {
    // Remove windows and unix separator stuff from the title. 
    const normalizedPath = path.replace(/\\/g, '/');
    const filename = normalizedPath.split('/').pop() || '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
  }, []);

  useEffect(() => {
    const extractedTitle = extractTitle(filePath);
    setTitle(extractedTitle);
    originalTitle.current = extractedTitle;
    currentFilePath.current = filePath;
  }, [filePath, extractTitle]);

  const handleClick = useCallback(() => {
    if (!isEditing) {
      setIsEditing(true);
      originalTitle.current = title;
      currentFilePath.current = filePath;
    }
  }, [title, isEditing, filePath]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
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
        oldPath: currentFilePath.current,
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
  }, [title, onFilePathChange, refreshFileTree]);

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

  return (
    <input
      ref={inputRef}
      type="text"
      value={title}
      readOnly={!isEditing}
      onChange={handleInputChange}
      onKeyDown={handleKeyDown}
      onBlur={isEditing ? handleBlur : undefined}
      onClick={handleClick}
      className={`editable-title ${className}`}
      title={isEditing ? undefined : "Click to edit"}
      style={{
        background: 'transparent',
        border: 'none',
        margin: 0,
        padding: '4px 8px',
        borderRadius: '4px',
        outline: 'none',
        cursor: isEditing ? 'text' : 'pointer',
        fontSize: '1.5rem',
        fontWeight: 'bold',
        lineHeight: '2rem',
        color: currentTheme.primary,
        width: '100%',
        minWidth: '200px',
        transition: isEditing ? 'none' : 'background-color 0.2s',
        fontFamily: 'inherit',
        opacity: 1,
        ...(isEditing && {
          cursor: 'text',
        }),
        ...(!isEditing && {
          cursor: 'pointer',
          pointerEvents: 'auto',
        }),
      }}
      onMouseEnter={!isEditing ? (e) => {
        e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
      } : undefined}
      onMouseLeave={!isEditing ? (e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      } : undefined}
    />
  );
};