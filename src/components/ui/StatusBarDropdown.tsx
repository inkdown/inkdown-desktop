import { memo, useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';
import { useIcon } from '../../utils/iconUtils';

export interface StatusBarAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  iconName?: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface StatusBarSection {
  id: string;
  label: string;
  actions: StatusBarAction[];
}

interface StatusBarDropdownProps {
  sections: StatusBarSection[];
  className?: string;
  disabled?: boolean;
}

export const StatusBarDropdown = memo(function StatusBarDropdown({
  sections,
  className = '',
  disabled = false
}: StatusBarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const ActionIcon = memo(({ action }: { action: StatusBarAction }) => {
    const dynamicIcon = useIcon(action.iconName || '', 12);
    
    if (action.icon) {
      return <span className="flex-shrink-0">{action.icon}</span>;
    }
    
    if (dynamicIcon) {
      return <span className="flex-shrink-0">{dynamicIcon}</span>;
    }
    
    return null;
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action: StatusBarAction) => {
    if (!action.disabled) {
      action.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={disabled}
        className="p-0.5 rounded transition-colors duration-150"
        style={{
          color: isOpen ? 'var(--text-accent)' : 'var(--text-secondary)',
          backgroundColor: isOpen ? 'var(--theme-muted)' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.backgroundColor = 'var(--theme-muted)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !isOpen) {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
        title="Mais opções"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full right-0 mb-1 min-w-[140px] py-1 rounded-md shadow-lg text-xs z-50"
          style={{
            backgroundColor: 'var(--theme-secondary)',
            border: '1px solid var(--theme-border)'
          }}
        >
          {sections.map((section, sectionIndex) => (
            <div key={section.id}>
              {sectionIndex > 0 && (
                <div className="h-px my-2" style={{ backgroundColor: 'var(--theme-border)' }} />
              )}
              
              <div 
                className="px-2 py-1 text-[10px] font-medium tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                {section.label}
              </div>
              
              {section.actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled}
                  className="w-full px-2 py-1 text-left flex hover:cursor-pointer items-center gap-1.5 transition-colors duration-150 rounded"
                  style={{
                    color: action.disabled ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    if (!action.disabled) {
                      e.currentTarget.style.backgroundColor = 'var(--theme-muted)';
                      e.currentTarget.style.color = 'var(--text-accent)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!action.disabled) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                >
                  <ActionIcon action={action} />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});