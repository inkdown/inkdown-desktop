import { EditorView } from '@codemirror/view';
import { Editor as CoreEditor } from '../../components/editor/core/Editor';

export interface EditorPosition {
  line: number;
  ch: number;
}

export interface EditorRange {
  from: EditorPosition;
  to: EditorPosition;
}


export class PluginEditorAPI {
  public readonly coreEditor: CoreEditor; 

  constructor(coreEditor: CoreEditor) {
    this.coreEditor = coreEditor;
  }

  private get view(): EditorView {
    return this.coreEditor.getView();
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }


  setValue(content: string): void {
    const currentContent = this.view.state.doc.toString();
    if (currentContent === content) return;
    
    // Store current cursor position before content change
    const currentSelection = this.view.state.selection.main;
    const cursorPos = currentSelection.head;
    
    this.view.dispatch({
      changes: {
        from: 0,
        to: this.view.state.doc.length,
        insert: content
      },
      // Restore cursor position if the content length allows it
      selection: {
        anchor: Math.min(cursorPos, content.length),
        head: Math.min(cursorPos, content.length)
      }
    });
  }

  getSelection(): string {
    const selection = this.view.state.selection.main;
    if (selection.empty) return '';
    return this.view.state.doc.sliceString(selection.from, selection.to);
  }

  replaceSelection(replacement: string): void {
    const selection = this.view.state.selection.main;
    
    this.view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: replacement
      },
      selection: {
        anchor: selection.from + replacement.length
      }
    });
  }

  getCursor(): EditorPosition {
    const selection = this.view.state.selection.main;
    const doc = this.view.state.doc;
    const line = doc.lineAt(selection.head);
    
    return {
      line: line.number - 1,
      ch: selection.head - line.from
    };
  }

  setCursor(pos: EditorPosition): void {
    const doc = this.view.state.doc;
    const line = doc.line(pos.line + 1);
    const offset = Math.min(line.from + pos.ch, line.to);
    
    this.view.dispatch({
      selection: { anchor: offset, head: offset }
    });
  }

  getRange(from: EditorPosition, to: EditorPosition): string {
    const doc = this.view.state.doc;
    const fromLine = doc.line(from.line + 1);
    const toLine = doc.line(to.line + 1);
    const fromOffset = Math.min(fromLine.from + from.ch, fromLine.to);
    const toOffset = Math.min(toLine.from + to.ch, toLine.to);
    
    return doc.sliceString(fromOffset, toOffset);
  }

  replaceRange(replacement: string, from: EditorPosition, to: EditorPosition): void {
    const doc = this.view.state.doc;
    const fromLine = doc.line(from.line + 1);
    const toLine = doc.line(to.line + 1);
    const fromOffset = Math.min(fromLine.from + from.ch, fromLine.to);
    const toOffset = Math.min(toLine.from + to.ch, toLine.to);
    
    this.view.dispatch({
      changes: {
        from: fromOffset,
        to: toOffset,
        insert: replacement
      }
    });
  }

  getLine(lineNumber: number): string {
    const doc = this.view.state.doc;
    if (lineNumber < 0 || lineNumber >= doc.lines) return '';
    
    const line = doc.line(lineNumber + 1); 
    return line.text;
  }

  lineCount(): number {
    return this.view.state.doc.lines;
  }

  setOption(option: string, value: any): void {
    switch (option) {
      case 'readOnly':
        this.coreEditor.updateConfig({ readOnly: Boolean(value) });
        break;
      case 'lineNumbers':
        this.coreEditor.updateConfig({ showLineNumbers: Boolean(value) });
        break;
      default:
        console.warn(`Editor option '${option}' not supported in plugin API`);
    }
  }

  getOption(option: string): any {
    const config = this.coreEditor.getConfig();
    switch (option) {
      case 'readOnly':
        return config.readOnly;
      case 'lineNumbers':
        return config.showLineNumbers;
      default:
        return undefined;
    }
  }

  focus(): void {
    this.view.focus();
  }
  refresh(): void {
    // CodeMirror 6 handles refreshing automatically
    // This method is kept for compatibility
  }

  insertAtCursor(text: string): void {
    const selection = this.view.state.selection.main;
    this.view.dispatch({
      changes: {
        from: selection.head,
        to: selection.head,
        insert: text
      },
      selection: {
        anchor: selection.head + text.length
      }
    });
  }


  setSelection(from: EditorPosition, to: EditorPosition): void {
    const doc = this.view.state.doc;
    const fromLine = doc.line(from.line + 1);
    const toLine = doc.line(to.line + 1);
    const fromOffset = Math.min(fromLine.from + from.ch, fromLine.to);
    const toOffset = Math.min(toLine.from + to.ch, toLine.to);
    
    this.view.dispatch({
      selection: { anchor: fromOffset, head: toOffset }
    });
  }

  getSelectionRange(): { from: EditorPosition; to: EditorPosition } {
    const selection = this.view.state.selection.main;
    const doc = this.view.state.doc;
    const fromLine = doc.lineAt(selection.from);
    const toLine = doc.lineAt(selection.to);
    
    return {
      from: {
        line: fromLine.number - 1,
        ch: selection.from - fromLine.from
      },
      to: {
        line: toLine.number - 1,
        ch: selection.to - toLine.from
      }
    };
  }


  execCommand(command: string): void {
    // This could be extended to support CodeMirror commands
    console.warn(`Editor command '${command}' not implemented in plugin API`);
  }


  on(type: string, handler: Function): void {
    switch (type) {
      case 'change':
        break;
      default:
        console.warn(`Editor event '${type}' not supported in plugin API`);
    }
  }

  off(type: string, handler: Function): void {
    // Placeholder for event listener removal
    console.warn('Editor event listener removal not implemented in plugin API');
  }


  getStats(): {
    characters: number;
    charactersWithoutSpaces: number;
    words: number;
    lines: number;
  } {
    const content = this.getValue();
    const characters = content.length;
    const charactersWithoutSpaces = content.replace(/\s/g, '').length;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const lines = this.lineCount();

    return {
      characters,
      charactersWithoutSpaces, 
      words,
      lines
    };
  }

  scrollToLine(lineNumber: number): void {
    const doc = this.view.state.doc;
    if (lineNumber < 0 || lineNumber >= doc.lines) return;
    
    const line = doc.line(lineNumber + 1);
    this.view.dispatch({
      effects: EditorView.scrollIntoView(line.from)
    });
  }


  getCodeMirrorView(): EditorView {
    return this.view;
  }

  hasFocus(): boolean {
    return this.view.hasFocus;
  }

  undo(): void {
    import('@codemirror/commands').then(({ undo }) => {
      undo(this.view);
    });
  }

  redo(): void {
    import('@codemirror/commands').then(({ redo }) => {
      redo(this.view);
    });
  }
}