import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-dialog";
import { useDirectory } from "../contexts/DirectoryContext";

export default function HomePage() {
  const [showOfflineOptions, setShowOfflineOptions] = useState(false);
  const { setDirectory, isLoading, error, currentDirectory, initializeWorkspace } = useDirectory();
  const navigate = useNavigate();

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    if (currentDirectory) {
      navigate('/editor', { replace: true });
    }
  }, [currentDirectory, navigate]);

  const handleLogin = async () => {
    await openUrl("https://google.com");
  };

  const handleOffline = () => {
    setShowOfflineOptions(true);
  };

  const handleSelectDirectory = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecione o diretório para suas notas"
      });
      
      if (selected) {
        await setDirectory(selected);
      }
    } catch (error) {
      console.error("Erro ao selecionar diretório:", error);
    }
  };

  const handleBackToMain = () => {
    setShowOfflineOptions(false);
  };

  if (showOfflineOptions) {
    return (
      <main className="theme-card w-full h-[100vh] flex flex-col items-center justify-center space-y-8 relative">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold theme-text-primary">Modo Offline</h2>
          <p className="text-lg max-w-md text-center theme-text-muted">
            Para usar o inkdown offline, selecione uma pasta onde suas anotações serão salvas
          </p>
        </div>
        
        <div className="space-y-4">
          {error && (
            <div className="px-4 py-3 rounded" style={{ 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              color: '#dc2626' 
            }}>
              <p>{error}</p>
            </div>
          )}
          
          <button 
            onClick={handleSelectDirectory}
            disabled={isLoading}
            className="theme-button px-6 py-3 rounded-lg font-medium theme-transition flex items-center justify-center"
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Escaneando...
              </>
            ) : (
              "Selecionar Pasta"
            )}
          </button>
          
          <button 
            onClick={handleBackToMain}
            className="block w-full theme-text-muted hover:opacity-80 underline"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-card w-full h-[100vh] flex flex-col items-center justify-center space-y-8 relative">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Bem-vindo ao <span className="theme-text-primary">inkdown</span>
        </h1>
        <p className="text-lg theme-text-muted">
          Seu editor de markdown para anotações
        </p>
      </div>

      <div className="space-y-6 w-full max-w-sm">
        <div className="space-y-3">
          <p className="text-center text-sm theme-text-muted">Já possui uma conta?</p>
          <button 
            onClick={handleLogin}
            className="w-full theme-button px-6 py-3 rounded-lg font-medium theme-transition"
          >
            Entrar
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-center text-sm theme-text-muted">Novo por aqui?</p>
          <button 
            onClick={handleLogin}
            className="w-full theme-button-secondary px-6 py-3 rounded-lg font-medium theme-transition"
          >
            Criar Conta
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full theme-border" style={{ borderTop: '1px solid var(--theme-border)' }} />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 theme-text-muted" style={{ backgroundColor: 'var(--theme-background)' }}>ou</span>
          </div>
        </div>

        <button 
          onClick={handleOffline}
          className="w-full theme-button-secondary px-6 py-3 rounded-lg font-medium theme-transition"
        >
          Continuar Offline
        </button>
      </div>

      <p className="text-xs theme-text-muted text-center max-w-md">
        No modo offline, suas anotações ficam salvas localmente em seu computador
      </p>
    </main>
  );
}