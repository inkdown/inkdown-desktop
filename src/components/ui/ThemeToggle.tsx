import { useState } from 'react';
import { useAppearance } from '../../contexts/AppearanceContext';
import { ThemeMode } from '../../types/config';

export function ThemeToggle() {
  const { themeMode, currentTheme, effectiveTheme, updateAppearance } = useAppearance();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleThemeModeChange = async (mode: ThemeMode) => {
    await updateAppearance({ theme: mode });
    setShowDropdown(false);
  };

  const getThemeIcon = () => {
    if (themeMode === 'auto') return '🌓';
    if (effectiveTheme === 'dark') return '🌙';
    return '☀️';
  };

  const getThemeLabel = () => {
    if (themeMode === 'auto') return 'Auto';
    return effectiveTheme === 'dark' ? 'Escuro' : 'Claro';
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
            <div className="p-2">
              <div className="text-xs font-medium theme-text-muted px-2 py-1 mb-1">
                Escolher tema
              </div>
              
              {(['light', 'dark', 'auto'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleThemeModeChange(mode)}
                  className={`theme-menu-item w-full text-left px-2 py-2 rounded text-sm flex items-center gap-2 ${
                    themeMode === mode ? 'theme-bg-primary' : ''
                  }`}
                  style={themeMode === mode ? { 
                    backgroundColor: currentTheme.primary,
                    color: currentTheme.primaryForeground
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
          </div>
        </>
      )}
    </div>
  );
}