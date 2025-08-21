import { memo, useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { pluginManager } from '../../services/PluginManager';

interface PluginSettingsModalProps {
  pluginId: string;
  onClose: () => void;
}

export const PluginSettingsModal = memo(function PluginSettingsModal({
  pluginId,
  onClose
}: PluginSettingsModalProps) {
  const [hasSettings, setHasSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if plugin has settings
  useEffect(() => {
    const checkSettings = () => {
      const settingsCallback = pluginManager.getPluginSettingsCallback(pluginId);
      setHasSettings(!!settingsCallback);
      setLoading(false);
    };

    checkSettings();
  }, [pluginId]);

  // Render settings when container becomes available
  useEffect(() => {
    const renderSettings = async () => {
      if (!hasSettings || !containerRef.current || loading) {
        return;
      }

      try {
        const settingsCallback = pluginManager.getPluginSettingsCallback(pluginId);
        
        if (settingsCallback) {          
          await pluginManager.reloadPluginSettings(pluginId);
          
          // Clear container and render fresh settings
          containerRef.current.innerHTML = '';
          
          try {
            settingsCallback(containerRef.current);
            
          } catch (callbackError) {
            console.error(`[PluginSettingsModal] Settings callback failed for ${pluginId}:`, callbackError);
          }
        }
      } catch (error) {
        console.error(`[PluginSettingsModal] Failed to render plugin settings for ${pluginId}:`, error);
      }
    };

    renderSettings();
  }, [pluginId, hasSettings, loading]);

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

  if (!hasSettings) {
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
          <div ref={containerRef} className="space-y-4">
            {/* Settings will be rendered here by the plugin callback */}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t" 
             style={{ borderColor: 'var(--theme-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg transition-colors"
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
});