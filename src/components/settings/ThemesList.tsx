import { memo, useMemo, useCallback } from "react";
import { CommunityTheme } from "../../hooks/useCommunityThemes";
import { Github, Trash2, ExternalLink } from "lucide-react";

interface ThemesListProps {
  themes: CommunityTheme[];
  loading: boolean;
  error: string | null;
  downloadingThemes: Set<string>;
  downloadedThemes: Set<string>;
  deletingThemes: Set<string>;
  onDownloadTheme?: (theme: CommunityTheme) => void;
  onDeleteTheme?: (theme: CommunityTheme) => void;
}

const ThemeCard = memo<{
  theme: CommunityTheme;
  index: number;
  downloadingThemes: Set<string>;
  downloadedThemes: Set<string>;
  deletingThemes: Set<string>;
  onDownloadTheme?: (theme: CommunityTheme) => void;
  onDeleteTheme?: (theme: CommunityTheme) => void;
}>(({ theme, index, downloadingThemes, downloadedThemes, deletingThemes, onDownloadTheme, onDeleteTheme }) => {
  const themeKey = `${theme.author}-${theme.name}`;
  const isDownloading = downloadingThemes.has(themeKey);
  const isDownloaded = downloadedThemes.has(themeKey);
  const isDeleting = deletingThemes.has(themeKey);
  const isOfficial = theme.repo.toLowerCase().includes("inkdown/");

  const handleDownload = useCallback(() => {
    onDownloadTheme?.(theme);
  }, [onDownloadTheme, theme]);

  const handleDelete = useCallback(() => {
    onDeleteTheme?.(theme);
  }, [onDeleteTheme, theme]);

  return (
    <div
      key={`${theme.repo}-${index}`}
      className="rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
      style={{
        backgroundColor: "var(--background)",
        border: "1px solid var(--modal-border)",
      }}
    >
      {theme.screenshot_data && (
        <div className="aspect-video overflow-hidden">
          <img
            src={theme.screenshot_data}
            alt={`Screenshot do tema ${theme.name}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-3">
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className="text-sm font-semibold truncate flex-1"
              style={{ color: "var(--text-primary)" }}
              title={theme.name}
            >
              {theme.name}
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
            title={`por ${theme.author}`}
          >
            por {theme.author}
          </p>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {theme.modes.map((mode) => (
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
            href={`https://github.com/${theme.repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title={`Ver repositório: ${theme.repo}`}
          >
            <Github size={12} />
            <span className="truncate max-w-[120px]">{theme.repo}</span>
            <ExternalLink size={10} />
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
              {isDownloading ? "Baixando..." : "Baixar Tema"}
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
                title={isDeleting ? "Removendo..." : "Remover tema"}
              >
                {isDeleting ? (
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                ) : (
                  <Trash2 size={12} color="white" />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ThemeCard.displayName = 'ThemeCard';

const ThemesList = memo<ThemesListProps>(({
  themes,
  loading,
  error,
  downloadingThemes,
  downloadedThemes,
  deletingThemes,
  onDownloadTheme,
  onDeleteTheme,
}) => {
  const LoadingComponent = useMemo(() => (
    <div className="text-center py-8">
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
        style={{ borderColor: "var(--button-primary-background)" }}
      />
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
        Buscando temas...
      </p>
    </div>
  ), []);

  // Memoize error state
  const ErrorComponent = useMemo(() => (
    <div className="text-center py-8">
      <div className="text-red-500 mb-2">⚠️</div>
      <p className="text-xs mb-2" style={{ color: "var(--text-primary)" }}>
        Erro ao buscar temas
      </p>
      <p
        className="text-xs opacity-70"
        style={{ color: "var(--text-secondary)" }}
      >
        {error}
      </p>
    </div>
  ), [error]);

  // Memoize empty state
  const EmptyComponent = useMemo(() => (
    <div
      className="text-center py-8 text-xs"
      style={{ color: "var(--text-secondary)" }}
    >
      <div className="mb-2">🎨</div>
      <p>Nenhum tema encontrado</p>
      <p className="mt-1 opacity-70">
        Verifique se o repositório contém themes.json
      </p>
    </div>
  ), []);

  if (loading) return LoadingComponent;
  if (error) return ErrorComponent;
  if (themes.length === 0) return EmptyComponent;

  return (
    <div className="grid grid-cols-2 gap-3">
      {themes.map((theme, index) => (
        <ThemeCard
          key={`${theme.repo}-${index}`}
          theme={theme}
          index={index}
          downloadingThemes={downloadingThemes}
          downloadedThemes={downloadedThemes}
          deletingThemes={deletingThemes}
          onDownloadTheme={onDownloadTheme}
          onDeleteTheme={onDeleteTheme}
        />
      ))}
    </div>
  );
});

ThemesList.displayName = 'ThemesList';

export { ThemesList };
