import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export function createInkdownTheme(theme: 'light' | 'dark'): Extension {
  const baseTheme = EditorView.theme({
    '&': {
      color: 'var(--theme-editor-foreground)',
      backgroundColor: 'var(--theme-editor-background)',
    },
    '.cm-content': {
      padding: '16px',
      caretColor: 'var(--theme-editor-cursor)',
      fontSize: '14px',
      lineHeight: '1.6',
      fontFamily: '"Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    '.cm-focused': {
      outline: 'none',
    },
    '.cm-editor': {
      fontSize: '14px',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--theme-editor-selection)',
    },
    '.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--theme-editor-selection)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--theme-editor-cursor)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--theme-editor-active-line)',
    },
    '.cm-lineNumbers': {
      color: 'var(--theme-editor-line-number)',
      backgroundColor: 'var(--theme-editor-background)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--theme-editor-active-line)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--theme-editor-background)',
      color: 'var(--theme-editor-line-number)',
      border: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
    },
    '.cm-scroller::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      background: 'var(--theme-editor-scrollbar)',
      borderRadius: '4px',
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      opacity: '0.8',
    },
  }, { dark: theme === 'dark' });

  const syntaxTheme = HighlightStyle.define([
    {
      tag: [tags.heading1],
      color: 'var(--syntax-heading-h1)',
      fontSize: '1.5em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.heading2],
      color: 'var(--syntax-heading-h2)',
      fontSize: '1.3em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.heading3],
      color: 'var(--syntax-heading-h3)',
      fontSize: '1.2em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.heading4],
      color: 'var(--syntax-heading-h4)',
      fontSize: '1.1em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.heading5],
      color: 'var(--syntax-heading-h5)',
      fontSize: '1.05em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.heading6],
      color: 'var(--syntax-heading-h6)',
      fontSize: '1em',
      fontWeight: 'bold',
      lineHeight: '1.3',
    },
    {
      tag: [tags.link],
      color: 'var(--syntax-link)',
      textDecoration: 'underline',
    },
    {
      tag: [tags.url],
      color: 'var(--syntax-url)',
    },
    {
      tag: [tags.emphasis],
      color: 'var(--syntax-emphasis)',
      fontStyle: 'italic',
    },
    {
      tag: [tags.strong],
      color: 'var(--syntax-strong)',
      fontWeight: 'bold',
    },
    {
      tag: [tags.strikethrough],
      color: 'var(--syntax-strikethrough)',
      textDecoration: 'line-through',
    },
    {
      tag: [tags.monospace],
      color: 'var(--syntax-monospace)',
      backgroundColor: 'var(--syntax-monospace-bg)',
      fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
      fontSize: '0.9em',
      padding: '2px 4px',
      borderRadius: '3px',
    },
    {
      tag: [tags.keyword],
      color: 'var(--syntax-keyword)',
      fontWeight: '500',
    },
    {
      tag: [tags.string],
      color: 'var(--syntax-string)',
    },
    {
      tag: [tags.number],
      color: 'var(--syntax-number)',
    },
    {
      tag: [tags.comment],
      color: 'var(--syntax-comment)',
      fontStyle: 'italic',
    },
    {
      tag: [tags.atom],
      color: 'var(--syntax-atom)',
    },
    {
      tag: [tags.bool],
      color: 'var(--syntax-bool)',
    },
    {
      tag: [tags.regexp],
      color: 'var(--syntax-regexp)',
    },
    {
      tag: [tags.meta],
      color: 'var(--syntax-meta)',
    },
    {
      tag: [tags.punctuation],
      color: 'var(--syntax-punctuation)',
    },
    {
      tag: [tags.list],
      color: 'var(--syntax-punctuation)',
    },
    {
      tag: [tags.quote],
      color: 'var(--syntax-comment)',
      fontStyle: 'italic',
      borderLeft: '4px solid var(--syntax-comment)',
      paddingLeft: '12px',
      marginLeft: '4px',
    },
    {
      tag: [tags.contentSeparator],
      color: 'var(--syntax-punctuation)',
    },
  ]);

  return [
    baseTheme,
    syntaxHighlighting(syntaxTheme),
  ];
}

