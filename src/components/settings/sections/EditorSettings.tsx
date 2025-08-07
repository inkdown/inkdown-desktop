import { useAppearance } from '../../../contexts/AppearanceContext';

export function EditorSettings() {
  const { vimMode, showLineNumbers, highlightCurrentLine, readOnly, updateWorkspace, isLoading, currentTheme } = useAppearance();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8" style={{ color: currentTheme.mutedForeground }}>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-4" style={{ borderColor: currentTheme.primary }}></div>
          <p className="text-xs">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const handleToggle = (key: 'vimMode' | 'showLineNumbers' | 'highlightCurrentLine' | 'readOnly', value: boolean) => {
    updateWorkspace({ [key]: value });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: currentTheme.foreground }}>
          Editor
        </h3>
        <p className="text-xs mb-4" style={{ color: currentTheme.mutedForeground }}>
          Configure o comportamento e aparência do editor de texto
        </p>
      </div>

      <div 
        className="rounded-md border overflow-hidden"
        style={{ 
          borderColor: currentTheme.border,
          backgroundColor: currentTheme.background 
        }}
      >
        {/* Vim Mode */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: `1px solid ${currentTheme.border}` }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: currentTheme.foreground }}>
              Modo Vim
            </div>
            <div className="text-xs leading-tight" style={{ color: currentTheme.mutedForeground }}>
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
                backgroundColor: vimMode ? currentTheme.primary : currentTheme.muted,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: vimMode ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: currentTheme.background
                }}
              />
            </div>
          </label>
        </div>

        {/* Show Line Numbers */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: `1px solid ${currentTheme.border}` }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: currentTheme.foreground }}>
              Números de Linha
            </div>
            <div className="text-xs leading-tight" style={{ color: currentTheme.mutedForeground }}>
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
                backgroundColor: showLineNumbers ? currentTheme.primary : currentTheme.muted,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: showLineNumbers ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: currentTheme.background
                }}
              />
            </div>
          </label>
        </div>

        {/* Highlight Current Line */}
        <div 
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: `1px solid ${currentTheme.border}` }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: currentTheme.foreground }}>
              Destacar Linha Atual
            </div>
            <div className="text-xs leading-tight" style={{ color: currentTheme.mutedForeground }}>
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
                backgroundColor: highlightCurrentLine ? currentTheme.primary : currentTheme.muted,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: highlightCurrentLine ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: currentTheme.background
                }}
              />
            </div>
          </label>
        </div>

        {/* Read Only */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <div>
            <div className="text-xs font-medium" style={{ color: currentTheme.foreground }}>
              Modo Somente Leitura
            </div>
            <div className="text-xs leading-tight" style={{ color: currentTheme.mutedForeground }}>
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
                backgroundColor: readOnly ? currentTheme.primary : currentTheme.muted,
                border: `1px solid ${currentTheme.border}`,
              }}
            >
              <div 
                className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
                style={{
                  transform: readOnly ? 'translateX(16px)' : 'translateX(0)',
                  backgroundColor: currentTheme.background
                }}
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}