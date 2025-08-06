import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, Home } from 'lucide-react';
import { useAppearance } from '../../../contexts/AppearanceContext';
import { useDirectory } from '../../../contexts/DirectoryContext';

export function WorkspaceSettings() {
  const { currentTheme } = useAppearance();
  const { currentDirectory, clearDirectory } = useDirectory();
  const navigate = useNavigate();

  const handleExitWorkspace = async () => {
    await clearDirectory();
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 
          className="text-lg font-medium mb-4"
          style={{ color: currentTheme.foreground }}
        >
          Workspace
        </h3>
        <p 
          className="text-sm mb-6"
          style={{ color: currentTheme.mutedForeground }}
        >
          Gerencie seu workspace atual e navegue entre diferentes projetos.
        </p>
      </div>

      {currentDirectory && (
        <div className="space-y-4">
          <div 
            className="p-4 rounded-lg"
            style={{ 
              backgroundColor: currentTheme.muted,
              border: `1px solid ${currentTheme.border}`
            }}
          >
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen 
                size={20} 
                style={{ color: currentTheme.primary }}
              />
              <div>
                <h4 
                  className="font-medium"
                  style={{ color: currentTheme.foreground }}
                >
                  Workspace Atual
                </h4>
                <p 
                  className="text-sm mt-1"
                  style={{ color: currentTheme.mutedForeground }}
                >
                  {currentDirectory}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExitWorkspace}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: currentTheme.background,
                border: `1px solid ${currentTheme.border}`,
                color: currentTheme.foreground
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.muted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.background;
              }}
            >
              <LogOut size={18} />
              <div className="text-left">
                <div className="font-medium">Sair do Workspace</div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.mutedForeground }}
                >
                  Retorna para a tela inicial
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors"
              style={{
                backgroundColor: currentTheme.background,
                border: `1px solid ${currentTheme.border}`,
                color: currentTheme.foreground
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.muted;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = currentTheme.background;
              }}
            >
              <Home size={18} />
              <div className="text-left">
                <div className="font-medium">Tela Inicial</div>
                <div 
                  className="text-sm"
                  style={{ color: currentTheme.mutedForeground }}
                >
                  Ir para a página inicial do app
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {!currentDirectory && (
        <div 
          className="text-center py-8"
          style={{ color: currentTheme.mutedForeground }}
        >
          <FolderOpen size={48} className="mx-auto mb-4" />
          <p>Nenhum workspace aberto</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: currentTheme.primary,
              color: currentTheme.primaryForeground
            }}
          >
            Abrir Workspace
          </button>
        </div>
      )}
    </div>
  );
}