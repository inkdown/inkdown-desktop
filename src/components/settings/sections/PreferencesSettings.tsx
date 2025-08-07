import { useAppearance } from '../../../contexts/AppearanceContext';
import { useConfigManager } from '../../../hooks/useConfigManager';
import { Keyboard, Save, Sidebar, Search } from 'lucide-react';

export function PreferencesSettings() {
  const { currentTheme } = useAppearance();
  const { workspaceConfig } = useConfigManager();
  const isMac = /Mac/.test(navigator.platform);

  const shortcutDescriptions = {
    toggleSidebar: {
      icon: Sidebar,
      title: 'Toggle Sidebar',
      description: 'Mostra/oculta a barra lateral com a árvore de arquivos'
    },
    save: {
      icon: Save,
      title: 'Salvar Arquivo',
      description: 'Salva o arquivo atual que está sendo editado'
    },
    openNotePalette: {
      icon: Search,
      title: 'Paleta de Notas',
      description: 'Abre a paleta de busca rápida de notas'
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: currentTheme.foreground }}>
          Preferências
        </h3>
        <p className="text-xs mb-4" style={{ color: currentTheme.mutedForeground }}>
          Configurações gerais da aplicação
        </p>
      </div>

      <div className="space-y-4">
        {/* Seção de Shortcuts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Keyboard size={14} style={{ color: currentTheme.primary }} />
            <h4 className="text-sm font-medium" style={{ color: currentTheme.foreground }}>
              Atalhos do Teclado
            </h4>
          </div>
          
          <div 
            className="rounded-md border space-y-0 overflow-hidden"
            style={{ 
              borderColor: currentTheme.border,
              backgroundColor: currentTheme.background 
            }}
          >
            {workspaceConfig.shortcuts?.map((shortcut, index) => {
              const info = shortcutDescriptions[shortcut.name as keyof typeof shortcutDescriptions];
              if (!info) return null;
              
              const Icon = info.icon;
              const isLast = index === workspaceConfig.shortcuts!.length - 1;
              
              return (
                <div 
                  key={shortcut.name} 
                  className="flex items-center justify-between px-3 py-2.5"
                  style={{ 
                    borderBottom: !isLast ? `1px solid ${currentTheme.border}` : 'none'
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={14} style={{ color: currentTheme.mutedForeground }} />
                    <div>
                      <div className="text-xs font-medium" style={{ color: currentTheme.foreground }}>
                        {info.title}
                      </div>
                      <div className="text-xs leading-tight" style={{ color: currentTheme.mutedForeground }}>
                        {info.description}
                      </div>
                    </div>
                  </div>
                  <div 
                    className="px-2 py-1 rounded text-xs font-mono"
                    style={{ 
                      backgroundColor: currentTheme.muted,
                      color: currentTheme.foreground,
                      border: `1px solid ${currentTheme.border}`
                    }}
                  >
                    {isMac 
                      ? shortcut.shortcut.replace('Ctrl', '⌘').replace('+', '')
                      : shortcut.shortcut.replace('+', '')
                    }
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="text-xs mt-2 opacity-70" style={{ color: currentTheme.mutedForeground }}>
            {isMac ? 'Use ⌘ para os atalhos' : 'Use Ctrl para os atalhos'}
          </div>
        </div>
      </div>
    </div>
  );
}