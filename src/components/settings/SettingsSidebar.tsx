import { Palette, FileText, Settings } from 'lucide-react';
import { SettingsSection } from './SettingsModal';
import { useAppearance } from '../../contexts/AppearanceContext';

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
  const { currentTheme } = useAppearance();
  
  return (
    <div 
      className="w-48"
      style={{ 
        borderRight: `1px solid ${currentTheme.border}`,
        backgroundColor: currentTheme.muted
      }}
    >
      <nav className="p-2">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? currentTheme.accent : 'transparent',
                color: isActive ? currentTheme.primary : currentTheme.foreground
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = currentTheme.accent;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
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