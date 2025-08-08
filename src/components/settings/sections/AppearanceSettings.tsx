import { useAppearance } from '../../../contexts/AppearanceContext';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'auto', label: 'Auto'},
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
  const { 
    themeMode, 
    fontSize, 
    fontFamily,  
    updateAppearance, 
    isLoading,
    customThemes,
    currentCustomThemeId,
    customThemesLoading,
    applyTheme
  } = useAppearance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--button-primary-background)' }}></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const handleThemeChange = (themeId: string) => {
    applyTheme(themeId);
  };

  const getCurrentThemeId = () => currentCustomThemeId || themeMode;
  
  const getAllThemeOptions = () => [
    ...THEME_OPTIONS,
    ...customThemes.flatMap(theme => 
      theme.variants.map(variant => ({
        value: variant.id,
        label: `${theme.name} - ${variant.name}`
      }))
    )
  ];

  const handleFontSizeChange = (fontSize: number) => {
    updateAppearance({ fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    updateAppearance({ fontFamily });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Aparência
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Personalize a aparência do editor e da interface
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Tema
          </label>
          <select
            value={getCurrentThemeId()}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-xs focus:ring-1 focus:ring-opacity-50 outline-none"
            style={{
              border: '1px solid var(--input-border)',
              backgroundColor: 'var(--input-background)',
              color: 'var(--input-foreground)',
            }}
            disabled={customThemesLoading}
          >
            {getAllThemeOptions().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="text-xs opacity-70" style={{ color: 'var(--text-secondary)' }}>
            Tema atual aplicado
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Tamanho da Fonte
          </label>
          <div className="flex items-center gap-3">
            <select
              value={fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              className="px-2 py-1.5 rounded text-xs focus:ring-1 focus:ring-opacity-50 outline-none"
              style={{
                border: `1px solid ${'var(--input-border)'}`,
                backgroundColor: 'var(--input-background)',
                color: 'var(--text-primary)'
              }}
            >
              {FONT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}px
                </option>
              ))}
            </select>
            <div 
              className="text-xs"
              style={{ 
                fontSize: `${Math.min(fontSize, 14)}px`,
                color: 'var(--text-secondary)'
              }}
            >
              Exemplo de texto
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
            Família da Fonte
          </label>
          <select
            value={fontFamily}
            onChange={(e) => handleFontFamilyChange(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-xs focus:ring-1 focus:ring-opacity-50 outline-none"
            style={{
              border: `1px solid ${'var(--input-border)'}`,
              backgroundColor: 'var(--input-background)',
              color: 'var(--text-primary)'
            }}
          >
            {FONT_FAMILIES.map((family) => (
              <option key={family} value={family} style={{ fontFamily: family }}>
                {family.split(',')[0]}
              </option>
            ))}
          </select>
          <div 
            className="p-2 rounded text-xs"
            style={{ 
              fontFamily: fontFamily,
              fontSize: '11px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--input-background)',
              border: `1px solid ${'var(--input-border)'}`
            }}
          >
            The quick brown fox jumps over the lazy dog<br />
            0123456789 !@#$%^&*()
          </div>
        </div>

      </div>
    </div>
  );
}