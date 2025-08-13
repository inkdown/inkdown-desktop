import {
  Keyboard,
  Save,
  Sidebar,
  Search,
  Settings,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link,
  Table,
  Hash,
  CheckSquare
} from 'lucide-react';

export function ShortcutsSettings() {
  const isMac = /Mac/.test(navigator.platform);

  const appShortcuts = [
    { name: 'toggleSidebar', shortcut: 'Ctrl+Shift+B', icon: Sidebar, title: 'Toggle Sidebar', description: 'Mostra/oculta a barra lateral com a árvore de arquivos' },
    { name: 'save', shortcut: 'Ctrl+S', icon: Save, title: 'Salvar Arquivo', description: 'Salva o arquivo atual que está sendo editado' },
    { name: 'openNotePalette', shortcut: 'Ctrl+O', icon: Search, title: 'Paleta de Notas', description: 'Abre a paleta de busca rápida de notas' },
    { name: 'openSettings', shortcut: 'Ctrl+P', icon: Settings, title: 'Abrir Configurações', description: 'Abre o modal de configurações' },
  ];

  const markdownShortcuts = [
    { name: 'markdownBold', shortcut: 'Ctrl+B', icon: Bold, title: 'Negrito', description: 'Aplica formatação em negrito (**texto**)' },
    { name: 'markdownItalic', shortcut: 'Ctrl+I', icon: Italic, title: 'Itálico', description: 'Aplica formatação em itálico (*texto*)' },
    { name: 'markdownStrikethrough', shortcut: 'Ctrl+Shift+S', icon: Strikethrough, title: 'Riscado', description: 'Aplica texto riscado (~~texto~~)' },
    { name: 'markdownCode', shortcut: 'Ctrl+Shift+C', icon: Code, title: 'Bloco de Código', description: 'Cria bloco de código (```código```)' },
    { name: 'markdownLink', shortcut: 'Ctrl+K', icon: Link, title: 'Link', description: 'Insere um link ([texto](url))' },
    { name: 'markdownTable', shortcut: 'Ctrl+Shift+T', icon: Table, title: 'Tabela', description: 'Insere uma tabela 3x2 em markdown' },
    { name: 'markdownHeading1', shortcut: 'Ctrl+1', icon: Hash, title: 'Título H1', description: 'Cria título de nível 1 (# título)' },
    { name: 'markdownHeading2', shortcut: 'Ctrl+2', icon: Hash, title: 'Título H2', description: 'Cria título de nível 2 (## título)' },
    { name: 'markdownHeading3', shortcut: 'Ctrl+3', icon: Hash, title: 'Título H3', description: 'Cria título de nível 3 (### título)' },
    { name: 'markdownHeading4', shortcut: 'Ctrl+4', icon: Hash, title: 'Título H4', description: 'Cria título de nível 4 (#### título)' },
    { name: 'markdownHeading5', shortcut: 'Ctrl+5', icon: Hash, title: 'Título H5', description: 'Cria título de nível 5 (##### título)' },
    { name: 'markdownHeading6', shortcut: 'Ctrl+6', icon: Hash, title: 'Título H6', description: 'Cria título de nível 6 (###### título)' },
    { name: 'markdownCheckboxList', shortcut: 'Ctrl+L', icon: CheckSquare, title: 'Lista Checkbox', description: 'Insere uma lista de checkbox GFM (- [ ] item)' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Atalhos
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Atalhos de teclado disponíveis no editor
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
            <div className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
              {isMac ? 'Use ⌘ para os atalhos' : 'Use Ctrl para os atalhos'}
            </div>
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
              {appShortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                const isLast = index === appShortcuts.length - 1;

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
                          {shortcut.title}
                        </div>
                        <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
                          {shortcut.description}
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
              {markdownShortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                const isLast = index === markdownShortcuts.length - 1;

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
                          {shortcut.title}
                        </div>
                        <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
                          {shortcut.description}
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
        </div>
      </div>
    </div>
  );
}