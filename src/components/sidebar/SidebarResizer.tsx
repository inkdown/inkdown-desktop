import { memo } from 'react';

interface SidebarResizerProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

export const SidebarResizer = memo(function SidebarResizer({ onMouseDown }: SidebarResizerProps) {
  return (
    <div
      className="w-1 bg-gray-200 hover:bg-gray-300 cursor-ew-resize transition-colors"
      onMouseDown={onMouseDown}
    />
  );
});