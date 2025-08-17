import { memo } from 'react';

interface ToggleSwitchProps {
  label?: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const ToggleSwitch = memo<ToggleSwitchProps>(({
  label,
  description,
  checked,
  onChange,
  disabled = false
}) => {
  return (
    <div 
      className="flex items-center justify-between px-3 py-2.5"
      style={{ borderBottom: '1px solid var(--theme-border)' }}
    >
      {(label || description) && (
        <div>
          {label && (
            <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {label}
            </div>
          )}
          {description && (
            <div className="text-xs leading-tight" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </div>
          )}
        </div>
      )}
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div 
          className="w-8 h-4 rounded-full peer-focus:outline-none peer-focus:ring-1 peer-focus:ring-opacity-50 peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:rounded-full after:h-3 after:w-3 after:transition-all"
          style={{
            backgroundColor: checked ? 'var(--text-accent)' : 'var(--theme-muted)',
            border: '1px solid var(--theme-border)',
          }}
        >
          <div 
            className="absolute top-[1px] left-[1px] bg-white rounded-full h-3 w-3 transition-transform"
            style={{
              transform: checked ? 'translateX(16px)' : 'translateX(0)',
              backgroundColor: 'var(--theme-background)'
            }}
          />
        </div>
      </label>
    </div>
  );
});

ToggleSwitch.displayName = 'ToggleSwitch';

export { ToggleSwitch };