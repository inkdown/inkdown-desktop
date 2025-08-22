import { useState, useCallback, useEffect } from "react";
import { ExternalLink, Github, Globe, Settings } from "lucide-react";
import { useWorkspaceConfig, useConfigStore, settingsManager } from "../../../stores/configStore";
import { openUrl } from "@tauri-apps/plugin-opener"

interface AppInfo {
  version: string;
  repoUrl: string;
  siteUrl: string;
}

const APP_INFO: AppInfo = {
  version: "0.2.1",
  repoUrl: "https://github.com/inkdown/inkdown-desktop",
  siteUrl: "https://inkdown.vercel.app/"
};

export function AppSettings() {
  const workspaceConfig = useWorkspaceConfig();
  const { updateWorkspaceConfig } = useConfigStore();
  const devModeValue = settingsManager.getWorkspaceSetting('devMode', workspaceConfig);
  const [devMode, setDevMode] = useState(devModeValue);

  useEffect(() => {
    setDevMode(devModeValue);
  }, [devModeValue]);

  const handleDevModeChange = useCallback(async (enabled: boolean) => {
    setDevMode(enabled);
    await updateWorkspaceConfig({ devMode: enabled });
  }, [updateWorkspaceConfig]);

  return (
    <div className="space-y-6">
      <div>
        <h3 
          className="text-base font-medium mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Sobre o Aplicativo
        </h3>
        
        <div className="space-y-4">
          {/* Versão */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Versão
              </div>
              <div 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Versão atual do inkdown
              </div>
            </div>
            <div 
              className="text-sm font-mono px-2 py-1 rounded"
              style={{ 
                backgroundColor: 'var(--theme-muted)',
                color: 'var(--text-primary)',
                border: '1px solid var(--theme-border)'
              }}
            >
              v{APP_INFO.version}
            </div>
          </div>

          {/* Repositório */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Código Fonte
              </div>
              <div 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Repositório no GitHub
              </div>
            </div>
            <button
              onClick={() => openUrl(APP_INFO.repoUrl)}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-accent-foreground)',
                border: 'none'
              }}
            >
              <Github size={14} />
              GitHub
              <ExternalLink size={12} />
            </button>
          </div>

          {/* Site */}
          <div className="flex items-center justify-between py-2">
            <div>
              <div 
                className="font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Site Oficial
              </div>
              <div 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Documentação e recursos
              </div>
            </div>
            <button
              onClick={() => openUrl(APP_INFO.siteUrl)}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-all hover:opacity-80"
              style={{ 
                backgroundColor: 'var(--theme-accent)',
                color: 'var(--theme-accent-foreground)',
                border: 'none'
              }}
            >
              <Globe size={14} />
              Site
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Separador */}
      <div 
        style={{ 
          height: '1px',
          backgroundColor: 'var(--theme-border)',
          margin: '24px 0'
        }}
      />

      {/* Configurações de Desenvolvedor */}
      <div>
        <h3 
          className="text-base font-medium mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Configurações de Desenvolvedor
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <div 
                className="font-medium flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}
              >
                <Settings size={16} />
                Modo Desenvolvedor
              </div>
              <div 
                className="text-sm mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Ativa funcionalidades avançadas e logs detalhados. Útil para depuração e desenvolvimento.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => handleDevModeChange(e.target.checked)}
                className="sr-only peer"
              />
              <div 
                className="w-11 h-6 rounded-full peer transition-all duration-200 ease-in-out peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"
                style={{
                  backgroundColor: devMode ? 'var(--theme-accent)' : 'var(--theme-muted)',
                  border: '1px solid var(--theme-border)'
                }}
              />
            </label>
          </div>

          {devMode && (
            <div 
              className="text-xs p-3 rounded"
              style={{ 
                backgroundColor: 'var(--theme-muted)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--theme-border)'
              }}
            >
              <strong>Modo Desenvolvedor Ativo:</strong> Console de debug disponível, logs detalhados e funcionalidades experimentais ativadas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
