import { useEffect } from 'react';
import { useCommunityThemes } from '../../../hooks/useCommunityThemes';
import { ThemesList } from '../ThemesList';

export function PluginsSettings() {
  const {
    themes: communityThemes,
    loading: communityThemesLoading,
    error: communityThemesError,
    downloadingThemes,
    downloadedThemes,
    deletingThemes,
    searchThemes,
    downloadTheme,
    deleteTheme,
  } = useCommunityThemes();

  // Automaticamente buscar temas ao montar o componente
  useEffect(() => {
    searchThemes('https://github.com/inkdown/inkdown-plugins');
  }, [searchThemes]);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Plugins & Temas
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Explore e instale temas e plugins da comunidade Inkdown
        </p>
      </div>
      
      <ThemesList
        themes={communityThemes}
        loading={communityThemesLoading}
        error={communityThemesError}
        downloadingThemes={downloadingThemes}
        downloadedThemes={downloadedThemes}
        deletingThemes={deletingThemes}
        onDownloadTheme={downloadTheme}
        onDeleteTheme={deleteTheme}
      />
    </div>
  );
}