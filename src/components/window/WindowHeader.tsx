import { memo, useState } from 'react';
import { FileText, Settings } from 'lucide-react';
import { SettingsModal } from '../settings';

interface WindowHeaderProps {
  selectedFile: string;
}

export const WindowHeader = memo(function WindowHeader({ selectedFile }: WindowHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileName = selectedFile.split('/').pop();

  return (
    <>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText size={16} className="text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </h2>
          </div>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Configurações"
          >
            <Settings size={16} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
});