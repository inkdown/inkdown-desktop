import { memo } from 'react';
import { Settings, PanelLeftOpen } from 'lucide-react';

interface MiniSidebarProps {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export const MiniSidebar = memo(function MiniSidebar({
  onOpenSettings,
  onToggleSidebar,
}: MiniSidebarProps) {
  return (
    <div 
      className="fixed left-0 top-0 h-screen w-12 flex flex-col z-40 animate-fade-in"
      style={{ 
        backgroundColor: 'var(--theme-sidebar-background)',
        borderRight: '1px solid var(--theme-border)',
        animation: 'fadeIn 0.3s ease-in-out',
      }}
    >
      <div className="flex flex-col gap-2 px-2 py-3 pt-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded transition-colors group"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Mostrar barra lateral"
        >
          <PanelLeftOpen
            size={16} 
            className="opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--theme-foreground)' }}
          />
        </button>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded transition-colors group"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Configurações"
        >
          <Settings 
            size={16} 
            className="opacity-60 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--theme-foreground)' }}
          />
        </button>
      </div>
    </div>
  );
});