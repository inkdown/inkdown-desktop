import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import { Settings, AlertCircle, RefreshCw } from 'lucide-react';
import { usePlugins, usePluginLoading, usePluginError, usePluginStore } from '../../../stores/pluginStore';
import type { LoadedPlugin } from '../../../plugins/types/plugin';
import { PluginSettingsModal } from '../PluginSettingsModal';
import { ToggleSwitch } from '../ToggleSwitch';
import { cacheUtils } from '../../../utils/localStorage';

export const PluginsSettings = memo(function PluginsSettings() {
  const enginePlugins = usePlugins();
  const loading = usePluginLoading();
  const error = usePluginError();
  const { refreshPlugins, enablePlugin, disablePlugin } = usePluginStore();
  
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (enginePlugins.size === 0 && !loading) {
      console.log('🔍 [PluginsSettings] No plugins loaded, performing initial scan for settings UI');
      refreshPlugins();
    }
  }, []);

  const plugins = useMemo((): LoadedPlugin[] => {
    return Array.from(enginePlugins.values()).map(plugin => ({
      manifest: {
        ...plugin.manifest,
        keywords: plugin.manifest.keywords ? [...plugin.manifest.keywords] : undefined
      },
      instance: plugin.instance,
      enabled: plugin.enabled,
      loaded: plugin.loaded,
      error: plugin.error,
      settingsConfig: plugin.settingsConfig,
      permissions: plugin.manifest.permissions || [],
      shortcuts: plugin.shortcuts || new Map(),
      commands: plugin.commands || new Map(),
      statusBarItems: plugin.statusBarItems || new Map()
    }));
  }, [enginePlugins]);

  const handleTogglePlugin = useCallback(async (pluginId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await enablePlugin(pluginId);
      } else {
        await disablePlugin(pluginId);
      }
    } catch (err) {
      console.error('Failed to toggle plugin:', err);
    }
  }, [enablePlugin, disablePlugin]);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshPlugins();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPlugins]);

  const handleOpenSettings = useCallback((pluginId: string) => {
    setSelectedPlugin(pluginId);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setSelectedPlugin(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-muted-foreground)' }}>
          <RefreshCw className="w-4 h-4 animate-spin" />
          Carregando plugins...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border" style={{
        backgroundColor: 'var(--theme-destructive)',
        borderColor: 'var(--theme-destructive)',
        color: 'var(--theme-destructive-foreground)'
      }}>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Erro ao carregar plugins</span>
        </div>
        <p className="text-sm mt-1 opacity-90">{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-2 px-3 py-1 rounded text-xs bg-white/20 hover:bg-white/30 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-foreground)' }}>
              Plugins
            </h3>
            <p className="text-sm" style={{ color: 'var(--theme-muted-foreground)' }}>
              Gerencie seus plugins instalados
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--theme-secondary)',
              color: 'var(--theme-secondary-foreground)',
              borderColor: 'var(--theme-border)'
            }}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        {plugins.length === 0 ? (
          <div className="text-center p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--theme-muted)' }}>
              <Settings className="w-8 h-8" style={{ color: 'var(--theme-muted-foreground)' }} />
            </div>
            <h4 className="font-medium mb-2" style={{ color: 'var(--theme-foreground)' }}>
              Nenhum plugin encontrado
            </h4>
            <p className="text-sm" style={{ color: 'var(--theme-muted-foreground)' }}>
              Instale plugins na pasta de configuração do Inkdown para começar a usá-los.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {plugins.map((plugin) => (
              <PluginItem
                key={plugin.manifest.id}
                plugin={plugin}
                onToggle={handleTogglePlugin}
                onOpenSettings={handleOpenSettings}
                hasSettings={cacheUtils.getPluginHasSettings(plugin.manifest.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedPlugin && (
        <PluginSettingsModal
          pluginId={selectedPlugin}
          onClose={handleCloseSettings}
        />
      )}
    </>
  );
});

interface PluginItemProps {
  plugin: LoadedPlugin;
  onToggle: (pluginId: string, enabled: boolean) => void;
  onOpenSettings: (pluginId: string) => void;
  hasSettings: boolean;
}

const PluginItem = memo(function PluginItem({
  plugin,
  onToggle,
  onOpenSettings,
  hasSettings
}: PluginItemProps) {
  const handleToggle = useCallback(() => {
    onToggle(plugin.manifest.id, !plugin.enabled);

    if(plugin.error) {
      console.log(plugin.error);
    }

  }, [plugin.manifest.id, plugin.enabled, onToggle]);

  const handleSettingsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenSettings(plugin.manifest.id);
  }, [plugin.manifest.id, onOpenSettings]);

  return (
    <div
      className="p-4 rounded-lg border transition-colors"
      style={{
        backgroundColor: 'var(--theme-secondary)',
        borderColor: 'var(--theme-border)'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h4 className="font-medium truncate" style={{ color: 'var(--theme-foreground)' }}>
              {plugin.manifest.name}
            </h4>
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--theme-muted)',
                color: 'var(--theme-muted-foreground)'
              }}
            >
              v{plugin.manifest.version}
            </span>
            {plugin.error && (
              <span>
                <AlertCircle
                  className="w-4 h-4"
                  style={{ color: 'var(--theme-destructive)' }}
                />
                {plugin.error}
              </span>
            )}
          </div>
          <p className="text-sm mt-1 truncate" style={{ color: 'var(--theme-muted-foreground)' }}>
            {plugin.manifest.description}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--theme-muted-foreground)' }}>
            por {plugin.manifest.author}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasSettings && plugin.enabled && (
            <button
              onClick={handleSettingsClick}
              className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: 'var(--theme-muted)' }}
              title="Configurações do plugin"
            >
              <Settings className="w-4 h-4" style={{ color: 'var(--theme-muted-foreground)' }} />
            </button>
          )}

          <ToggleSwitch
            checked={plugin.enabled}
            onChange={handleToggle}
            disabled={!!plugin.error}
          />
        </div>
      </div>
    </div>
  );
});