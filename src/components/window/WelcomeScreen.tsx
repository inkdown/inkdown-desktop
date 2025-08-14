import { memo, useMemo } from 'react';
import { Edit3 } from 'lucide-react';

export const WelcomeScreen = memo(function WelcomeScreen() {
  const isMac = useMemo(() => /Mac/.test(navigator.platform), []);

  return (
    <div 
      className="flex-1 flex items-center justify-center"
    >
      <div className="text-center">
        <Edit3 size={64} className="mx-auto mb-4 theme-text-muted" />
        <h2 className="text-xl font-semibold mb-2 theme-text-primary">
          Bem-vindo ao inkdown
        </h2>
        <p className="theme-text-muted mb-4">
          Selecione um arquivo para começar a editar
        </p>
        <div className="space-y-2 text-sm theme-text-muted text-center">
          <p className="flex items-center justify-center gap-2"> 
            Abrir paleta de notas
              ({isMac ? '⌘' : 'Ctrl'} + O)
            </p>
          <p className="flex items-center justify-center gap-2">
            Criar nova nota
              ({isMac ? '⌘' : 'Ctrl'} + N)
          </p>
        </div>
      </div>
    </div>
  );
});