import { useConfigManager } from '../../../hooks/useConfigManager';
import { Keyboard, Save, Sidebar, Search, Settings, Bold, Italic, Strikethrough, Code, Link, Table, Hash } from 'lucide-react';

export function PreferencesSettings() {
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
    },
    openSettings: {
      icon: Settings,
      title: 'Abrir Configurações',
      description: 'Abre o modal de configurações'
    },
    markdownBold: {
      icon: Bold,
      title: 'Negrito',
      description: 'Aplica formatação em negrito (**texto**)'
    },
    markdownItalic: {
      icon: Italic,
      title: 'Itálico',
      description: 'Aplica formatação em itálico (*texto*)'
    },
    markdownStrikethrough: {
      icon: Strikethrough,
      title: 'Riscado',
      description: 'Aplica texto riscado (~~texto~~)'
    },
    markdownCode: {
      icon: Code,
      title: 'Código Inline',
      description: 'Cria código inline (`código`)'
    },
    markdownLink: {
      icon: Link,
      title: 'Link',
      description: 'Insere um link ([texto](url))'
    },
    markdownTable: {
      icon: Table,
      title: 'Tabela',
      description: 'Insere uma tabela 3x2 em markdown'
    },
    markdownHeading1: {
      icon: Hash,
      title: 'Título H1',
      description: 'Cria título de nível 1 (# título)'
    },
    markdownHeading2: {
      icon: Hash,
      title: 'Título H2',
      description: 'Cria título de nível 2 (## título)'
    },
    markdownHeading3: {
      icon: Hash,
      title: 'Título H3',
      description: 'Cria título de nível 3 (### título)'
    },
    markdownHeading4: {
      icon: Hash,
      title: 'Título H4',
      description: 'Cria título de nível 4 (#### título)'
    },
    markdownHeading5: {
      icon: Hash,
      title: 'Título H5',
      description: 'Cria título de nível 5 (##### título)'
    },
    markdownHeading6: {
      icon: Hash,
      title: 'Título H6',
      description: 'Cria título de nível 6 (###### título)'
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Preferências
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Configurações gerais da aplicação
        </p>
      </div>

      <div className="space-y-6">
        {/* Seção de Shortcuts */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Keyboard size={14} style={{ color: 'var(--text-accent)' }} />
            <h4 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Atalhos do Teclado
            </h4>
          </div>
          
          {/* Shortcuts da App */}
          <div className="mb-4">
            <div className="text-xs font-medium mb-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
              APLICAÇÃO
            </div>
            <div 
              className="rounded-md border space-y-0 overflow-hidden"
              style={{ 
                borderColor: 'var(--input-border)',
                backgroundColor: 'var(--theme-background)' 
              }}
            >
              {workspaceConfig.shortcuts?.filter(shortcut => 
                ['toggleSidebar', 'save', 'openNotePalette', 'openSettings'].includes(shortcut.name)
              ).map((shortcut, index, filteredArray) => {
                const info = shortcutDescriptions[shortcut.name as keyof typeof shortcutDescriptions];
                if (!info) return null;
                
                const Icon = info.icon;
                const isLast = index === filteredArray.length - 1;
                
                return (
                  <div 
                    key={shortcut.name} 
                    className="flex items-center justify-between px-3 py-2.5"
                    style={{ 
                      borderBottom: !isLast ? `1px solid ${'var(--input-border)'}` : 'none'
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {info.title}
                        </div>
                        <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
                          {info.description}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="px-2 py-1 rounded text-xs font-mono"
                      style={{ 
                        backgroundColor: 'var(--input-background)',
                        color: 'var(--text-primary)',
                        border: `1px solid ${'var(--input-border)'}`
                      }}
                    >
                      {isMac 
                        ? shortcut.shortcut.replace('Ctrl', '⌘').replace(/\+/g, '').replace('Shift', '⇧')
                        : shortcut.shortcut.replace(/\+/g, ' ')
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shortcuts do Markdown */}
          <div>
            <div className="text-xs font-medium mb-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
              FORMATAÇÃO MARKDOWN
            </div>
            <div 
              className="rounded-md border space-y-0 overflow-hidden"
              style={{ 
                borderColor: 'var(--input-border)',
                backgroundColor: 'var(--theme-background)' 
              }}
            >
              {workspaceConfig.shortcuts?.filter(shortcut => 
                shortcut.name.startsWith('markdown')
              ).map((shortcut, index, filteredArray) => {
                const info = shortcutDescriptions[shortcut.name as keyof typeof shortcutDescriptions];
                if (!info) return null;
                
                const Icon = info.icon;
                const isLast = index === filteredArray.length - 1;
                
                return (
                  <div 
                    key={shortcut.name} 
                    className="flex items-center justify-between px-3 py-2.5"
                    style={{ 
                      borderBottom: !isLast ? `1px solid ${'var(--input-border)'}` : 'none'
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon size={14} style={{ color: 'var(--text-secondary)' }} />
                      <div>
                        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {info.title}
                        </div>
                        <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
                          {info.description}
                        </div>
                      </div>
                    </div>
                    <div 
                      className="px-2 py-1 rounded text-xs font-mono"
                      style={{ 
                        backgroundColor: 'var(--input-background)',
                        color: 'var(--text-primary)',
                        border: `1px solid ${'var(--input-border)'}`
                      }}
                    >
                      {isMac 
                        ? shortcut.shortcut.replace('Ctrl', '⌘').replace(/\+/g, '').replace('Shift', '⇧')
                        : shortcut.shortcut.replace(/\+/g, ' ')
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="text-xs mt-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
            {isMac ? 'Use ⌘ para os atalhos' : 'Use Ctrl para os atalhos'}
          </div>
        </div>
      </div>
    </div>
  );
}