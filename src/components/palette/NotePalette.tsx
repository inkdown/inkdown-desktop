import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";

interface NoteSearchResult {
  name: string;
  path: string;
  content_preview: string;
  modified_time: number;
  size: number;
  match_score: number;
}

interface NotePaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNote: (notePath: string) => void;
  workspacePath: string | null;
}

function NotePaletteComponent({
  isOpen,
  onClose,
  onSelectNote,
  workspacePath,
}: NotePaletteProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NoteSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number>();

  const debouncedSearch = useCallback(
    async (query: string) => {
      if (!workspacePath || query.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await invoke<NoteSearchResult[]>("search_notes", {
          workspacePath: workspacePath,
          query,
          limit: 20,
        });
        setSearchResults(results);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Erro ao buscar notas:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [workspacePath],
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        debouncedSearch(searchQuery);
      }, 300);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    if (isOpen) {
      // Reset search state when opening
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(0);
      // Focus input after a tick to ensure it's rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          event.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, searchResults.length - 1),
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          event.preventDefault();
          if (searchResults[selectedIndex]) {
            onSelectNote(searchResults[selectedIndex].path);
            onClose();
          }
          break;
      }
    },
    [searchResults, selectedIndex, onClose, onSelectNote],
  );

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const formatSize = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }, []);

  const highlightMatch = useCallback((text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                backgroundColor: "var(--theme-primary)",
                color: "var(--theme-background)",
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  }, []);

  const paletteStyle = useMemo(
    () => ({
      backgroundColor: "var(--theme-background)",
      border: "1px solid var(--theme-border)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
    }),
    [],
  );

  const inputStyle = useMemo(
    () => ({
      backgroundColor: "var(--theme-muted)",
      color: "var(--theme-foreground)",
      border: "1px solid var(--theme-border)",
    }),
    [],
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Renderização condicional após todos os hooks
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center shadow-md pt-20  bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-lg overflow-hidden"
        style={paletteStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-4 border-b"
          style={{ borderColor: "var(--theme-border)" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar notas..."
            className="w-full bg-transparent!  px-1s py-1s border-none! focus:outline-none text-base"
            style={{
              ...inputStyle,
            }}
          />
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div
              className="p-8 text-center"
              style={{ color: "var(--theme-muted-foreground)" }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              Buscando...
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((note, index) => (
              <div
                key={note.path}
                className={`p-4 cursor-pointer border-b transition-colors ${
                  index === selectedIndex ? "bg-opacity-50" : ""
                }`}
                style={{
                  backgroundColor:
                    index === selectedIndex
                      ? "var(--theme-accent)"
                      : "transparent",
                  borderColor: "var(--theme-border)",
                  color: "var(--theme-foreground)",
                }}
                onClick={() => {
                  onSelectNote(note.path);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm truncate">
                    {highlightMatch(note.name, searchQuery)}
                  </h3>
                  <div
                    className="flex items-center gap-2 ml-4 flex-shrink-0 text-xs"
                    style={{ color: "var(--theme-muted-foreground)" }}
                  >
                    <span>{formatSize(note.size)}</span>
                    <span>•</span>
                    <span>{formatDate(note.modified_time)}</span>
                  </div>
                </div>

                {note.content_preview && (
                  <p
                    className="text-sm line-clamp-2"
                    style={{ color: "var(--theme-muted-foreground)" }}
                  >
                    {highlightMatch(note.content_preview, searchQuery)}
                  </p>
                )}

                <div
                  className="mt-2 text-xs truncate"
                  style={{ color: "var(--theme-muted-foreground)" }}
                >
                  {note.path.replace(workspacePath || "", "")}
                </div>
              </div>
            ))
          ) : searchQuery.trim() ? (
            <div
              className="p-8 text-center"
              style={{ color: "var(--theme-muted-foreground)" }}
            >
              Nenhuma nota encontrada para "{searchQuery}"
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
}

export const NotePalette = memo(NotePaletteComponent);
