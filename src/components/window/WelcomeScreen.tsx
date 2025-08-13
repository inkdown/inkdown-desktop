import { memo } from 'react';
import { Edit3 } from 'lucide-react';

export const WelcomeScreen = memo(function WelcomeScreen() {
  return (
    <div 
      className="flex-1 flex items-center justify-center"
    >
      <div className="text-center">
        <Edit3 size={64} className="mx-auto mb-4 theme-text-muted" />
        <h2 className="text-xl font-semibold mb-2 theme-text-primary">
          Bem-vindo ao inkdown
        </h2>
        <p className="theme-text-muted">
          Selecione um arquivo .md na sidebar para começar a editar
        </p>
      </div>
    </div>
  );
});