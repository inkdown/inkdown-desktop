import { Palette, FileText, Settings } from 'lucide-react';
import { SettingsSection } from './SettingsModal';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections = [
  {
    id: 'appearance' as const,
    label: 'Aparência',
    icon: Palette,
  },
  {
    id: 'editor' as const,
    label: 'Editor',
    icon: FileText,
  },
  {
    id: 'preferences' as const,
    label: 'Preferências',
    icon: Settings,
  },
];

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  return (
    <div className="w-48 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <nav className="p-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              <Icon size={16} />
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}