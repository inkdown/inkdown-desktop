import { memo, useState, useEffect, useCallback } from 'react';
import { X, Save } from 'lucide-react';
import { pluginManager } from '../../services/PluginManager';
// Plugin settings types (simplified for now)
interface PluginSettingsConfig {
  groups: SettingGroup[];
}

interface SettingGroup {
  id: string;
  name: string;
  description?: string;
  collapsible?: boolean;
  settings: SettingDefinition[];
}

interface SettingDefinition {
  key: string;
  name: string;
  description?: string;
  type: 'text' | 'number' | 'boolean' | 'dropdown' | 'password' | 'slider' | 'textarea' | 'color';
  defaultValue: any;
}
import { cacheUtils } from '../../utils/localStorage';
import { ToggleSwitch } from './ToggleSwitch';

interface PluginSettingsModalProps {
  pluginId: string;
  onClose: () => void;
}

export const PluginSettingsModal = memo(function PluginSettingsModal({
  pluginId,
  onClose
}: PluginSettingsModalProps) {
  const [config, setConfig] = useState<PluginSettingsConfig | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const pluginConfig = pluginManager.getPluginSettings(pluginId);
        const currentSettings = cacheUtils.getPluginSettings(pluginId);
        
        if (pluginConfig) {
          setConfig(pluginConfig);
          
          // Initialize with default values if not set
          const initialSettings = { ...currentSettings };
          pluginConfig.groups.forEach((group: SettingGroup) => {
            group.settings.forEach((setting: SettingDefinition) => {
              if (!(setting.key in initialSettings)) {
                initialSettings[setting.key] = setting.defaultValue;
              }
            });
          });
          
          setSettings(initialSettings);
        }
      } catch (error) {
        console.error('Failed to load plugin settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [pluginId]);

  const handleSettingChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      console.log(`💾 [PluginSettingsModal] Saving settings for plugin: ${pluginId}`, settings);
      
      // Save using the enhanced API which handles both cache and file system
      const saved = await pluginManager.savePluginSettings(pluginId, settings);
      if (saved) {
        console.log(`✅ [PluginSettingsModal] Settings saved successfully for ${pluginId}`);
      } else {
        console.error(`❌ [PluginSettingsModal] Failed to save settings for ${pluginId}`);
        // Still proceed with plugin reload
      }
      
      // Notify the plugin instance to reload its settings
      const reloaded = await pluginManager.reloadPluginSettings(pluginId);
      if (reloaded) {
        console.log(`🔄 [PluginSettingsModal] Plugin ${pluginId} settings reloaded successfully`);
      } else {
        console.warn(`⚠️ [PluginSettingsModal] Plugin ${pluginId} could not reload settings (plugin may not be loaded)`);
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save plugin settings:', error);
      // TODO: Show error notification to user
    } finally {
      setSaving(false);
    }
  }, [pluginId, settings, onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="w-96 p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-background)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
                 style={{ borderColor: 'var(--theme-primary)' }}></div>
            <p style={{ color: 'var(--theme-muted-foreground)' }}>Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="w-96 p-6 rounded-lg" style={{ backgroundColor: 'var(--theme-background)' }}>
          <div className="text-center">
            <p style={{ color: 'var(--theme-foreground)' }}>Nenhuma configuração encontrada para este plugin.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--theme-primary)',
                color: 'var(--theme-primary-foreground)'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const plugin = pluginManager.getPlugin(pluginId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl max-h-[80vh] m-4 rounded-lg shadow-xl" 
           style={{ backgroundColor: 'var(--theme-background)' }}>
        
        <div className="flex items-center justify-between p-6 border-b" 
             style={{ borderColor: 'var(--theme-border)' }}>
          <div>
            <h2 className="text-xl font-semibold" style={{ color: 'var(--theme-foreground)' }}>
              Configurações do Plugin
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--theme-muted-foreground)' }}>
              {plugin?.manifest.name} v{plugin?.manifest.version}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: 'var(--theme-muted)' }}
          >
            <X className="w-5 h-5" style={{ color: 'var(--theme-muted-foreground)' }} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {config.groups.map((group) => (
              <SettingsGroupComponent
                key={group.id}
                group={group}
                settings={settings}
                onSettingChange={handleSettingChange}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t" 
             style={{ borderColor: 'var(--theme-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--theme-secondary)',
              color: 'var(--theme-secondary-foreground)'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'var(--theme-primary-foreground)'
            }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
});

interface SettingsGroupComponentProps {
  group: SettingGroup;
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
}

const SettingsGroupComponent = memo(function SettingsGroupComponent({
  group,
  settings,
  onSettingChange
}: SettingsGroupComponentProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="space-y-4">
      <div 
        className={`flex items-center gap-2 ${group.collapsible ? 'cursor-pointer' : ''}`}
        onClick={() => group.collapsible && setIsCollapsed(!isCollapsed)}
      >
        <h3 className="text-lg font-medium" style={{ color: 'var(--theme-foreground)' }}>
          {group.name}
        </h3>
        {group.collapsible && (
          <span className={`transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
            ▼
          </span>
        )}
      </div>
      
      {group.description && (
        <p className="text-sm" style={{ color: 'var(--theme-muted-foreground)' }}>
          {group.description}
        </p>
      )}

      {!isCollapsed && (
        <div className="space-y-4">
          {group.settings.map((setting) => (
            <SettingComponent
              key={setting.key}
              setting={setting}
              value={settings[setting.key] ?? setting.defaultValue}
              onChange={(value) => onSettingChange(setting.key, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface SettingComponentProps {
  setting: SettingDefinition;
  value: any;
  onChange: (value: any) => void;
}

const SettingComponent = memo(function SettingComponent({
  setting,
  value,
  onChange
}: SettingComponentProps) {
  const renderInput = () => {
    switch (setting.type) {
      case 'text':
      case 'password':
        return (
          <input
            type={setting.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={(setting as any).placeholder}
            maxLength={(setting as any).maxLength}
            className="w-full p-2 rounded border"
            style={{
              backgroundColor: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-foreground)'
            }}
          />
        );

      case 'number':
        const numberSetting = setting as any;
        return (
          <input
            type="number"
            value={value || 0}
            onChange={(e) => onChange(Number(e.target.value))}
            min={numberSetting.min}
            max={numberSetting.max}
            step={numberSetting.step}
            className="w-full p-2 rounded border"
            style={{
              backgroundColor: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-foreground)'
            }}
          />
        );

      case 'slider':
        const sliderSetting = setting as any;
        return (
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={value || sliderSetting.min || 0}
              onChange={(e) => onChange(Number(e.target.value))}
              min={sliderSetting.min}
              max={sliderSetting.max}
              step={sliderSetting.step || 1}
              className="flex-1"
            />
            <span className="text-sm w-12 text-center" style={{ color: 'var(--theme-foreground)' }}>
              {value}
            </span>
          </div>
        );

      case 'boolean':
        return (
          <ToggleSwitch
            label=''
            checked={value || false}
            onChange={onChange}
          />
        );

      case 'dropdown':
        const dropdownSetting = setting as any;
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 rounded border"
            style={{
              backgroundColor: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-foreground)'
            }}
          >
            {dropdownSetting.options.map((option: any) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'textarea':
        const textareaSetting = setting as any;
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={textareaSetting.placeholder}
            rows={textareaSetting.rows || 4}
            className="w-full p-2 rounded border resize-vertical"
            style={{
              backgroundColor: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-foreground)'
            }}
          />
        );

      case 'color':
        return (
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-10 rounded border"
            style={{
              borderColor: 'var(--theme-border)'
            }}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-2 rounded border"
            style={{
              backgroundColor: 'var(--theme-input)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-foreground)'
            }}
          />
        );
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--theme-foreground)' }}>
          {setting.name}
        </label>
        {setting.description && (
          <p className="text-xs" style={{ color: 'var(--theme-muted-foreground)' }}>
            {setting.description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 w-48">
        {renderInput()}
      </div>
    </div>
  );
});