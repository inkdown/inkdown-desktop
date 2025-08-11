import { memo, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar = memo(function TitleBar() {
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

  return (
    <div className="titlebar">
      <div data-tauri-drag-region className="titlebar-drag-region">
        <span className="titlebar-title">inkdown</span>
      </div>
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