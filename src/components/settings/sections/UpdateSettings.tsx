import { RefreshCw, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useUpdater } from '../../../hooks/useUpdater';

export function UpdateSettings() {
  const {
    updateAvailable,
    updateInfo,
    isChecking,
    isDownloading,
    downloadProgress,
    error,
    checkForUpdates,
    downloadAndInstall,
  } = useUpdater();

  const handleCheckUpdates = () => {
    checkForUpdates(true); // Force check
  };

  const handleDownloadUpdate = () => {
    downloadAndInstall();
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 
          className="text-base font-medium mb-1"
          style={{ color: 'var(--text-primary)' }}
        >
          Atualizações
        </h3>
        <p 
          className="text-xs mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          Mantenha o Inkdown sempre atualizado com as últimas funcionalidades
        </p>
      </div>

      <div className="space-y-4">
        {/* Status atual */}
        <div 
          className="p-3 rounded-md border"
          style={{
            backgroundColor: 'var(--theme-muted)',
            borderColor: 'var(--input-border)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            {updateAvailable ? (
              <AlertCircle 
                size={16}
                className="text-amber-500"
              />
            ) : (
              <CheckCircle 
                size={16}
                className="text-emerald-500"
              />
            )}
            <span 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {updateAvailable ? 'Atualização Disponível' : 'Atualizado'}
            </span>
          </div>

          {updateAvailable && updateInfo && (
            <div className="mb-3">
              <p 
                className="text-xs mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Nova versão: <strong>{updateInfo.version}</strong>
              </p>
              {updateInfo.body && (
                <div 
                  className="text-xs p-2 rounded max-h-16 overflow-y-auto"
                  style={{ 
                    backgroundColor: 'var(--theme-background)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {updateInfo.body}
                </div>
              )}
            </div>
          )}

          {error && (
            <div 
              className="text-xs p-2 mb-2 rounded"
              style={{
                color: 'var(--theme-destructive)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCheckUpdates}
              disabled={isChecking || isDownloading}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--theme-background)',
                color: 'var(--text-primary)',
                border: '1px solid var(--input-border)',
              }}
            >
              <RefreshCw 
                size={12} 
                className={isChecking ? 'animate-spin' : ''}
              />
              {isChecking ? 'Verificando...' : 'Verificar Atualizações'}
            </button>

            {updateAvailable && (
              <button
                onClick={handleDownloadUpdate}
                disabled={isDownloading}
                className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--button-primary-background)',
                  color: 'var(--button-primary-foreground)',
                  border: 'none',
                }}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    {downloadProgress > 0 ? `${downloadProgress}%` : 'Baixando...'}
                  </>
                ) : (
                  <>
                    <Download size={12} />
                    Baixar e Instalar
                  </>
                )}
              </button>
            )}
          </div>

          {isDownloading && downloadProgress > 0 && (
            <div 
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--theme-background)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  backgroundColor: 'var(--text-accent)',
                  width: `${downloadProgress}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* Informações sobre atualizações automáticas */}
        <div 
          className="text-xs p-3 rounded-md"
          style={{
            backgroundColor: 'var(--theme-background)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--input-border)',
          }}
        >
          <h4 
            className="font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Sobre as Atualizações
          </h4>
          <ul className="space-y-1 text-xs">
            <li>• As verificações são feitas automaticamente a cada 24 horas</li>
            <li>• Atualizações são baixadas e instaladas com segurança</li>
            <li>• O aplicativo será reiniciado automaticamente após a instalação</li>
            <li>• Todas as suas configurações e dados são preservados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}