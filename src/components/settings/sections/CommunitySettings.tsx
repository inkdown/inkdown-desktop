import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCommunityThemes, CommunityTheme } from '../../../hooks/useCommunityThemes';
import { Package, Palette, Globe } from 'lucide-react';

const CommunityCard = ({ 
  item, 
  type, 
  downloadingThemes, 
  downloadedThemes, 
  deletingThemes, 
  onDownloadTheme, 
  onDeleteTheme 
}: {
  item: CommunityTheme;
  type: 'theme' | 'plugin';
  downloadingThemes: Set<string>;
  downloadedThemes: Set<string>;
  deletingThemes: Set<string>;
  onDownloadTheme?: (theme: CommunityTheme) => void;
  onDeleteTheme?: (theme: CommunityTheme) => void;
}) => {
  const themeKey = `${item.author}-${item.name}`;
  const isDownloading = downloadingThemes.has(themeKey);
  const isDownloaded = downloadedThemes.has(themeKey);
  const isDeleting = deletingThemes.has(themeKey);
  const isOfficial = item.repo.toLowerCase().includes("inkdown/");

  const handleDownload = useCallback(() => {
    onDownloadTheme?.(item);
  }, [onDownloadTheme, item]);

  const handleDelete = useCallback(() => {
    onDeleteTheme?.(item);
  }, [onDeleteTheme, item]);

  return (
    <div
      className="rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
      style={{
        backgroundColor: "var(--background)",
        border: "1px solid var(--modal-border)",
      }}
    >
      {/* Screenshot ou ícone de tipo */}
      <div className="aspect-video overflow-hidden relative">
        {item.screenshot_data ? (
          <img
            src={item.screenshot_data}
            alt={`Screenshot do ${type === 'theme' ? 'tema' : 'plugin'} ${item.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: "var(--surface-secondary)" }}
          >
            {type === 'theme' ? (
              <Palette size={32} style={{ color: "var(--text-secondary)" }} />
            ) : (
              <Package size={32} style={{ color: "var(--text-secondary)" }} />
            )}
          </div>
        )}
        
        {/* Badge do tipo */}
        <div 
          className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1"
          style={{
            backgroundColor: type === 'theme' ? 'var(--theme-secondary)' : 'var(--theme-accent)',
            color: 'white'
          }}
        >
          {type === 'theme' ? <Palette size={10} /> : <Package size={10} />}
          {type === 'theme' ? 'Tema' : 'Plugin'}
        </div>
      </div>

      <div className="p-3">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="text-sm font-semibold truncate flex-1"
              style={{ color: "var(--text-primary)" }}
              title={item.name}
            >
              {item.name}
            </h4>
            {isOfficial && (
              <div
                className="flex text-white items-center px-2 py-1 rounded-full text-xs font-medium"
                style={{
                  backgroundColor: "var(--theme-secondary)",
                }}
                title="Oficial"
              >
                <span className="text-[10px]">Oficial</span>
              </div>
            )}
          </div>
          <p
            className="text-xs opacity-80 truncate"
            style={{ color: "var(--text-secondary)" }}
            title={`por ${item.author}`}
          >
            por {item.author}
          </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {item.modes.map((mode) => (
            <span
              key={mode}
              className="px-2 py-0.5 rounded-full text-xs capitalize"
              style={{
                backgroundColor: "var(--surface-secondary)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-secondary)",
              }}
            >
              {mode}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mb-3">
          <a
            href={`https://github.com/${item.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title={`Ver repositório: ${item.repo}`}
          >
            <Globe size={12} />
            <span className="truncate max-w-[120px]">{item.repo}</span>
          </a>
        </div>

        <div>
          {!isDownloaded ? (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "var(--button-primary-background)",
                color: "var(--button-primary-foreground)",
                border: "none",
              }}
            >
              {isDownloading ? "Baixando..." : `Instalar ${type === 'theme' ? 'Tema' : 'Plugin'}`}
            </button>
          ) : (
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-1.5 rounded text-xs font-medium text-center"
                style={{
                  backgroundColor: "var(--button-success-background)",
                  color: "var(--button-success-foreground)",
                }}
              >
                ✓ Instalado
              </div>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-2 py-1.5 rounded text-xs transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center"
                style={{
                  backgroundColor: "var(--theme-destructive)",
                  color: "white",
                  border: "none",
                  minWidth: "32px",
                }}
                title={isDeleting ? "Removendo..." : `Remover ${type === 'theme' ? 'tema' : 'plugin'}`}
              >
                {isDeleting ? (
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                ) : (
                  "🗑️"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export function CommunitySettings() {
  const [activeTab, setActiveTab] = useState<'geral' | 'themes' | 'plugins'>('geral');
  
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

  // Simular dados de plugins (já que atualmente só temos temas)
  // Você pode expandir isso quando tiver um endpoint específico para plugins
  const plugins = useMemo(() => {
    return communityThemes.filter(item => 
      item.name.toLowerCase().includes('plugin') || 
      item.repo.toLowerCase().includes('plugin')
    );
  }, [communityThemes]);

  const themes = useMemo(() => {
    return communityThemes.filter(item => 
      !item.name.toLowerCase().includes('plugin') && 
      !item.repo.toLowerCase().includes('plugin')
    );
  }, [communityThemes]);

  const allItems = useMemo(() => {
    return communityThemes;
  }, [communityThemes]);

  const getFilteredItems = useCallback(() => {
    switch (activeTab) {
      case 'geral':
        return allItems;
      case 'themes':
        return themes;
      case 'plugins':
        return plugins;
      default:
        return allItems;
    }
  }, [activeTab, allItems, themes, plugins]);

  const getItemType = useCallback((item: CommunityTheme): 'theme' | 'plugin' => {
    return (item.name.toLowerCase().includes('plugin') || 
            item.repo.toLowerCase().includes('plugin')) ? 'plugin' : 'theme';
  }, []);

  const renderContent = () => {
    if (communityThemesLoading) {
      return (
        <div className="text-center py-8">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={{ borderColor: "var(--button-primary-background)" }}
          />
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Buscando conteúdo da comunidade...
          </p>
        </div>
      );
    }

    if (communityThemesError) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-xs mb-2" style={{ color: "var(--text-primary)" }}>
            Erro ao buscar conteúdo
          </p>
          <p
            className="text-xs opacity-70"
            style={{ color: "var(--text-secondary)" }}
          >
            {communityThemesError}
          </p>
        </div>
      );
    }

    const filteredItems = getFilteredItems();

    if (filteredItems.length === 0) {
      return (
        <div
          className="text-center py-8 text-xs"
          style={{ color: "var(--text-secondary)" }}
        >
          <div className="mb-2">{activeTab === 'plugins' ? '🔌' : activeTab === 'themes' ? '🎨' : '📦'}</div>
          <p>
            {activeTab === 'plugins' 
              ? 'Nenhum plugin encontrado' 
              : activeTab === 'themes' 
                ? 'Nenhum tema encontrado' 
                : 'Nenhum conteúdo encontrado'
            }
          </p>
          <p className="mt-1 opacity-70">
            Verifique se o repositório contém o conteúdo correto
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item, index) => (
          <CommunityCard
            key={`${item.repo}-${index}`}
            item={item}
            type={activeTab === 'geral' ? getItemType(item) : activeTab === 'themes' ? 'theme' : 'plugin'}
            downloadingThemes={downloadingThemes}
            downloadedThemes={downloadedThemes}
            deletingThemes={deletingThemes}
            onDownloadTheme={downloadTheme}
            onDeleteTheme={deleteTheme}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Comunidade
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Explore e instale temas e plugins da comunidade Inkdown
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-6">
        {[
          { id: 'geral' as const, label: 'Geral', count: allItems.length },
          { id: 'themes' as const, label: 'Temas', count: themes.length },
          { id: 'plugins' as const, label: 'Plugins', count: plugins.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 py-2 text-sm font-medium transition-all border-b-2 relative"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                borderColor: isActive ? 'var(--text-accent)' : 'transparent',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? 'var(--text-accent)' : 'transparent'}`
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span 
                  className="text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{ 
                    backgroundColor: isActive ? 'var(--text-accent)' : 'var(--surface-secondary)',
                    color: isActive ? 'white' : 'var(--text-secondary)'
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}