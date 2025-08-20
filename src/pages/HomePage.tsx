import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { open } from "@tauri-apps/plugin-dialog";
import { useCurrentDirectory, useDirectoryLoading, useDirectoryError, useDirectoryStore } from "../stores/directoryStore";

export default function HomePage() {
  const currentDirectory = useCurrentDirectory();
  const isLoading = useDirectoryLoading();
  const error = useDirectoryError();
  const { setDirectory } = useDirectoryStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentDirectory) {
      navigate("/editor", { replace: true });
    }
  }, [currentDirectory, navigate]);

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecione o diretório para suas notas",
      });

      if (selected) {
        await setDirectory(selected);
      }
    } catch (error) {
      console.error("Erro ao selecionar diretório:", error);
    }
  };

  return (
    <main className="theme-card w-full h-[100vh] flex flex-col items-center justify-center space-y-8 relative">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Bem-vindo ao <span className="theme-text-primary">inkdown</span>
        </h1>
        <p className="text-lg max-w-md text-center theme-text-muted">
          Para começar, selecione uma pasta onde suas anotações serão salvas
        </p>
      </div>

      <div className="space-y-4">
        {error && (
          <div
            className="px-4 py-3 rounded"
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
            }}
          >
            <p>{error}</p>
          </div>
        )}

        <button
          onClick={handleSelectDirectory}
          disabled={isLoading}
          className={`theme-button px-6 py-3 rounded-lg font-medium theme-transition flex items-center justify-center ${isLoading ? "opacity-60" : "opacity-100"}`}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Escaneando...
            </>
          ) : (
            "Selecionar Workspace"
          )}
        </button>
      </div>

      <p className="text-xs theme-text-muted text-center max-w-md">
        Suas anotações ficam salvas localmente em seu computador
      </p>
    </main>
  );
}
