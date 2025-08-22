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
  private static basicExtensionsCache = new Map<string, Extension[]>();
  private static extensionCache = new Map<string, Extension>();

  static getBasicExtensions(fontConfig?: FontConfig): Extension[] {
    // Use simple string concatenation instead of JSON.stringify for better performance
    const key = `${fontConfig?.fontSize || 'default'}_${fontConfig?.fontFamily || 'default'}`;
    
    if (this.basicExtensionsCache.has(key)) {
      return this.basicExtensionsCache.get(key)!;
    }
    
    const extensions = this.buildBasicExtensions(fontConfig);
    
    // Cache management
    if (this.basicExtensionsCache.size >= 5) {
      const firstKey = this.basicExtensionsCache.keys().next().value;
      if(firstKey) {
        this.basicExtensionsCache.delete(firstKey);
      }
    }
    
    this.basicExtensionsCache.set(key, extensions);
    return extensions;
  }

  private static buildBasicExtensions(fontConfig?: FontConfig): Extension[] {
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
    const key = 'markdown';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, markdown());
    }
    return this.extensionCache.get(key)!;
  }

  static getVimMode(): Extension {
    const key = 'vim';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, vim());
    }
    return this.extensionCache.get(key)!;
  }

  static getLineNumbers(): Extension {
    const key = 'lineNumbers';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, lineNumbers());
    }
    return this.extensionCache.get(key)!;
  }

  static getCurrentLineHighlight(): Extension[] {
    const key = 'currentLineHighlight';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, [highlightActiveLine(), highlightActiveLineGutter()] as any);
    }
    return this.extensionCache.get(key) as Extension[];
  }

  static getUrlPasteExtension(): Extension {
    const key = 'urlPaste';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, EditorView.domEventHandlers({
        paste: (event, view) => {
          this.handlePasteEvent(event, view);
          return false; // Deixa o paste padrão acontecer
        }
      }));
    }
    return this.extensionCache.get(key)!;
  }

  static getTabIndentationExtension(): Extension {
    const key = 'tabIndentation';
    if (!this.extensionCache.has(key)) {
      this.extensionCache.set(key, keymap.of([
        {
          key: 'Tab',
          run: (view) => this.handleTab(view),
          preventDefault: true,
        },
        {
          key: 'Shift-Tab',
          run: (view) => this.handleShiftTab(view),
          preventDefault: true,
        },
      ]));
    }
    return this.extensionCache.get(key)!;
  }

  static getMarkdownShortcuts(): Extension {
    const key = 'markdownShortcuts';
    if (this.extensionCache.has(key)) {
      return this.extensionCache.get(key)!;
    }

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
        run: (view) => this.insertCodeBlock(view),
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
      {
        key: 'Ctrl-l',
        run: (view) => this.insertCheckboxList(view),
        preventDefault: true,
      },
    ];

    const extension = keymap.of(shortcuts);
    this.extensionCache.set(key, extension);
    return extension;
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

  private static handlePasteEvent(event: ClipboardEvent, view: EditorView): void {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const clipboardText = clipboardData.getData('text/plain');
    const trimmedText = clipboardText.trim();
    
    if (!trimmedText || trimmedText.length > 2048 || 
        (!trimmedText.startsWith('http://') && !trimmedText.startsWith('https://'))) {
      return; // Deixa paste padrão acontecer
    }

    if (this.isValidUrl(trimmedText)) {
      event.preventDefault();
      
      const markdownLink = `[](${trimmedText})`;
      
      const state = view.state;
      const selection = state.selection.main;
      
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: markdownLink,
        },
        selection: EditorSelection.cursor(selection.from + 1),
      });
    }
  }

  private static isValidUrl(text: string): boolean {
    const urlRegex = /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\._~!$&'()*+,;=:@]|%[0-9a-fA-F]{2})*)*(?:\?(?:[\w\._~!$&'()*+,;=:@/?]|%[0-9a-fA-F]{2})*)?(?:#(?:[\w\._~!$&'()*+,;=:@/?]|%[0-9a-fA-F]{2})*)?$/;
    
    if (text.includes('\n') || text.includes('\r')) {
      return false;
    }
    
    return urlRegex.test(text);
  }


  private static insertCodeBlock(view: EditorView): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const line = state.doc.lineAt(selection.head);
    
    const codeBlockTemplate = '```\n\n```';
    
    const insertText = line.from === selection.from ? codeBlockTemplate : `\n${codeBlockTemplate}`;
    
    const cursorPosition = selection.from + insertText.indexOf('\n') + 1;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: insertText,
      },
      selection: EditorSelection.cursor(cursorPosition),
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

  private static insertCheckboxList(view: EditorView): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const line = state.doc.lineAt(selection.head);
    
    const listTemplate = '- [ ] ';
    
    const insertText = line.from === selection.from ? listTemplate : `\n${listTemplate}`;
    const cursorOffset = insertText.length;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: insertText,
      },
      selection: EditorSelection.cursor(selection.from + cursorOffset),
    });
    
    return true;
  }

  private static handleTab(view: EditorView): boolean {
    const state = view.state;
    const selection = state.selection.main;
    
    // If there's a selection, indent the entire selection
    if (!selection.empty) {
      return this.indentSelectedLines(view, true);
    }
    
    // If cursor is on a list line, handle list indentation
    const line = state.doc.lineAt(selection.head);
    const lineText = line.text;
    
    const listMatch = lineText.match(/^(\s*)([-*+]|\d+\.)\s/);
    const checkboxMatch = lineText.match(/^(\s*)([-*+])\s+\[[x\s]\]\s/);
    
    if (listMatch || checkboxMatch) {
      return this.indentListItem(view, line, listMatch || checkboxMatch);
    }
    
    // Default behavior: insert 2 spaces at cursor
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: '  ',
      },
      selection: EditorSelection.cursor(selection.from + 2),
    });
    
    return true;
  }

  private static handleShiftTab(view: EditorView): boolean {
    const state = view.state;
    const selection = state.selection.main;
    
    // If there's a selection, unindent the entire selection
    if (!selection.empty) {
      return this.indentSelectedLines(view, false);
    }
    
    // If cursor is on a list line, handle list unindentation
    const line = state.doc.lineAt(selection.head);
    const lineText = line.text;
    
    const listMatch = lineText.match(/^(\s*)([-*+]|\d+\.)\s/);
    const checkboxMatch = lineText.match(/^(\s*)([-*+])\s+\[[x\s]\]\s/);
    
    if (listMatch || checkboxMatch) {
      return this.unindentListItem(view, line, listMatch || checkboxMatch);
    }
    
    // Default behavior: remove up to 2 spaces before cursor
    const before = state.doc.sliceString(Math.max(0, selection.from - 2), selection.from);
    if (before === '  ') {
      view.dispatch({
        changes: {
          from: selection.from - 2,
          to: selection.from,
          insert: '',
        },
        selection: EditorSelection.cursor(selection.from - 2),
      });
    } else if (before.endsWith(' ')) {
      view.dispatch({
        changes: {
          from: selection.from - 1,
          to: selection.from,
          insert: '',
        },
        selection: EditorSelection.cursor(selection.from - 1),
      });
    }
    
    return true;
  }

  private static indentSelectedLines(view: EditorView, indent: boolean): boolean {
    const state = view.state;
    const selection = state.selection.main;
    const doc = state.doc;
    
    const startLine = doc.lineAt(selection.from);
    const endLine = doc.lineAt(selection.to);
    
    const changes: Array<{from: number, to: number, insert: string}> = [];
    let offset = 0;
    
    for (let lineNum = startLine.number; lineNum <= endLine.number; lineNum++) {
      const line = doc.line(lineNum);
      const lineText = line.text;
      
      if (indent) {
        // Add 2 spaces at the beginning of each line
        changes.push({
          from: line.from + offset,
          to: line.from + offset,
          insert: '  ',
        });
        offset += 2;
      } else {
        // Remove up to 2 spaces from the beginning of each line
        const leadingSpaces = lineText.match(/^(\s{1,2})/);
        if (leadingSpaces) {
          const spacesToRemove = leadingSpaces[1].length;
          changes.push({
            from: line.from + offset,
            to: line.from + offset + spacesToRemove,
            insert: '',
          });
          offset -= spacesToRemove;
        }
      }
    }
    
    if (changes.length > 0) {
      view.dispatch({
        changes,
        selection: EditorSelection.range(
          selection.from + (indent ? 2 : offset >= -2 ? offset : 0),
          selection.to + offset
        ),
      });
    }
    
    return true;
  }

  private static indentListItem(view: EditorView, line: any, match: RegExpMatchArray | null): boolean {
    if (!match) return false;
    
    const [, currentIndent] = match;
    const newIndent = currentIndent + '  ';
    
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from + currentIndent.length,
        insert: newIndent,
      },
      selection: EditorSelection.cursor(view.state.selection.main.head + 2),
    });
    
    return true;
  }

  private static unindentListItem(view: EditorView, line: any, match: RegExpMatchArray | null): boolean {
    if (!match) return false;
    
    const [, currentIndent] = match;
    if (currentIndent.length === 0) return false;
    
    const removeSpaces = Math.min(2, currentIndent.length);
    const newIndent = currentIndent.slice(removeSpaces);
    
    view.dispatch({
      changes: {
        from: line.from,
        to: line.from + currentIndent.length,
        insert: newIndent,
      },
      selection: EditorSelection.cursor(view.state.selection.main.head - removeSpaces),
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
    pasteUrlsAsLinks?: boolean;
    tabIndentation?: boolean;
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
    
    if (config.tabIndentation !== false) {
      extensions.push(this.getTabIndentationExtension());
    }
    
    if (config.pasteUrlsAsLinks) {
      extensions.push(this.getUrlPasteExtension());
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
