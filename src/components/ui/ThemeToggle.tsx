import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeMode } from '../../types/config';

export function ThemeToggle() {
  const { themeMode, currentTheme, setThemeMode, getAllThemes, setCustomTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  
  const allThemes = getAllThemes();

  const handleThemeModeChange = async (mode: ThemeMode) => {
    await setThemeMode(mode);
    setShowDropdown(false);
  };

  const handleCustomThemeChange = async (themeId: string) => {
    await setCustomTheme(themeId);
    setShowDropdown(false);
  };

  const getThemeIcon = () => {
    if (themeMode === 'auto') return '🌓';
    if (currentTheme.mode === 'dark') return '🌙';
    return '☀️';
  };

  const getThemeLabel = () => {
    if (themeMode === 'auto') return 'Auto';
    return currentTheme.name;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="theme-button-secondary px-3 py-2 rounded-lg flex items-center gap-2 text-sm theme-transition theme-focus-ring"
        title="Alternar tema"
      >
        <span className="text-base">{getThemeIcon()}</span>
        <span>{getThemeLabel()}</span>
        <svg 
          className={`w-4 h-4 theme-transition ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 z-20 theme-menu rounded-lg shadow-lg min-w-48 theme-fade-in">
            {/* Theme Mode Section */}
            <div className="p-2">
              <div className="text-xs font-medium theme-text-muted px-2 py-1 mb-1">
                Modo do tema
              </div>
              
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleThemeModeChange(mode)}
                  className={`theme-menu-item w-full text-left px-2 py-2 rounded text-sm flex items-center gap-2 ${
                    themeMode === mode ? 'theme-bg-primary' : ''
                  }`}
                  style={themeMode === mode ? { 
                    backgroundColor: currentTheme.colors.primary,
                    color: currentTheme.colors.primaryForeground
                  } : {}}
                >
                  <span className="text-base">
                    {mode === 'light' ? '☀️' : mode === 'dark' ? '🌙' : '🌓'}
                  </span>
                  <span className="capitalize">
                    {mode === 'auto' ? 'Automático' : mode === 'light' ? 'Claro' : 'Escuro'}
                  </span>
                </button>
              ))}
            </div>

            {/* Separator */}
            <div className="h-px theme-bg-secondary mx-2" style={{ backgroundColor: currentTheme.colors.border }} />

            {/* Custom Themes Section */}
            <div className="p-2">
              <div className="text-xs font-medium theme-text-muted px-2 py-1 mb-1">
                Temas disponíveis
              </div>
              
              {allThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleCustomThemeChange(theme.id)}
                  className={`theme-menu-item w-full text-left px-2 py-2 rounded text-sm flex items-center justify-between ${
                    currentTheme.id === theme.id ? 'theme-bg-primary' : ''
                  }`}
                  style={currentTheme.id === theme.id ? { 
                    backgroundColor: currentTheme.colors.primary,
                    color: currentTheme.colors.primaryForeground
                  } : {}}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-base">
                      {theme.mode === 'dark' ? '🌙' : '☀️'}
                    </span>
                    <span>{theme.name}</span>
                  </span>
                  
                  {/* Color preview */}
                  <div className="flex gap-1">
                    <div 
                      className="w-3 h-3 rounded-full border border-current opacity-60"
                      style={{ backgroundColor: theme.colors.primary }}
                      title="Cor primária"
                    />
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-2 pt-1">
              <div 
                className="text-xs theme-text-muted text-center py-1 px-2 rounded"
                style={{ backgroundColor: currentTheme.colors.muted }}
              >
                💡 Personalize CSS com classes .theme-*
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}