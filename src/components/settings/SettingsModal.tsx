import { useState } from 'react';
import { X } from 'lucide-react';
import { SettingsSidebar } from './SettingsSidebar';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { EditorSettings } from './sections/EditorSettings';
import { PreferencesSettings } from './sections/PreferencesSettings';

export type SettingsSection = 'appearance' | 'editor' | 'preferences';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
}

export function SettingsModal({ isOpen, onClose, initialSection = 'appearance' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'editor':
        return <EditorSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      default:
        return <AppearanceSettings />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-[800px] h-[600px] max-w-[90vw] max-h-[90vh] flex overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Configurações
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex w-full pt-16">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          
          <div className="flex-1 p-6 overflow-y-auto">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}