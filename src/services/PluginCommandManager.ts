export class PluginCommandManager {
  private globalShortcuts = new Map<string, () => void>();
  private globalCommands = new Map<string, () => void>();

  private normalizeShortcut(shortcut: string): string {
    return shortcut
      .split('+')
      .map(part => part.trim())
      .map(part => {
        const normalized = part.toLowerCase();
        switch(normalized) {
          case 'ctrl': case 'control': return 'Ctrl';
          case 'shift': return 'Shift';
          case 'alt': case 'option': return 'Alt';
          case 'cmd': case 'meta': case 'command': return 'Cmd';
          default: return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }
      })
      .join('+');
  }

  addShortcut(pluginId: string, shortcut: any, activeEditorAPI: any): () => void {
    const normalizedShortcut = this.normalizeShortcut(shortcut.shortcut);
    
    const executor = () => {
      try {
        if (shortcut.editorCallback && activeEditorAPI) {
          return shortcut.editorCallback(activeEditorAPI);
        } else if (shortcut.callback) {
          return shortcut.callback();
        } else if (shortcut.execute) {
          return shortcut.execute();
        }
      } catch (error) {
        console.error(`Error executing shortcut ${normalizedShortcut}:`, error);
      }
    };
    
    this.globalShortcuts.set(normalizedShortcut, executor);
    
    return () => {
      this.globalShortcuts.delete(normalizedShortcut);
    };
  }

  addCommand(pluginId: string, command: any, activeEditorAPI: any): () => void {
    const fullId = `${pluginId}.${command.id}`;
    
    const executor = () => {
      try {
        if (command.editorCallback && activeEditorAPI) {
          return command.editorCallback(activeEditorAPI);
        } else if (command.callback) {
          return command.callback();
        } else if (command.execute) {
          return command.execute();
        }
      } catch (error) {
        console.error(`Error executing command ${fullId}:`, error);
      }
    };
    
    this.globalCommands.set(fullId, executor);
    
    return () => {
      this.globalCommands.delete(fullId);
    };
  }

  async executeShortcut(shortcut: string, event: KeyboardEvent): Promise<boolean> {
    const normalizedShortcut = this.normalizeShortcut(shortcut);
    const handler = this.globalShortcuts.get(normalizedShortcut);
    
    if (handler) {
      try {
        await handler();
        event.preventDefault();
        return true;
      } catch (error) {
        console.error(`Failed to execute shortcut "${normalizedShortcut}":`, error);
      }
    }
    
    return false;
  }

  async executeCommand(commandId: string): Promise<boolean> {
    const handler = this.globalCommands.get(commandId);
    if (handler) {
      try {
        await handler();
        return true;
      } catch (error) {
        console.error('Failed to execute command:', error);
      }
    }
    return false;
  }

  clearPluginCommands(pluginId: string): void {
    // Remove commands for this plugin
    for (const [command] of this.globalCommands.entries()) {
      if (command.startsWith(pluginId + '.')) {
        this.globalCommands.delete(command);
      }
    }
  }

  clearPluginShortcuts(shortcuts: Map<string, () => void>): void {
    // Remove specific shortcuts for a plugin
    for (const [shortcut] of shortcuts.entries()) {
      this.globalShortcuts.delete(shortcut);
    }
  }
}