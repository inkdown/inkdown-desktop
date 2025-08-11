import { memo, useState } from 'react';
import { Copy, AlertCircle, X, RefreshCw } from 'lucide-react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export const ErrorModal = memo(function ErrorModal({
  isOpen,
  onClose,
  title = "Algo deu errado",
  message,
  details,
  onRetry
}: ErrorModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyError = async () => {
    const errorText = `${title}\n\n${message}\n\n${details || ''}`;
    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="error-modal-overlay fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="error-modal theme-card max-w-md w-11/12 overflow-hidden rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 pb-0 relative">
          <div className="error-modal-icon-error w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle size={18} />
          </div>
          <h2 className="text-base font-semibold theme-text-primary flex-1 m-0">{title}</h2>
          <button 
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded theme-text-muted hover:theme-bg-accent theme-transition"
            title="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <p className="theme-text-primary text-xs leading-relaxed mb-0">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4 justify-end">
          <button 
            onClick={handleCopyError}
            className="theme-button-secondary flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition"
          >
            <Copy size={12} />
            {copied ? 'Copiado!' : 'Copiar erro'}
          </button>
          
          {onRetry && (
            <button 
              onClick={onRetry}
              className="theme-button flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition"
            >
              <RefreshCw size={12} />
              Tentar novamente
            </button>
          )}
          
          <button 
            onClick={handleClose}
            className="theme-button flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
});