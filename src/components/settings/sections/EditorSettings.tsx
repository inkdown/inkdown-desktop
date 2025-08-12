import { useAppearance } from '../../../contexts/AppearanceContext';

export function EditorSettings() {
  const { vimMode, showLineNumbers, highlightCurrentLine, readOnly, githubMarkdown, updateWorkspace, isLoading } = useAppearance();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--text-accent)' }}></div>
          <p className="text-xs">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const handleToggle = (key: 'vimMode' | 'showLineNumbers' | 'highlightCurrentLine' | 'readOnly' | 'githubMarkdown', value: boolean) => {
    updateWorkspace({ [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Editor
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Configure o comportamento e aparência do editor de texto
        </p>
      </div>

      <div 
        className="rounded-md border overflow-hidden"
        style={{ 
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-background)' 
        }}
      >
        {/* Vim Mode */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Modo Vim
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Habilita atalhos e navegação no estilo Vim
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={vimMode}
              onChange={(e) => handleToggle('vimMode', e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
              style={{
                backgroundColor: vimMode ? 'var(--text-accent)' : 'var(--theme-muted)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: vimMode ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: 'var(--theme-background)'
                }}
              />
            </div>
          </label>
        </div>

        {/* Show Line Numbers */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Números de Linha
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Mostra números de linha no editor
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => handleToggle('showLineNumbers', e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
              style={{
                backgroundColor: showLineNumbers ? 'var(--text-accent)' : 'var(--theme-muted)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: showLineNumbers ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: 'var(--theme-background)'
                }}
              />
            </div>
          </label>
        </div>

        {/* Highlight Current Line */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Destacar Linha Atual
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Destaca a linha onde está o cursor
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={highlightCurrentLine}
              onChange={(e) => handleToggle('highlightCurrentLine', e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
              style={{
                backgroundColor: highlightCurrentLine ? 'var(--text-accent)' : 'var(--theme-muted)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: highlightCurrentLine ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: 'var(--theme-background)'
                }}
              />
            </div>
          </label>
        </div>

        {/* Read Only */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid var(--theme-border)' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              Modo Somente Leitura
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Impede edição de arquivos
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={readOnly}
              onChange={(e) => handleToggle('readOnly', e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
              style={{
                backgroundColor: readOnly ? 'var(--text-accent)' : 'var(--theme-muted)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: readOnly ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: 'var(--theme-background)'
                }}
              />
            </div>
          </label>
        </div>

        {/* GitHub Flavored Markdown */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              GitHub Flavored Markdown
            </div>
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              Habilita recursos GFM como tabelas, strikethrough e task lists
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={githubMarkdown}
              onChange={(e) => handleToggle('githubMarkdown', e.target.checked)}
              className="sr-only peer"
            />
            <div 
              className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
              style={{
                backgroundColor: githubMarkdown ? 'var(--text-accent)' : 'var(--theme-muted)',
                border: '1px solid var(--theme-border)',
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: githubMarkdown ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: 'var(--theme-background)'
                }}
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}