import { memo } from 'react';
import { WindowContent } from './WindowContent';
import { WelcomeScreen } from './WelcomeScreen';
import { useAppearance } from '../../contexts/AppearanceContext';

interface MainWindowProps {
  selectedFile: string | null;
}

export const MainWindow = memo(function MainWindow({ selectedFile }: MainWindowProps) {
  useAppearance(); // Inicializa o provider

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {selectedFile ? (
        <div className="h-full flex flex-col">
          <WindowContent selectedFile={selectedFile} />
        </div>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
});