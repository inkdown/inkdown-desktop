import { memo } from 'react';

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const SidebarResizer = memo(function SidebarResizer({ onMouseDown }: SidebarResizerProps) {

  return (
    <div
      className="w-1 cursor-ew-resize hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: 'var(--theme-sidebar-border)',
        minHeight: '100vh'
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--theme-sidebar-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--theme-sidebar-border)';
      }}
    />
  );
});