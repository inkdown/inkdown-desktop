import { memo } from 'react';
import { FpsIndicator } from './FpsIndicator';

interface DevToolsProps {
  isVisible?: boolean;
}

export const DevTools = memo(function DevTools({ 
  isVisible = false,
}: DevToolsProps) {
  if (!isVisible) return null;

  return (
    <div className={`fixed top-10 right-4 z-50 flex flex-col gap-2`}>
      <FpsIndicator isVisible={isVisible} />
    </div>
  );
});

export default DevTools;