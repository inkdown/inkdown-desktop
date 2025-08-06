import { Extension, EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { vim } from '@replit/codemirror-vim';
import { createInkdownTheme } from './theme';

interface FontConfig {
  fontSize?: number;
  fontFamily?: string;
}

export class ExtensionsFactory {
  static getBasicExtensions(fontConfig?: FontConfig): Extension[] {
    return [
      history(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
      ]),
      EditorView.theme({
        '&': {
          fontSize: fontConfig?.fontSize ? `${fontConfig.fontSize}px` : 'var(--inkdown-editor-font-size)',
          fontFamily: fontConfig?.fontFamily || 'var(--inkdown-editor-font-family)',
        },
        '.cm-content': {
          padding: '16px',
          minHeight: 'auto',
          lineHeight: '1.6',
        },
        '.cm-scrollbar-element': {
          width: '8px !important',
        },
        '.cm-scroller::-webkit-scrollbar': {
          width: '8px',
        },
        '.cm-scroller::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '.cm-scroller::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(128, 128, 128, 0.3)',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: 'rgba(128, 128, 128, 0.5)',
          }
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          height: 'auto',
          minHeight: '200px',
        },
        '.cm-scroller': {
          fontFamily: 'inherit',
          overflow: 'auto',
        },
      }),
      EditorState.tabSize.of(2),
    ];
  }
  
  static getMarkdown(): Extension {
    return markdown();
  }

  static getVimMode(): Extension {
    return vim();
  }
  
  static getLineNumbers(): Extension {
    return lineNumbers();
  }
  
  static getCurrentLineHighlight(): Extension[] {
    return [highlightActiveLine(), highlightActiveLineGutter()];
  }
  
  static buildExtensions(config: {
    markdown?: boolean;
    vim?: boolean;
    showLineNumbers?: boolean;
    highlightCurrentLine?: boolean;
    theme?: 'light' | 'dark';
    fontSize?: number;
    fontFamily?: string;
    customExtensions?: Extension[];
  }): Extension[] {
    const extensions: Extension[] = [
      ...this.getBasicExtensions({ fontSize: config.fontSize, fontFamily: config.fontFamily }),
    ];
    
    if (config.theme) {
      extensions.push(createInkdownTheme(config.theme));
    }
    
    if (config.markdown !== false) {
      extensions.push(this.getMarkdown());
    }
    
    if (config.vim) {
      extensions.push(this.getVimMode());
    }
    
    if (config.showLineNumbers !== false) {
      extensions.push(this.getLineNumbers());
    }
    
    if (config.highlightCurrentLine !== false) {
      extensions.push(...this.getCurrentLineHighlight());
    }
    
    if (config.customExtensions) {
      extensions.push(...config.customExtensions);
    }
    
    return extensions;
  }
  
  static getDefaultConfig(): Extension[] {
    return this.buildExtensions({
      markdown: true,
    });
  }
}