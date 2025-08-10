import { memo } from 'react';

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const SidebarResizer = memo(function SidebarResizer({ onMouseDown }: SidebarResizerProps) {

  return (
    <div
      className="w-0 cursor-ew-resize hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: 'transparent',
        minHeight: '100vh',
        minWidth: '4px'
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--theme-sidebar-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    />
  );
});