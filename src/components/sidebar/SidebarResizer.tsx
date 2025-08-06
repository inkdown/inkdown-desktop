import { memo, useCallback, useMemo } from 'react';
import { useAppearance } from '../../contexts/AppearanceContext';

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const SidebarResizer = memo(function SidebarResizer({ onMouseDown }: SidebarResizerProps) {
  const { currentTheme } = useAppearance();

  const resizerStyle = useMemo(() => ({
    backgroundColor: currentTheme.border
  }), [currentTheme.border]);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = currentTheme.sidebar.hover;
  }, [currentTheme.sidebar.hover]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.backgroundColor = currentTheme.border;
  }, [currentTheme.border]);

  return (
    <div
      className="w-1 cursor-ew-resize transition-colors"
      style={resizerStyle}
      onMouseDown={onMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    />
  );
});