import { memo } from 'react';
import { Palette, FileText, Keyboard, FolderOpen, RefreshCw, Users, Info, Puzzle } from 'lucide-react';
import { SettingsSection } from './SettingsModal';

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
    label: 'Atalhos',
    icon: Keyboard,
  },
  {
    id: 'community' as const,
    label: 'Comunidade',
    icon: Users,
  },
  {
    id: 'plugins' as const,
    label: 'Plugins',
    icon: Puzzle,
  },
  {
    id: 'updates' as const,
    label: 'Atualizações',
    icon: RefreshCw,
  },
  {
    id: 'app' as const,
    label: 'Sobre o App',
    icon: Info,
  },
];

const SettingsSidebar = memo<SettingsSidebarProps>(({ activeSection, onSectionChange }) => {
  return (
    <div 
      className="w-44"
      style={{ 
        borderRight: '1px solid var(--sidebar-border)',
        backgroundColor: 'var(--sidebar-background)'
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
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--sidebar-active)' : 'transparent',
                color: isActive ? 'var(--text-accent)' : 'var(--text-secondary)',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
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
});

SettingsSidebar.displayName = 'SettingsSidebar';

export { SettingsSidebar };