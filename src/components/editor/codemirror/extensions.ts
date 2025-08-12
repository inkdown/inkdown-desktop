import { Extension, EditorState, EditorSelection } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine, KeyBinding } from '@codemirror/view';
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
          width: '100%',
          maxWidth: '100%',
        },
        '.cm-content': {
          padding: '16px',
          minHeight: 'auto',
          lineHeight: '1.6',
          width: '100%',
          maxWidth: '100%',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
        },
        '.cm-line': {
          maxWidth: '100%',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
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
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
        },
        '.cm-scroller': {
          fontFamily: 'inherit',
          overflow: 'auto',
          overflowX: 'hidden',
          width: '100%',
          maxWidth: '100%',
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

  static getMarkdownShortcuts(): Extension {
    const shortcuts: KeyBinding[] = [
      {
        key: 'Ctrl-b',
        run: (view) => this.wrapSelection(view, '**', '**', ''),
        preventDefault: true,
      },
      {
        key: 'Ctrl-i',
        run: (view) => this.wrapSelection(view, '*', '*', ''),
        preventDefault: true,
      },
      {
        key: 'Ctrl-Shift-s',
        run: (view) => this.wrapSelection(view, '~~', '~~', ''),
        preventDefault: true,
      },
      {
        key: 'Ctrl-Shift-c',
        run: (view) => this.wrapSelection(view, '`', '`', ''),
        preventDefault: true,
      },
      {
        key: 'Ctrl-k',
        run: (view) => this.wrapSelection(view, '[', '](url)', 'texto do link'),
        preventDefault: true,
      },
      {
        key: 'Ctrl-1',
        run: (view) => this.addHeading(view, 1),
        preventDefault: true,
      },
      {
        key: 'Ctrl-2',
        run: (view) => this.addHeading(view, 2),
        preventDefault: true,
      },
      {
        key: 'Ctrl-3',
        run: (view) => this.addHeading(view, 3),
        preventDefault: true,
      },
      {
        key: 'Ctrl-4',
        run: (view) => this.addHeading(view, 4),
        preventDefault: true,
      },
      {
        key: 'Ctrl-5',
        run: (view) => this.addHeading(view, 5),
        preventDefault: true,
      },
      {
        key: 'Ctrl-6',
        run: (view) => this.addHeading(view, 6),
        preventDefault: true,
      },
      {
        key: 'Ctrl-Shift-t',
        run: (view) => this.insertTable(view),
        preventDefault: true,
      },
    ];

    return keymap.of(shortcuts);
  }

  private static wrapSelection(view: EditorView, before: string, after: string, placeholder: string): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const selectedText = state.doc.sliceString(selection.from, selection.to);
    
    let newText: string;
    let cursorPos: number;
    
    if (selectedText) {
      newText = `${before}${selectedText}${after}`;
      cursorPos = selection.from + newText.length;
    } else {
      newText = `${before}${placeholder}${after}`;
      cursorPos = selection.from + before.length;
    }
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: newText,
      },
      selection: EditorSelection.cursor(cursorPos),
    });
    
    return true;
  }

  private static addHeading(view: EditorView, level: number): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const line = state.doc.lineAt(selection.head);
    const lineText = line.text;
    
    // Remove heading existente se houver
    const cleanText = lineText.replace(/^#+\s*/, '');
    const headingMarker = '#'.repeat(level) + ' ';
    const newLineText = headingMarker + cleanText;
    
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: newLineText,
      },
      selection: EditorSelection.cursor(line.from + newLineText.length),
    });
    
    return true;
  }

  private static insertTable(view: EditorView): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const line = state.doc.lineAt(selection.head);
    
    const tableTemplate = `| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
|          |          |          |
|          |          |          |`;
    
    // Se não estiver no início da linha, adiciona quebra de linha antes
    const insertText = line.from === selection.from ? tableTemplate : `\n${tableTemplate}`;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: insertText,
      },
      selection: EditorSelection.cursor(selection.from + insertText.indexOf('|') + 1),
    });
    
    return true;
  }

  static buildExtensions(config: {
    markdown?: boolean;
    markdownShortcuts?: boolean;
    githubMarkdown?: boolean;
    vim?: boolean;
    showLineNumbers?: boolean;
    highlightCurrentLine?: boolean;
    theme?: 'light' | 'dark';
    fontSize?: number;
    fontFamily?: string;
    customExtensions?: Extension[];
    wordWrap?: boolean;
  }): Extension[] {
    const extensions: Extension[] = [
      ...this.getBasicExtensions({ fontSize: config.fontSize, fontFamily: config.fontFamily }),
    ];
    
    if (config.theme) {
      extensions.push(createInkdownTheme(config.theme));
    }
    
    extensions.push(this.getMarkdown());
    
    if (config.markdownShortcuts !== false) {
      extensions.push(this.getMarkdownShortcuts());
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
      markdownShortcuts: true,
    });
  }
}
