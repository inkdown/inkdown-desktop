import { memo } from 'react';

export const EditorToolbar = memo(function EditorToolbar() {
  return (
    <div 
      className="px-4 ml-[7vw] flex items-center gap-2 h-8"
      style={{ 
        backgroundColor: 'var(--inkdown-editor-bg)'
      }}
    >
      <div className="flex-1" />
    </div>
  );
});