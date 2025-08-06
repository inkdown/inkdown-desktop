import { useAppearance } from '../../../contexts/AppearanceContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Tema claro padrão' },
  { value: 'dark', label: 'Dark', description: 'Tema escuro padrão' },
  { value: 'auto', label: 'Auto', description: 'Segue a preferência do sistema' },
];

const FONT_FAMILIES = [
  'Inter, system-ui, sans-serif',
  'SF Mono, Monaco, Cascadia Code, Roboto Mono, Consolas, monospace',
  'JetBrains Mono, monospace',
  'Fira Code, monospace',
  'Source Code Pro, monospace',
  'Ubuntu Mono, monospace',
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28];

export function AppearanceSettings() {
  const { themeMode, fontSize, fontFamily, currentTheme, updateAppearance, isLoading } = useAppearance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8" style={{ color: currentTheme.mutedForeground }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: currentTheme.primary }}></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    await updateAppearance({ theme });
  };

  const handleFontSizeChange = (fontSize: number) => {
    updateAppearance({ fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    updateAppearance({ fontFamily });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4" style={{ color: currentTheme.foreground }}>
          Aparência
        </h3>
        <p className="text-sm mb-6" style={{ color: currentTheme.mutedForeground }}>
          Personalize a aparência do editor e da interface.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium" style={{ color: currentTheme.foreground }}>
          Tema
        </label>
        <select
          value={themeMode}
          onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'auto')}
          className="w-full px-3 py-2 rounded-md focus:ring-2 focus:ring-opacity-50 outline-none"
          style={{
            border: `1px solid ${currentTheme.border}`,
            backgroundColor: currentTheme.input,
            color: currentTheme.foreground,
          }}
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
        <div className="text-xs" style={{ color: currentTheme.mutedForeground }}>
          Tema atual: <span className="font-medium">{THEME_OPTIONS.find(t => t.value === themeMode)?.label}</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium" style={{ color: currentTheme.foreground }}>
          Tamanho da Fonte
        </label>
        <div className="flex items-center gap-4">
          <select
            value={fontSize}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="px-3 py-2 rounded-md focus:ring-2 focus:ring-opacity-50 outline-none"
            style={{
              border: `1px solid ${currentTheme.border}`,
              backgroundColor: currentTheme.input,
              color: currentTheme.foreground
            }}
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <div 
            style={{ 
              fontSize: `${fontSize}px`,
              color: currentTheme.mutedForeground
            }}
          >
            Exemplo de texto
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium" style={{ color: currentTheme.foreground }}>
          Família da Fonte
        </label>
        <select
          value={fontFamily}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          className="w-full px-3 py-2 rounded-md focus:ring-2 focus:ring-opacity-50 outline-none"
          style={{
            border: `1px solid ${currentTheme.border}`,
            backgroundColor: currentTheme.input,
            color: currentTheme.foreground
          }}
        >
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family} style={{ fontFamily: family }}>
              {family.split(',')[0]}
            </option>
          ))}
        </select>
        <div 
          className="p-3 rounded"
          style={{ 
            fontFamily: fontFamily,
            fontSize: `${fontSize}px`,
            color: currentTheme.mutedForeground,
            backgroundColor: currentTheme.muted,
            border: `1px solid ${currentTheme.border}`
          }}
        >
          The quick brown fox jumps over the lazy dog.<br />
          0123456789 !@#$%^&*()
        </div>
      </div>
    </div>
  );
}