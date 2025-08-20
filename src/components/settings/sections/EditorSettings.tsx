import { memo, useMemo, useCallback } from 'react';
import { useWorkspaceConfig, useConfigStore } from '../../../stores/configStore';
import { ToggleSwitch } from '../ToggleSwitch';

const EditorSettings = memo(() => {
  const workspaceConfig = useWorkspaceConfig();
  const { updateWorkspaceConfig } = useConfigStore();
  
  // Extract values with defaults
  const vimMode = workspaceConfig?.vimMode ?? false;
  const showLineNumbers = workspaceConfig?.showLineNumbers ?? true;
  const highlightCurrentLine = workspaceConfig?.highlightCurrentLine ?? true;
  const readOnly = workspaceConfig?.readOnly ?? false;
  const githubMarkdown = workspaceConfig?.githubMarkdown ?? false;
  const pasteUrlsAsLinks = workspaceConfig?.pasteUrlsAsLinks ?? true;
  const showEditorFooter = workspaceConfig?.showEditorFooter ?? true;

  // Memoize loading component
  const LoadingComponent = useMemo(() => (
    <div className="space-y-5">
      <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--text-accent)' }}></div>
        <p className="text-xs">Carregando configurações...</p>
      </div>
    </div>
  ), []);

  // Memoize toggle handlers
  const handleVimMode = useCallback((value: boolean) => {
    updateWorkspaceConfig({ vimMode: value });
  }, [updateWorkspaceConfig]);

  const handleShowLineNumbers = useCallback((value: boolean) => {
    updateWorkspaceConfig({ showLineNumbers: value });
  }, [updateWorkspaceConfig]);

  const handleHighlightCurrentLine = useCallback((value: boolean) => {
    updateWorkspaceConfig({ highlightCurrentLine: value });
  }, [updateWorkspaceConfig]);

  const handleReadOnly = useCallback((value: boolean) => {
    updateWorkspaceConfig({ readOnly: value });
  }, [updateWorkspaceConfig]);

  const handleGithubMarkdown = useCallback((value: boolean) => {
    updateWorkspaceConfig({ githubMarkdown: value });
  }, [updateWorkspaceConfig]);

  const handlePasteUrlsAsLinks = useCallback((value: boolean) => {
    updateWorkspaceConfig({ pasteUrlsAsLinks: value });
  }, [updateWorkspaceConfig]);

  const handleShowEditorFooter = useCallback((value: boolean) => {
    updateWorkspaceConfig({ showEditorFooter: value });
  }, [updateWorkspaceConfig]);


  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          Editor
        </h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Configure o comportamento e aparência do editor de texto
        </p>
      </div>

      <div 
        className="rounded-md border overflow-hidden"
        style={{ 
          borderColor: 'var(--theme-border)',
          backgroundColor: 'var(--theme-background)' 
        }}
      >
        <ToggleSwitch
          label="Modo Vim"
          description="Habilita atalhos e navegação no estilo Vim"
          checked={vimMode}
          onChange={handleVimMode}
        />
        
        <ToggleSwitch
          label="Números de Linha"
          description="Mostra números de linha no editor"
          checked={showLineNumbers}
          onChange={handleShowLineNumbers}
        />
        
        <ToggleSwitch
          label="Destacar Linha Atual"
          description="Destaca a linha onde está o cursor"
          checked={highlightCurrentLine}
          onChange={handleHighlightCurrentLine}
        />
        
        <ToggleSwitch
          label="Modo Somente Leitura"
          description="Impede edição de arquivos"
          checked={readOnly}
          onChange={handleReadOnly}
        />
        
        <ToggleSwitch
          label="GitHub Flavored Markdown"
          description="Habilita recursos GFM como tabelas, strikethrough e task lists"
          checked={githubMarkdown}
          onChange={handleGithubMarkdown}
        />
        
        <ToggleSwitch
          label="Colar URLs como Links"
          description="Transforma automaticamente URLs coladas em links markdown"
          checked={pasteUrlsAsLinks}
          onChange={handlePasteUrlsAsLinks}
        />
        
        <div style={{ borderBottom: 'none' }}>
          <ToggleSwitch
            label="Mostrar Footer do Editor"
            description="Exibe estatísticas e controles na parte inferior direita da tela"
            checked={showEditorFooter}
            onChange={handleShowEditorFooter}
          />
        </div>
      </div>
    </div>
  );
});

EditorSettings.displayName = 'EditorSettings';

export { EditorSettings };