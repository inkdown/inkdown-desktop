import React from 'react';

interface EditorToolbarProps {
  onSave?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onSave }) => {
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-gray-50">
      <div className="flex-1" />
      {onSave && (
        <button
          onClick={onSave}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          title="Save (Ctrl+S)"
        >
          Save
        </button>
      )}
    </div>
  );
};