import { createContext, useContext, useCallback, useRef, ReactNode, memo } from 'react';

interface ErrorInfo {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

interface ErrorContextType {
  showError: (error: ErrorInfo) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// Singleton para gerenciar o modal globalmente sem re-renders
class ErrorManager {
  private static instance: ErrorManager;
  private modalElement: HTMLDivElement | null = null;
  private currentError: ErrorInfo | null = null;

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  showError(error: ErrorInfo) {
    this.currentError = error;
    this.renderModal();
  }

  hideError() {
    this.currentError = null;
    this.removeModal();
  }

  private renderModal() {
    // Implementação direta do DOM para máxima performance
    if (!this.modalElement) {
      this.modalElement = document.createElement('div');
      this.modalElement.id = 'error-modal-root';
      document.body.appendChild(this.modalElement);
    }

    const error = this.currentError!;
    this.modalElement.innerHTML = `
      <div class="error-modal-overlay fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
        <div class="error-modal theme-card max-w-md w-11/12 overflow-hidden rounded-lg shadow-2xl">
          <div class="flex items-center gap-2 p-4 pb-0 relative">
            <div class="error-modal-icon-error w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 class="text-base font-semibold theme-text-primary flex-1 m-0">${error.title || 'Ops! Algo não saiu como esperado'}</h2>
            <button id="error-modal-close" class="absolute top-3 right-3 p-1 rounded theme-text-muted hover:theme-bg-accent theme-transition">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="px-4 py-3">
            <p class="theme-text-primary text-xs leading-relaxed mb-0">${error.message}</p>
          </div>
          <div class="flex gap-2 px-4 pb-4 justify-end">
            ${error.details ? `
              <button id="error-modal-copy" class="theme-button-secondary flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copiar erro
              </button>
            ` : ''}
            ${error.onRetry ? `
              <button id="error-modal-retry" class="theme-button flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
                Tentar novamente
              </button>
            ` : ''}
            <button id="error-modal-close-btn" class="theme-button flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded theme-transition">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners() {
    const closeBtn = document.getElementById('error-modal-close');
    const closeBtnMain = document.getElementById('error-modal-close-btn');
    const copyBtn = document.getElementById('error-modal-copy');
    const retryBtn = document.getElementById('error-modal-retry');

    const close = () => this.hideError();

    closeBtn?.addEventListener('click', close);
    closeBtnMain?.addEventListener('click', close);

    if (copyBtn && this.currentError?.details) {
      copyBtn.addEventListener('click', async () => {
        const errorText = `${this.currentError?.title || 'Erro'}\n\n${this.currentError?.message}\n\n${this.currentError?.details || ''}`;
        try {
          await navigator.clipboard.writeText(errorText);
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Copiado!
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copiar erro
            `;
          }, 2000);
        } catch (error) {
          console.error('Erro ao copiar:', error);
        }
      });
    }

    if (retryBtn && this.currentError?.onRetry) {
      retryBtn.addEventListener('click', () => {
        this.currentError?.onRetry?.();
        this.hideError();
      });
    }
  }

  private removeModal() {
    if (this.modalElement) {
      this.modalElement.remove();
      this.modalElement = null;
    }
  }
}

interface ErrorProviderProps {
  children: ReactNode;
}

export const ErrorProvider = memo(function ErrorProvider({ children }: ErrorProviderProps) {
  const errorManager = useRef(ErrorManager.getInstance()).current;

  const showError = useCallback((error: ErrorInfo) => {
    errorManager.showError(error);
  }, [errorManager]);

  const contextValue = useRef({ showError }).current;

  return (
    <ErrorContext.Provider value={contextValue}>
      {children}
    </ErrorContext.Provider>
  );
});

export const useError = () => {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};