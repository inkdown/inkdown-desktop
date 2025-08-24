import { memo, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { SimpleTabBar } from '../tabs/SimpleTabBar';

interface TitleBarProps {
  sidebarWidth?: number;
  sidebarVisible?: boolean;
  onNewTab?: () => void;
}

export const TitleBar = memo(function TitleBar({ 
  sidebarWidth = 0, 
  sidebarVisible = true,
  onNewTab
}: TitleBarProps) {
  useEffect(() => {
    const appWindow = getCurrentWindow();

    const minimizeBtn = document.getElementById('titlebar-minimize');
    const maximizeBtn = document.getElementById('titlebar-maximize');
    const closeBtn = document.getElementById('titlebar-close');

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close();

    minimizeBtn?.addEventListener('click', handleMinimize);
    maximizeBtn?.addEventListener('click', handleMaximize);
    closeBtn?.addEventListener('click', handleClose);

    return () => {
      minimizeBtn?.removeEventListener('click', handleMinimize);
      maximizeBtn?.removeEventListener('click', handleMaximize);
      closeBtn?.removeEventListener('click', handleClose);
    };
  }, []);

  const titleBarStyle = {
    left: sidebarVisible ? `${sidebarWidth}px` : '0',
    width: sidebarVisible ? `calc(100% - ${sidebarWidth}px)` : '100%',
  };

  return (
    <div className="titlebar-container" style={titleBarStyle}>
      {/* Drag area - positioned behind tabs */}
      <div className="titlebar-drag-area" data-tauri-drag-region></div>
      
      {/* Tab Bar - takes up available space */}
      <div className="titlebar-tabs">
        <SimpleTabBar onNewTab={onNewTab} />
      </div>
      
      {/* Window Controls */}
      <div className="titlebar-controls">
        <button 
          id="titlebar-minimize" 
          className="titlebar-button titlebar-minimize"
          title="Minimizar"
        >
          <Minus size={16} />
        </button>
        <button 
          id="titlebar-maximize" 
          className="titlebar-button titlebar-maximize"
          title="Maximizar"
        >
          <Square size={14} />
        </button>
        <button 
          id="titlebar-close" 
          className="titlebar-button titlebar-close"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
});