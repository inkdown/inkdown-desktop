import { useAppearance } from '../../../contexts/AppearanceContext';

export function EditorSettings() {
  const { vimMode, showLineNumbers, highlightCurrentLine, readOnly, updateWorkspace, isLoading } = useAppearance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  const handleToggle = (key: 'vimMode' | 'showLineNumbers' | 'highlightCurrentLine' | 'readOnly', value: boolean) => {
    updateWorkspace({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Editor
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Configure o comportamento e aparência do editor de texto.
        </p>
      </div>

      {/* Vim Mode */}
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Modo Vim
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Habilita atalhos e navegação no estilo Vim
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={vimMode}
            onChange={(e) => handleToggle('vimMode', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Show Line Numbers */}
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Números de Linha
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Mostra números de linha no editor
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showLineNumbers}
            onChange={(e) => handleToggle('showLineNumbers', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Highlight Current Line */}
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Destacar Linha Atual
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Destaca a linha onde está o cursor
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={highlightCurrentLine}
            onChange={(e) => handleToggle('highlightCurrentLine', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Read Only */}
      <div className="flex items-center justify-between py-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">
            Modo Somente Leitura
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Impede edição de arquivos
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={readOnly}
            onChange={(e) => handleToggle('readOnly', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  );
}