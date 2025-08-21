import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

export interface MarkdownPostProcessorContext {
  sourcePath: string;
  getSectionInfo?: (element: HTMLElement) => any;
}

export type MarkdownPostProcessor = (
  element: HTMLElement,
  context: MarkdownPostProcessorContext
) => void | Promise<void>;

export type MarkdownCodeBlockProcessor = (
  source: string,
  element: HTMLElement,
  context: MarkdownPostProcessorContext
) => void | Promise<void>;


class MarkdownProcessorRegistry {
  private postProcessors: MarkdownPostProcessor[] = [];
  private codeBlockProcessors: Map<string, MarkdownCodeBlockProcessor> = new Map();

  registerPostProcessor(processor: MarkdownPostProcessor): () => void {
    this.postProcessors.push(processor);
    
    // Return cleanup function
    return () => {
      const index = this.postProcessors.indexOf(processor);
      if (index > -1) {
        this.postProcessors.splice(index, 1);
      }
    };
  }

  registerCodeBlockProcessor(
    language: string, 
    processor: MarkdownCodeBlockProcessor
  ): () => void {
    this.codeBlockProcessors.set(language.toLowerCase(), processor);
    
    return () => {
      this.codeBlockProcessors.delete(language.toLowerCase());
    };
  }

  getPostProcessors(): readonly MarkdownPostProcessor[] {
    return this.postProcessors;
  }


  getCodeBlockProcessor(language: string): MarkdownCodeBlockProcessor | undefined {
    return this.codeBlockProcessors.get(language.toLowerCase());
  }

  clear(): void {
    this.postProcessors.length = 0;
    this.codeBlockProcessors.clear();
  }
}

// Global registry instance
export const markdownProcessorRegistry = new MarkdownProcessorRegistry();

export class ElementCreator {
  constructor(private element: HTMLElement) {}

  createEl<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: {
      text?: string;
      cls?: string | string[];
      attr?: Record<string, string>;
    }
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    
    if (options?.text) {
      el.textContent = options.text;
    }
    
    if (options?.cls) {
      const classes = Array.isArray(options.cls) ? options.cls : [options.cls];
      el.classList.add(...classes);
    }
    
    if (options?.attr) {
      Object.entries(options.attr).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    
    this.element.appendChild(el);
    return el;
  }

  createSpan(options?: {
    text?: string;
    cls?: string | string[];
  }): HTMLSpanElement {
    return this.createEl('span', options);
  }

  findAll(selector: string): HTMLElement[] {
    return Array.from(this.element.querySelectorAll(selector));
  }
}

export interface EnhancedHTMLElement extends HTMLElement {
  createEl: ElementCreator['createEl'];
  createSpan: ElementCreator['createSpan'];  
  findAll: ElementCreator['findAll'];
}


export function enhanceElement(element: HTMLElement): EnhancedHTMLElement {
  const creator = new ElementCreator(element);
  const enhanced = element as EnhancedHTMLElement;
  
  enhanced.createEl = creator.createEl.bind(creator);
  enhanced.createSpan = creator.createSpan.bind(creator);
  enhanced.findAll = creator.findAll.bind(creator);
  
  return enhanced;
}


export async function processMarkdownContent(
  htmlContent: string,
  context: MarkdownPostProcessorContext
): Promise<string> {
  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = htmlContent;
  
  const enhanced = enhanceElement(container);
  
  // Run general post-processors
  const postProcessors = markdownProcessorRegistry.getPostProcessors();
  for (const processor of postProcessors) {
    try {
      await processor(enhanced, context);
    } catch (error) {
      console.error('[MarkdownProcessor] Post-processor failed:', error);
    }
  }
  
  const codeBlocks = enhanced.findAll('pre > code');
  for (const codeBlock of codeBlocks) {
    const languageMatch = codeBlock.className.match(/language-(\w+)/);
    if (languageMatch) {
      const language = languageMatch[1];
      const processor = markdownProcessorRegistry.getCodeBlockProcessor(language);
      
      if (processor) {
        try {
          const source = codeBlock.textContent || '';
          const parent = codeBlock.parentElement;
          if (parent) {
            const enhanced = enhanceElement(parent);
            await processor(source, enhanced, context);
          }
        } catch (error) {
          console.error(`[MarkdownProcessor] Code block processor failed for ${language}:`, error);
        }
      }
    }
  }
  
  return container.innerHTML;
}

export function markdownPostProcessorExtension() {
  return ViewPlugin.fromClass(class {
    decorations: DecorationSet = Decoration.none;
    
    constructor(view: EditorView) {
      this.updateDecorations(view);
    }
    
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.updateDecorations(update.view);
      }
    }
    
    private updateDecorations(view: EditorView) {
      const builder = new RangeSetBuilder<Decoration>();
      
      const { from, to } = view.viewport;
      
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: (node) => {
          if (node.name === 'FencedCode') {
            const text = view.state.doc.sliceString(node.from, node.to);
            const languageMatch = text.match(/^```(\w+)/);
            
            if (languageMatch) {
              const language = languageMatch[1];
              const processor = markdownProcessorRegistry.getCodeBlockProcessor(language);
              
              if (processor) {
                // Mark this range for post-processing
                builder.add(
                  node.from,
                  node.to,
                  Decoration.mark({
                    class: `cm-processed-${language}`,
                    attributes: { 'data-language': language }
                  })
                );
              }
            }
          }
        }
      });
      
      this.decorations = builder.finish();
    }
  }, {
    decorations: v => v.decorations
  });
}