import { Palette, FileText, Settings, FolderOpen } from 'lucide-react';
import { SettingsSection } from './SettingsModal';
import { useAppearance } from '../../contexts/AppearanceContext';

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

const sections = [
  {
    id: 'workspace' as const,
    label: 'Workspace',
    icon: FolderOpen,
  },
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
      className="w-40"
      style={{ 
        borderRight: `1px solid ${currentTheme.border}`,
        backgroundColor: currentTheme.background
      }}
    >
      <nav className="p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? currentTheme.muted : 'transparent',
                color: isActive ? currentTheme.primary : currentTheme.mutedForeground
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = currentTheme.muted;
                  e.currentTarget.style.color = currentTheme.foreground;
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = currentTheme.mutedForeground;
                }
              }}
            >
              <Icon size={14} />
              {section.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}