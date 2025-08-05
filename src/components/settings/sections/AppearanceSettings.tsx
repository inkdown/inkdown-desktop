import { useConfigManager } from '../../../hooks/useConfigManager';
import { useTheme } from '../../../contexts/ThemeContext';
import { useEffect } from 'react';

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
  const { appearanceConfig, updateAppearanceConfig, isLoading } = useConfigManager();
  const { currentTheme, setThemeMode } = useTheme();

  // Sincronizar o tema quando appearanceConfig.theme muda
  useEffect(() => {
    if (appearanceConfig?.theme) {
      setThemeMode(appearanceConfig.theme);
    }
  }, [appearanceConfig?.theme, setThemeMode]);

  if (isLoading || !appearanceConfig) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  // Usar appearanceConfig.theme como fonte da verdade
  const currentThemeMode = appearanceConfig.theme || 'light';

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    await updateAppearanceConfig({ theme });
  };

  const handleFontSizeChange = (fontSize: number) => {
    updateAppearanceConfig({ 'font-size': fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    updateAppearanceConfig({ 'font-family': fontFamily });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Aparência
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Personalize a aparência do editor e da interface.
        </p>
      </div>

      {/* Tema */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tema
        </label>
        <select
          value={currentThemeMode}
          onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'auto')}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {THEME_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} - {option.description}
            </option>
          ))}
        </select>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Tema atual: <span className="font-medium">{THEME_OPTIONS.find(t => t.value === currentThemeMode)?.label}</span>
        </div>
      </div>

      {/* Tamanho da Fonte */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tamanho da Fonte
        </label>
        <div className="flex items-center gap-4">
          <select
            value={appearanceConfig['font-size']}
            onChange={(e) => handleFontSizeChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {FONT_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}px
              </option>
            ))}
          </select>
          <div 
            className="text-gray-600 dark:text-gray-400"
            style={{ fontSize: `${appearanceConfig['font-size']}px` }}
          >
            Exemplo de texto
          </div>
        </div>
      </div>

      {/* Família da Fonte */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Família da Fonte
        </label>
        <select
          value={appearanceConfig['font-family']}
          onChange={(e) => handleFontFamilyChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {FONT_FAMILIES.map((family) => (
            <option key={family} value={family} style={{ fontFamily: family }}>
              {family.split(',')[0]}
            </option>
          ))}
        </select>
        <div 
          className="text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded border"
          style={{ 
            fontFamily: appearanceConfig['font-family'],
            fontSize: `${appearanceConfig['font-size']}px`
          }}
        >
          The quick brown fox jumps over the lazy dog.<br />
          0123456789 !@#$%^&*()
        </div>
      </div>
    </div>
  );
}