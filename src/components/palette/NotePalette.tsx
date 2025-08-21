import { memo, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useFileOperations } from "../../hooks/useFileOperations";

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
  const [isCreating, setIsCreating] = useState(false);
  const [pathValidation, setPathValidation] = useState<{
    isValid: boolean;
    message: string;
  }>({ isValid: true, message: "" });
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<number>();
  const selectedItemRef = useRef<HTMLDivElement>(null);
  const { createNestedPath } = useFileOperations();

  const scrollToSelectedItem = useCallback(() => {
    if (!selectedItemRef.current) return;

    selectedItemRef.current.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest'
    });
  }, []);

  const validatePath = useCallback((pathInput: string) => {
    if (!pathInput.trim()) {
      setPathValidation({ isValid: true, message: "" });
      return;
    }

    const cleanPath = pathInput.trim();
    
    const windowsInvalidChars = ['<', '>', ':', '"', '|', '?', '*'];
    const reservedNames = [
      'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 
      'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 
      'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
    ];

    if (cleanPath.includes('..')) {
      setPathValidation({
        isValid: false,
        message: "Path traversal não é permitido"
      });
      return;
    }

    if (cleanPath.length > 200) {
      setPathValidation({
        isValid: false,
        message: "Caminho muito longo (máximo 200 caracteres)"
      });
      return;
    }

    const invalidChar = windowsInvalidChars.find(char => cleanPath.includes(char));
    if (invalidChar) {
      setPathValidation({
        isValid: false,
        message: `Caractere inválido "${invalidChar}"`
      });
      return;
    }

    const pathParts = cleanPath.split('/').filter(part => part.length > 0);
    for (const part of pathParts) {
      const namePart = part.split('.')[0].toUpperCase();
      if (reservedNames.includes(namePart)) {
        setPathValidation({
          isValid: false,
          message: `Nome reservado "${part}"`
        });
        return;
      }

      if (part.endsWith('.') || part.endsWith(' ')) {
        setPathValidation({
          isValid: false,
          message: `"${part}" não pode terminar com ponto ou espaço`
        });
        return;
      }
    }

    setPathValidation({ isValid: true, message: "" });
  }, []);

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

  const createNewNote = useCallback(
    async (pathInput: string) => {
      if (!workspacePath || !pathInput.trim() || !pathValidation.isValid) return;

      const cleanPath = pathInput.trim();

      setIsCreating(true);
      try {
        const newFilePath = await createNestedPath(workspacePath, cleanPath);
        
        if (newFilePath) {
          const isDirectory = cleanPath.endsWith('/');
          if (!isDirectory) {
            onSelectNote(newFilePath);
          }
          onClose();
        }
      } catch (error) {
        console.error("Erro ao criar nova nota/diretório:", error);
      } finally {
        setIsCreating(false);
      }
    },
    [workspacePath, createNestedPath, onSelectNote, onClose, pathValidation.isValid],
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        debouncedSearch(searchQuery);
      }, 20);
    } else {
      setSearchResults([]);
    }

    validatePath(searchQuery);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, debouncedSearch, validatePath]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(0);
      setPathValidation({ isValid: true, message: "" });
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchResults.length > 0) {
      const timeoutId = setTimeout(() => {
        scrollToSelectedItem();
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedIndex, searchResults.length, scrollToSelectedItem]);

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
          if (event.shiftKey && searchQuery.trim()) {
            createNewNote(searchQuery);
          } else if (searchResults[selectedIndex]) {
            onSelectNote(searchResults[selectedIndex].path);
            onClose();
          }
          break;
      }
    },
    [searchResults, selectedIndex, onClose, onSelectNote, searchQuery, createNewNote],
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center shadow-md pt-20  bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-lg overflow-hidden"
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
              borderColor: !pathValidation.isValid && searchQuery.trim() ? "var(--theme-destructive)" : "var(--theme-border)",
              opacity: !pathValidation.isValid && searchQuery.trim() ? 0.7 : 1,
            }}
          />
          {!pathValidation.isValid && searchQuery.trim() && (
            <div 
              className="mt-2 text-xs px-2 py-1 rounded border opacity-80"
              style={{
                backgroundColor: "var(--theme-destructive)",
                color: "var(--theme-destructive-foreground)",
                borderColor: "var(--theme-destructive)",
              }}
            >
              {pathValidation.message}
            </div>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading || isCreating ? (
            <div
              className="p-8 text-center"
              style={{ color: "var(--theme-muted-foreground)" }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              {isCreating ? "Criando..." : "Buscando..."}
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((note, index) => (
              <div
                key={note.path}
                ref={index === selectedIndex ? selectedItemRef : null}
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
              <p className="mb-2">
                Nenhuma nota encontrada para "{searchQuery}"
              </p>
              <div className="text-sm space-y-1" style={{ color: "var(--theme-muted-foreground)" }}>
                <p>
                  <kbd style={{ 
                    backgroundColor: "var(--theme-muted)", 
                    padding: "2px 6px", 
                    borderRadius: "4px",
                    fontFamily: "monospace"
                  }}>Shift+Enter</kbd> para criar nota ou diretório
                </p>
                <p className="text-xs opacity-75">
                  Exemplos: "nota.md", "pasta/nota", "projeto/"
                </p>
              </div>
            </div>
          ) : (
            <div
              className="p-8 text-center"
              style={{ color: "var(--theme-muted-foreground)" }}
            >
              <div className="text-sm space-y-1">
                <p>
                  Digite para buscar notas ou pressione <kbd style={{ 
                    backgroundColor: "var(--theme-muted)", 
                    padding: "2px 6px", 
                    borderRadius: "4px",
                    fontFamily: "monospace"
                  }}>Shift+Enter</kbd> para criar
                </p>
                <p className="text-xs opacity-75">
                  Exemplos: "nota.md", "pasta/nota", "projeto/"
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          className="px-4 py-3 border-t text-xs flex justify-between items-center"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-muted)",
            color: "var(--theme-muted-foreground)",
          }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd style={{ 
                backgroundColor: "var(--theme-background)", 
                padding: "2px 4px", 
                borderRadius: "3px",
                fontSize: "10px",
                fontFamily: "monospace"
              }}>↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd style={{ 
                backgroundColor: "var(--theme-background)", 
                padding: "2px 4px", 
                borderRadius: "3px",
                fontSize: "10px",
                fontFamily: "monospace"
              }}>Enter</kbd>
              selecionar
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd style={{ 
                backgroundColor: "var(--theme-background)", 
                padding: "2px 4px", 
                borderRadius: "3px",
                fontSize: "10px",
                fontFamily: "monospace"
              }}>Shift+Enter</kbd>
              criar
            </span>
            <span className="flex items-center gap-1">
              <kbd style={{ 
                backgroundColor: "var(--theme-background)", 
                padding: "2px 4px", 
                borderRadius: "3px",
                fontSize: "10px",
                fontFamily: "monospace"
              }}>Esc</kbd>
              fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export const NotePalette = memo(NotePaletteComponent);
