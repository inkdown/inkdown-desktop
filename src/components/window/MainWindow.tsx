import { memo } from 'react';
import { WindowContent } from './WindowContent';
import { WelcomeScreen } from './WelcomeScreen';

interface MainWindowProps {
  selectedFile: string | null;
  onFilePathChange?: (newPath: string) => void;
  onToggleSidebar: () => void;
  onSelectNote?: (notePath: string) => void;
  workspaceConfig: any;
  currentTheme: any;
  themeMode: string;
  onSaveRef: React.MutableRefObject<(() => void) | null>;
}

export const MainWindow = memo(function MainWindow({ 
  selectedFile, 
  onFilePathChange, 
  onToggleSidebar, 
  onSelectNote, 
  workspaceConfig, 
  currentTheme, 
  themeMode,
  onSaveRef 
}: MainWindowProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      {selectedFile ? (
        <div className="h-full flex flex-col">
          <WindowContent 
            selectedFile={selectedFile} 
            onFilePathChange={onFilePathChange}
            onToggleSidebar={onToggleSidebar}
            onSelectNote={onSelectNote}
            workspaceConfig={workspaceConfig}
            currentTheme={currentTheme}
            themeMode={themeMode}
            onSaveRef={onSaveRef}
          />
        </div>
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
});