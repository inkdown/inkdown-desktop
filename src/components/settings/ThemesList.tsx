import { CommunityTheme } from "../../hooks/useCommunityThemes";

interface ThemesListProps {
  themes: CommunityTheme[];
  loading: boolean;
  error: string | null;
  downloadingThemes: Set<string>;
  downloadedThemes: Set<string>;
  onDownloadTheme?: (theme: CommunityTheme) => void;
}

export function ThemesList({
  themes,
  loading,
  error,
  downloadingThemes,
  downloadedThemes,
  onDownloadTheme,
}: ThemesListProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
          style={{ borderColor: "var(--button-primary-background)" }}
        />
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          Buscando temas...
        </p>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (themes.length === 0) {
    return (
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
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {themes.map((theme, index) => (
        <div
          key={`${theme.repo}-${index}`}
          className="rounded-lg w-[62]  shadow-xl border overflow-hidden hover:shadow-md transition-shadow"
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
              />
            </div>
          )}

          <div className="p-4">
            <div className="mb-3">
              <h4
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {theme.name}
              </h4>
              <p
                className="text-xs opacity-80"
                style={{ color: "var(--text-secondary)" }}
              >
                por {theme.author}
              </p>
            </div>

            <div className="flex flex-wrap gap-1 mb-4">
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

            <button
              onClick={() => onDownloadTheme?.(theme)}
              disabled={
                downloadingThemes.has(`${theme.repo}-${theme.name}`) ||
                downloadedThemes.has(`${theme.repo}-${theme.name}`)
              }
              className="w-full px-3 py-2 rounded text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: downloadedThemes.has(
                  `${theme.repo}-${theme.name}`,
                )
                  ? "var(--button-success-background)"
                  : "var(--button-primary-background)",
                color: downloadedThemes.has(`${theme.repo}-${theme.name}`)
                  ? "var(--button-success-foreground)"
                  : "var(--button-primary-foreground)",
                border: "none",
              }}
            >
              {downloadingThemes.has(`${theme.repo}-${theme.name}`)
                ? "Baixando..."
                : downloadedThemes.has(`${theme.repo}-${theme.name}`)
                  ? "✓ Baixado"
                  : "Baixar Tema"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
