import { memo } from 'react';
import { WindowHeader } from './WindowHeader';
import { WindowContent } from './WindowContent';
import { WelcomeScreen } from './WelcomeScreen';

interface MainWindowProps {
  selectedFile: string | null;
}

export const MainWindow = memo(function MainWindow({ selectedFile }: MainWindowProps) {
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