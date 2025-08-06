import { memo } from 'react';
import { useAppearance } from '../../contexts/AppearanceContext';

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const SidebarResizer = memo(function SidebarResizer({ onMouseDown }: SidebarResizerProps) {
  const { currentTheme } = useAppearance();

  return (
    <div
      className="w-1 cursor-ew-resize hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: currentTheme.border,
        minHeight: '100vh'
      }}
      onMouseDown={onMouseDown}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = currentTheme.sidebar.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = currentTheme.border;
      }}
    />
  );
});