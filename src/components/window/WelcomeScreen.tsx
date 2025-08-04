import { memo } from 'react';
import { Edit3 } from 'lucide-react';

export const WelcomeScreen = memo(function WelcomeScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Edit3 size={64} className="mx-auto mb-4 text-gray-400" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Bem-vindo ao inkdown
        </h2>
        <p className="text-gray-500">
          Selecione um arquivo .md na sidebar para começar a editar
        </p>
      </div>
    </div>
  );
});