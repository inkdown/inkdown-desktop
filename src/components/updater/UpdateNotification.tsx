import { Download, X, RefreshCw } from 'lucide-react';
import { useUpdater } from '../../hooks/useUpdater';

interface UpdateNotificationProps {
  onDismiss?: () => void;
}

export function UpdateNotification({ onDismiss }: UpdateNotificationProps) {
  const {
    updateAvailable,
    updateInfo,
    isDownloading,
    downloadProgress,
    error,
    downloadAndInstall,
    dismissUpdate,
  } = useUpdater();

  if (!updateAvailable || !updateInfo) {
    return null;
  }

  const handleDismiss = () => {
    dismissUpdate();
    onDismiss?.();
  };

  const handleDownload = () => {
    downloadAndInstall();
  };

  return (
    <div 
      className="fixed top-4 right-4 z-50 max-w-md rounded-lg shadow-lg border"
      style={{
        backgroundColor: 'var(--background)',
        borderColor: 'var(--modal-border)',
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <RefreshCw 
              size={16}
              style={{ color: 'var(--text-accent)' }}
            />
            <h4 
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Atualização Disponível
            </h4>
          </div>
          <button
            onClick={handleDismiss}
            className="opacity-70 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-4">
          <p 
            className="text-sm mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            Nova versão <strong>{updateInfo.version}</strong> disponível
          </p>
          
          {updateInfo.body && (
            <div 
              className="text-xs p-2 rounded max-h-20 overflow-y-auto"
              style={{ 
                backgroundColor: 'var(--theme-muted)',
                color: 'var(--text-secondary)',
              }}
            >
              {updateInfo.body}
            </div>
          )}
        </div>

        {error && (
          <div 
            className="text-xs p-2 mb-3 rounded border"
            style={{
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
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
                Atualizar Agora
              </>
            )}
          </button>

          <button
            onClick={handleDismiss}
            disabled={isDownloading}
            className="px-3 py-2 rounded text-xs font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--theme-background)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--input-border)',
            }}
          >
            Depois
          </button>
        </div>

        {isDownloading && downloadProgress > 0 && (
          <div 
            className="mt-3 h-1 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--theme-muted)' }}
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
    </div>
  );
}