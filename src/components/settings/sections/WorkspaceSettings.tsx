import { useNavigate } from 'react-router-dom';
import { LogOut, FolderOpen, Home } from 'lucide-react';
import { useDirectory } from '../../../contexts/DirectoryContext';

export function WorkspaceSettings() {
  const { currentDirectory, clearDirectory } = useDirectory();
  const navigate = useNavigate();

  const handleExitWorkspace = async () => {
    await clearDirectory();
    navigate('/');
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 
          className="text-base font-medium mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Workspace
        </h3>
        <p 
          className="text-xs mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          Gerencie seu workspace atual e navegue entre diferentes projetos
        </p>
      </div>

      {currentDirectory && (
        <div className="space-y-4">
          <div 
            className="p-3 rounded-md"
            style={{ 
              backgroundColor: 'var(--theme-muted)',
              border: '1px solid var(--input-border)'
            }}
          >
            <div className="flex items-center gap-2">
              <FolderOpen 
                size={14} 
                style={{ color: 'var(--text-accent)' }}
              />
              <div>
                <h4 
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Workspace Atual
                </h4>
                <p 
                  className="text-xs mt-1 opacity-80"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {currentDirectory}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={handleExitWorkspace}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left"
              style={{
                backgroundColor: 'var(--theme-background)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-background)';
              }}
            >
              <LogOut size={14} />
              <div>
                <div className="text-xs font-medium">Sair do Workspace</div>
                <div 
                  className="text-xs opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Retorna para a tela inicial
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-left"
              style={{
                backgroundColor: 'var(--theme-background)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--theme-background)';
              }}
            >
              <Home size={14} />
              <div>
                <div className="text-xs font-medium">Tela Inicial</div>
                <div 
                  className="text-xs opacity-70"
                  style={{ color: 'var(--text-secondary)' }}
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
          className="text-center py-6"
          style={{ color: 'var(--text-secondary)' }}
        >
          <FolderOpen size={32} className="mx-auto mb-3" />
          <p className="text-xs mb-3">Nenhum workspace aberto</p>
          <button
            onClick={() => navigate('/')}
            className="px-3 py-1.5 rounded-md transition-colors text-xs"
            style={{
              backgroundColor: 'var(--text-accent)',
              color: 'var(--text-accent)'
            }}
          >
            Abrir Workspace
          </button>
        </div>
      )}
    </div>
  );
}