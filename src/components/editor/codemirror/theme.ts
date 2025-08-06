import { Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export function createInkdownTheme(theme: 'light' | 'dark'): Extension {
  const baseTheme = EditorView.theme({
    '&': {
      border: 'none',
      outline: 'none'
    },
    '&.inkdown-editor': {
      color: 'var(--inkdown-editor-fg)',
      backgroundColor: 'var(--inkdown-editor-bg)',
      fontFamily: 'var(--inkdown-editor-font-family)',
      fontSize: 'var(--inkdown-editor-font-size)',
      lineHeight: 'var(--inkdown-editor-line-height)',
      border: 'none',
      outline: 'none',
    },
    '.cm-content': {
      padding: 'var(--inkdown-editor-padding)',
      caretColor: 'var(--inkdown-editor-cursor)',
      border: 'none !important',
      outline: 'none !important',
    },
    '&.inkdown-editor-focused, .cm-focused': {
      outline: 'none !important',
      border: 'none !important',
    },
    '.cm-editor': {
      border: 'none !important',
      outline: 'none !important',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--inkdown-editor-selection)',
    },
    '.cm-focused .cm-selectionBackground': {
      backgroundColor: 'var(--inkdown-editor-selection)',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--inkdown-editor-cursor)',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--inkdown-editor-active-line)',
    },
    '.cm-lineNumbers': {
      color: 'var(--inkdown-editor-line-number)',
      backgroundColor: 'var(--inkdown-editor-bg)',
      border: 'none !important',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--inkdown-editor-active-line)',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--inkdown-editor-bg)',
      color: 'var(--inkdown-editor-line-number)',
      border: 'none !important',
      borderRight: 'none !important',
    },
    '.cm-scroller': {
      overflow: 'auto',
      border: 'none !important',
      outline: 'none !important',
    },
    '.cm-scroller::-webkit-scrollbar': {
      width: 'var(--inkdown-scrollbar-width)',
      height: 'var(--inkdown-scrollbar-width)',
    },
    '.cm-scroller::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '.cm-scroller::-webkit-scrollbar-thumb': {
      background: 'var(--inkdown-editor-scrollbar)',
      borderRadius: 'var(--inkdown-scrollbar-border-radius)',
    },
    '.cm-scroller::-webkit-scrollbar-thumb:hover': {
      opacity: '0.8',
    },
  }, { dark: theme === 'dark' });

  const syntaxTheme = HighlightStyle.define([
    {
      tag: [tags.heading1],
      color: 'var(--inkdown-heading-h1)',
      fontSize: 'var(--inkdown-heading-h1-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.heading2],
      color: 'var(--inkdown-heading-h2)',
      fontSize: 'var(--inkdown-heading-h2-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.heading3],
      color: 'var(--inkdown-heading-h3)',
      fontSize: 'var(--inkdown-heading-h3-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.heading4],
      color: 'var(--inkdown-heading-h4)',
      fontSize: 'var(--inkdown-heading-h4-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.heading5],
      color: 'var(--inkdown-heading-h5)',
      fontSize: 'var(--inkdown-heading-h5-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.heading6],
      color: 'var(--inkdown-heading-h6)',
      fontSize: 'var(--inkdown-heading-h6-size)',
      fontWeight: 'var(--inkdown-heading-font-weight)',
      lineHeight: 'var(--inkdown-heading-line-height)',
    },
    {
      tag: [tags.link],
      color: 'var(--inkdown-syntax-link)',
      textDecoration: 'underline',
    },
    {
      tag: [tags.url],
      color: 'var(--inkdown-syntax-url)',
    },
    {
      tag: [tags.emphasis],
      color: 'var(--inkdown-syntax-emphasis)',
      fontStyle: 'italic',
    },
    {
      tag: [tags.strong],
      color: 'var(--inkdown-syntax-strong)',
      fontWeight: 'bold',
    },
    {
      tag: [tags.strikethrough],
      color: 'var(--inkdown-syntax-strikethrough)',
      textDecoration: 'line-through',
    },
    {
      tag: [tags.monospace],
      color: 'var(--inkdown-syntax-monospace)',
      backgroundColor: 'var(--inkdown-syntax-monospace-bg)',
      fontFamily: 'var(--inkdown-editor-mono-font-family)',
      fontSize: 'var(--inkdown-code-font-size)',
      padding: 'var(--inkdown-code-padding)',
      borderRadius: 'var(--inkdown-code-border-radius)',
    },
    {
      tag: [tags.keyword],
      color: 'var(--inkdown-syntax-keyword)',
      fontWeight: '500',
    },
    {
      tag: [tags.string],
      color: 'var(--inkdown-syntax-string)',
    },
    {
      tag: [tags.number],
      color: 'var(--inkdown-syntax-number)',
    },
    {
      tag: [tags.comment],
      color: 'var(--inkdown-syntax-comment)',
      fontStyle: 'italic',
    },
    {
      tag: [tags.atom],
      color: 'var(--inkdown-syntax-atom)',
    },
    {
      tag: [tags.bool],
      color: 'var(--inkdown-syntax-bool)',
    },
    {
      tag: [tags.regexp],
      color: 'var(--inkdown-syntax-regexp)',
    },
    {
      tag: [tags.meta],
      color: 'var(--inkdown-syntax-meta)',
    },
    {
      tag: [tags.punctuation],
      color: 'var(--inkdown-syntax-punctuation)',
    },
    {
      tag: [tags.list],
      color: 'var(--inkdown-syntax-list)',
    },
    {
      tag: [tags.quote],
      color: 'var(--inkdown-syntax-quote)',
      fontStyle: 'italic',
      borderLeft: 'var(--inkdown-quote-border-width) solid var(--inkdown-syntax-quote)',
      paddingLeft: 'var(--inkdown-quote-padding-left)',
      marginLeft: 'var(--inkdown-quote-margin-left)',
    },
    {
      tag: [tags.contentSeparator],
      color: 'var(--inkdown-syntax-separator)',
    },
  ]);

  return [
    baseTheme,
    syntaxHighlighting(syntaxTheme),
  ];
}

