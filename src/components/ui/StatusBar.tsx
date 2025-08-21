import { memo, useMemo } from 'react';
import { StatusBarDropdown, type StatusBarSection } from './StatusBarDropdown';

interface StatusBarProps {
  currentContent: string;
  selectedFile: string | null;
  plugins: ReadonlyMap<string, any>;
  className?: string;
}

export const StatusBar = memo(function StatusBar({
  currentContent,
  selectedFile,
  plugins,
  className = ''
}: StatusBarProps) {
  if (!selectedFile) {
    return null;
  }

  const sections = useMemo(() => {
    const sectionList: StatusBarSection[] = [];
    
    const defaultActions = [];
    
    defaultActions.push({
      id: 'rename-note',
      label: 'Renomear nota',
      iconName: 'edit',
      onClick: () => console.log('Rename note clicked'),
      disabled: false
    });
    
    defaultActions.push({
      id: 'delete-note',
      label: 'Excluir nota',
      iconName: 'trash-2',
      onClick: () => console.log('Delete note clicked'),
      disabled: false
    });
    
    if (defaultActions.length > 0) {
      sectionList.push({
        id: 'default',
        label: 'Aplicativo',
        actions: defaultActions
      });
    }
    
    const pluginActions = [];

    for (const plugin of plugins.values()) {
      if (plugin.enabled && plugin.statusBarItems) {
        for (const item of plugin.statusBarItems.values()) {
          pluginActions.push({
            id: item.id,
            label: item.text,
            iconName: item.iconName,
            onClick: item.callback || (() => {}),
            disabled: false
          });
        }
      }
    }
    
    if (pluginActions.length > 0) {
      sectionList.push({
        id: 'plugins',
        label: 'Plugins',
        actions: pluginActions
      });
    }
    
    return sectionList;
  }, [currentContent, selectedFile, plugins]);

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 right-4 z-20 p-2 ${className}`}>
      <StatusBarDropdown sections={sections} />
    </div>
  );
});