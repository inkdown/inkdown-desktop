import { invoke } from '@tauri-apps/api/core';
import { processMarkdownContent, MarkdownPostProcessorContext } from '../plugins/markdown/MarkdownPostProcessor';

export interface ParseResult {
  html: string;
  word_count: number;
  error?: string;
}

export interface MarkdownOptions {
  gfm?: boolean;
  breaks?: boolean;
  pedantic?: boolean;
  sanitize?: boolean;
  smartLists?: boolean;
  smartypants?: boolean;
  headerIds?: boolean;
  baseUrl?: string;
}

/**
 * Converte markdown para HTML usando o parser interno do app
 */
export async function markdownToHTML(
  markdown: string, 
  options: MarkdownOptions = {}
): Promise<string> {
  try {
    // Por padrão, usa GFM se não especificado
    const useGfm = options.gfm !== false;
    
    const command = useGfm ? 'parse_markdown_gfm' : 'parse_markdown_basic';
    const result = await invoke<ParseResult>(command, { markdown });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Apply post-processors from plugins
    const context: MarkdownPostProcessorContext = {
      sourcePath: options.baseUrl || 'unknown'
    };
    
    const processedHtml = await processMarkdownContent(result.html, context);
    
    return processedHtml;
  } catch (error) {
    console.error('Erro ao converter markdown para HTML:', error);
    throw error;
  }
}

/**
 * Converte markdown para HTML e retorna resultado completo com estatísticas
 */
export async function parseMarkdown(
  markdown: string,
  options: MarkdownOptions = {}
): Promise<ParseResult> {
  try {
    const useGfm = options.gfm !== false;
    const command = useGfm ? 'parse_markdown_gfm' : 'parse_markdown_basic';
    
    return await invoke<ParseResult>(command, { markdown });
  } catch (error) {
    console.error('Erro ao fazer parse do markdown:', error);
    throw error;
  }
}

/**
 * Função auxiliar para plugins - converte markdown para HTML de forma simples
 */
export const pluginMarkdownToHTML = markdownToHTML;