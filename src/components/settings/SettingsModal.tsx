import { useState } from 'react';
import { X } from 'lucide-react';
import { SettingsSidebar } from './SettingsSidebar';
import { WorkspaceSettings } from './sections/WorkspaceSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { EditorSettings } from './sections/EditorSettings';
import { PreferencesSettings } from './sections/PreferencesSettings';
import { useAppearance } from '../../contexts/AppearanceContext';

export type SettingsSection = 'workspace' | 'appearance' | 'editor' | 'preferences';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSection?: SettingsSection;
}

export function SettingsModal({ isOpen, onClose, initialSection = 'workspace' }: SettingsModalProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const { currentTheme } = useAppearance();

  if (!isOpen) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'workspace':
        return <WorkspaceSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'editor':
        return <EditorSettings />;
      case 'preferences':
        return <PreferencesSettings />;
      default:
        return <WorkspaceSettings />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      
      <div 
        className="relative rounded-lg shadow-xl w-[700px] h-[500px] max-w-[90vw] max-h-[85vh] flex overflow-hidden"
        style={{ backgroundColor: currentTheme.background }}
      >
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-10"
          style={{ 
            borderBottom: `1px solid ${currentTheme.border}`,
            backgroundColor: currentTheme.background
          }}
        >
          <h2 
            className="text-sm font-medium"
            style={{ color: currentTheme.foreground }}
          >
            Configurações
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors hover:opacity-70"
            style={{ 
              color: currentTheme.mutedForeground,
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex w-full pt-12">
          <SettingsSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />
          
          <div className="flex-1 p-4 overflow-y-auto">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}