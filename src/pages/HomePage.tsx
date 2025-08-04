import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open } from "@tauri-apps/plugin-dialog";
import { useDirectory } from "../contexts/DirectoryContext";
import { useOptimizedNavigation } from "../hooks/useOptimizedNavigation";

export default function HomePage() {
  const [showOfflineOptions, setShowOfflineOptions] = useState(false);
  const { setDirectory, isLoading, error, currentDirectory, initializeWorkspace } = useDirectory();
  const { handleMouseEnter } = useOptimizedNavigation();
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
      <main className="bg-zinc-100 text-zinc-800 w-full h-[100vh] flex flex-col items-center justify-center space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-indigo-700">Modo Offline</h2>
          <p className="text-lg max-w-md text-center">
            Para usar o inkdown offline, selecione uma pasta onde suas anotações serão salvas
          </p>
        </div>
        
        <div className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
            </div>
          )}
          
          <button 
            onClick={handleSelectDirectory}
            disabled={isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
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
            className="block w-full text-zinc-600 hover:text-zinc-800 underline"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-zinc-100 text-zinc-800 w-full h-[100vh] flex flex-col items-center justify-center space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">
          Bem-vindo ao <span className="text-indigo-700">inkdown</span>
        </h1>
        <p className="text-lg text-zinc-600">
          Seu editor de markdown para anotações
        </p>
      </div>

      <div className="space-y-6 w-full max-w-sm">
        <div className="space-y-3">
          <p className="text-center text-sm text-zinc-600">Já possui uma conta?</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Entrar
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-center text-sm text-zinc-600">Novo por aqui?</p>
          <button 
            onClick={handleLogin}
            className="w-full bg-zinc-200 hover:bg-zinc-300 text-zinc-800 px-6 py-3 rounded-lg font-medium transition-colors duration-200"
          >
            Criar Conta
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-zinc-100 text-zinc-500">ou</span>
          </div>
        </div>

        <button 
          onClick={handleOffline}
          className="w-full bg-zinc-600 hover:bg-zinc-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
        >
          Continuar Offline
        </button>
      </div>

      <p className="text-xs text-zinc-500 text-center max-w-md">
        No modo offline, suas anotações ficam salvas localmente em seu computador
      </p>

      {/* Link para benchmark */}
      <div className="mt-8">
        <Link
          to="/bench"
          onMouseEnter={() => handleMouseEnter('/bench')}
          className="text-xs text-zinc-400 hover:text-zinc-600 underline"
        >
          Performance Benchmark
        </Link>
      </div>
    </main>
  );
}