import { memo } from 'react';
import { WindowContent } from './WindowContent';
import { WelcomeScreen } from './WelcomeScreen';

interface MainWindowProps {
  selectedFile: string | null;
  onFilePathChange?: (newPath: string) => void;
  onToggleSidebar: () => void;
  onSelectNote?: (notePath: string) => void;
  workspaceConfig: any;
  themeMode: string;
  onSaveRef: React.MutableRefObject<(() => void) | null>;
  onTogglePreviewRef?: React.MutableRefObject<(() => void) | null>;
}

export const MainWindow = memo(function MainWindow({ 
  selectedFile, 
  onFilePathChange, 
  onToggleSidebar, 
  onSelectNote, 
  workspaceConfig, 
  themeMode,
  onSaveRef,
  onTogglePreviewRef
}: MainWindowProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 pt-8 h-full overflow-hidden">
      {selectedFile ? (
        <WindowContent 
          selectedFile={selectedFile} 
          onFilePathChange={onFilePathChange}
          onToggleSidebar={onToggleSidebar}
          onSelectNote={onSelectNote}
          workspaceConfig={workspaceConfig}
          themeMode={themeMode}
          onSaveRef={onSaveRef}
          onTogglePreviewRef={onTogglePreviewRef}
        />
      ) : (
        <WelcomeScreen />
      )}
    </div>
  );
});