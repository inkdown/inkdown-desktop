# Inkdown Desktop - Guia de Personalização de Temas

Este guia fornece informações detalhadas sobre como personalizar e criar temas para o Inkdown Desktop, incluindo editor, preview e interface do aplicativo.

## 🎨 Sistema de Temas

O Inkdown Desktop utiliza um sistema de temas unificado baseado em variáveis CSS, permitindo personalização completa da aparência do editor, preview e interface.

### Estrutura do Sistema de Temas

- **Arquivo Principal**: `/src/styles/unified-theme.css`
- **Temas Disponíveis**: Light (padrão) e Dark
- **Modo Automático**: Detecta preferência do sistema operacional
- **Personalização**: Sobrescrever variáveis CSS ou criar temas customizados

## 🎯 Variáveis CSS Personalizáveis

### 1. Interface do Aplicativo (`--theme-*`)

#### Cores Base
```css
--theme-primary: #6366f1;                    /* Cor primária (botões, links) */
--theme-primary-foreground: #ffffff;         /* Texto em elementos primários */
--theme-secondary: #f1f5f9;                  /* Cor secundária */
--theme-secondary-foreground: #0f172a;       /* Texto em elementos secundários */
--theme-background: #ffffff;                 /* Fundo principal */
--theme-foreground: #0f172a;                 /* Texto principal */
--theme-muted: #f8fafc;                      /* Elementos desabilitados */
--theme-muted-foreground: #64748b;           /* Texto desabilitado */
--theme-border: #e2e8f0;                     /* Bordas */
--theme-destructive: #ef4444;                /* Ações destrutivas */
--theme-ring: #6366f1;                       /* Foco/outline */
```

#### Sidebar
```css
--theme-sidebar-background: #f8fafc;         /* Fundo da sidebar */
--theme-sidebar-foreground: #334155;         /* Texto da sidebar */
--theme-sidebar-border: #e2e8f0;             /* Bordas da sidebar */
--theme-sidebar-hover: #f1f5f9;              /* Hover dos itens */
--theme-sidebar-active: #e2e8f0;             /* Item ativo */
```

### 2. Editor (`--inkdown-editor-*`)

#### Cores Base do Editor
```css
--inkdown-editor-bg: #ffffff;                /* Fundo do editor */
--inkdown-editor-fg: #24292f;                /* Texto do editor */
--inkdown-editor-selection: #6366f133;       /* Seleção de texto */
--inkdown-editor-cursor: #24292f;            /* Cursor */
--inkdown-editor-border: #e2e8f0;            /* Bordas do editor */
--inkdown-editor-line-number: #8c959f;       /* Números de linha */
--inkdown-editor-active-line: #f6f8fa;       /* Linha ativa */
--inkdown-editor-scrollbar: #e2e8f0;         /* Scrollbar */
```

#### Tipografia do Editor
```css
--inkdown-editor-font-family: "Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--inkdown-editor-mono-font-family: "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace;
--inkdown-editor-font-size: 14px;
--inkdown-editor-line-height: 1.6;
--inkdown-editor-padding: 16px;
```

### 3. Syntax Highlighting (`--inkdown-syntax-*`)

#### Elementos de Código
```css
--inkdown-syntax-keyword: #6366f1;           /* Palavras-chave */
--inkdown-syntax-string: #059669;            /* Strings */
--inkdown-syntax-number: #dc2626;            /* Números */
--inkdown-syntax-comment: #64748b;           /* Comentários */
--inkdown-syntax-strong: #0f172a;            /* Texto em negrito */
--inkdown-syntax-emphasis: #374151;          /* Texto em itálico */
--inkdown-syntax-link: #6366f1;              /* Links */
--inkdown-syntax-url: #6366f1;               /* URLs */
--inkdown-syntax-monospace: #dc2626;         /* Código inline */
--inkdown-syntax-monospace-bg: #f8fafc;      /* Fundo do código inline */
```

#### Elementos Markdown
```css
--inkdown-syntax-list: #64748b;              /* Listas */
--inkdown-syntax-quote: #64748b;             /* Citações */
--inkdown-syntax-separator: #64748b;         /* Separadores */
--inkdown-syntax-atom: #059669;              /* Átomos */
--inkdown-syntax-bool: #dc2626;              /* Booleanos */
--inkdown-syntax-regexp: #dc2626;            /* Expressões regulares */
--inkdown-syntax-meta: #64748b;              /* Meta elementos */
--inkdown-syntax-punctuation: #64748b;       /* Pontuação */
```

### 4. Headings (`--inkdown-heading-*`)

#### Cores dos Títulos (H1-H6)
```css
--inkdown-heading-h1: #dc2626;               /* Título H1 */
--inkdown-heading-h2: #ea580c;               /* Título H2 */
--inkdown-heading-h3: #d97706;               /* Título H3 */
--inkdown-heading-h4: #65a30d;               /* Título H4 */
--inkdown-heading-h5: #059669;               /* Título H5 */
--inkdown-heading-h6: #0891b2;               /* Título H6 */
```

#### Tipografia dos Títulos
```css
--inkdown-heading-font-weight: bold;         /* Peso da fonte */
--inkdown-heading-line-height: 1.3;          /* Altura da linha */
--inkdown-heading-h1-size: 2em;              /* Tamanho H1 */
--inkdown-heading-h2-size: 1.5em;            /* Tamanho H2 */
--inkdown-heading-h3-size: 1.25em;           /* Tamanho H3 */
--inkdown-heading-h4-size: 1.1em;            /* Tamanho H4 */
--inkdown-heading-h5-size: 1.05em;           /* Tamanho H5 */
--inkdown-heading-h6-size: 1em;              /* Tamanho H6 */
```

### 5. Elementos Especiais (`--inkdown-*`)

#### Código
```css
--inkdown-code-font-size: 0.9em;             /* Tamanho da fonte do código */
--inkdown-code-padding: 2px 4px;             /* Padding do código inline */
--inkdown-code-border-radius: 3px;           /* Border radius do código */
```

#### Citações
```css
--inkdown-quote-border-width: 4px;           /* Largura da borda das citações */
--inkdown-quote-padding-left: 12px;          /* Padding esquerdo das citações */
--inkdown-quote-margin-left: 4px;            /* Margin esquerdo das citações */
```

#### Scrollbar
```css
--inkdown-scrollbar-width: 8px;              /* Largura do scrollbar */
--inkdown-scrollbar-border-radius: 4px;      /* Border radius do scrollbar */
```

## 🛠️ Como Personalizar

### Método 1: Sobrescrever Variáveis CSS

Crie um arquivo CSS com suas personalizações:

```css
/* meu-tema-personalizado.css */
:root {
  /* Tema escuro personalizado */
  --theme-primary: #8b5cf6;
  --theme-background: #1a1a1a;
  --theme-foreground: #e5e5e5;
  
  /* Editor com fundo mais escuro */
  --inkdown-editor-bg: #0d1117;
  --inkdown-editor-fg: #f0f0f0;
  
  /* Syntax highlighting personalizado */
  --inkdown-syntax-keyword: #ff79c6;
  --inkdown-syntax-string: #50fa7b;
  --inkdown-syntax-comment: #6272a4;
  
  /* Títulos com cores vibrantes */
  --inkdown-heading-h1: #ff6b6b;
  --inkdown-heading-h2: #4ecdc4;
  --inkdown-heading-h3: #45b7d1;
}
```

### Método 2: Temas Específicos por Contexto

Use atributos de dados para diferentes contextos:

```css
/* Tema para modo apresentação */
[data-theme="presentation"] {
  --inkdown-editor-font-size: 18px;
  --inkdown-heading-h1-size: 3em;
  --inkdown-heading-h2-size: 2.5em;
}

/* Tema para modo foco */
[data-theme="focus"] {
  --theme-sidebar-background: transparent;
  --inkdown-editor-bg: #f7f7f7;
  --theme-muted: #e0e0e0;
}
```

### Método 3: Criar Tema Completo

```css
/* dracula-theme.css - Tema Dracula completo */
:root,
[data-theme="dracula"] {
  /* UI Base */
  --theme-primary: #bd93f9;
  --theme-background: #282a36;
  --theme-foreground: #f8f8f2;
  --theme-border: #6272a4;
  
  /* Editor */
  --inkdown-editor-bg: #282a36;
  --inkdown-editor-fg: #f8f8f2;
  --inkdown-editor-selection: #44475a;
  --inkdown-editor-cursor: #f8f8f2;
  --inkdown-editor-active-line: #44475a;
  
  /* Syntax */
  --inkdown-syntax-keyword: #ff79c6;
  --inkdown-syntax-string: #f1fa8c;
  --inkdown-syntax-number: #bd93f9;
  --inkdown-syntax-comment: #6272a4;
  --inkdown-syntax-strong: #f8f8f2;
  --inkdown-syntax-link: #8be9fd;
  
  /* Headings */
  --inkdown-heading-h1: #ff79c6;
  --inkdown-heading-h2: #bd93f9;
  --inkdown-heading-h3: #50fa7b;
  --inkdown-heading-h4: #f1fa8c;
  --inkdown-heading-h5: #8be9fd;
  --inkdown-heading-h6: #ffb86c;
}
```

## 🎨 Temas de Exemplo Prontos

### 1. GitHub Theme
```css
[data-theme="github"] {
  --theme-primary: #0969da;
  --theme-background: #ffffff;
  --theme-foreground: #24292f;
  --inkdown-editor-bg: #ffffff;
  --inkdown-syntax-keyword: #cf222e;
  --inkdown-syntax-string: #032f62;
  --inkdown-syntax-comment: #6e7781;
}
```

### 2. VS Code Dark Theme
```css
[data-theme="vscode-dark"] {
  --theme-primary: #007acc;
  --theme-background: #1e1e1e;
  --theme-foreground: #d4d4d4;
  --inkdown-editor-bg: #1e1e1e;
  --inkdown-syntax-keyword: #569cd6;
  --inkdown-syntax-string: #ce9178;
  --inkdown-syntax-comment: #6a9955;
}
```

### 3. Solarized Light
```css
[data-theme="solarized-light"] {
  --theme-primary: #268bd2;
  --theme-background: #fdf6e3;
  --theme-foreground: #657b83;
  --inkdown-editor-bg: #fdf6e3;
  --inkdown-syntax-keyword: #859900;
  --inkdown-syntax-string: #2aa198;
  --inkdown-syntax-comment: #93a1a1;
}
```

## 📋 Classes CSS Importantes

### Classes do Editor
- `.editor-wrapper` - Container principal do editor
- `.editor-container` - Container do CodeMirror
- `.inkdown-editor` - Classe principal do editor
- `.cm-editor` - Editor do CodeMirror
- `.cm-content` - Conteúdo do editor
- `.cm-scroller` - Área de scroll

### Classes do Preview
- `.preview-container` - Container do preview
- `.markdown-preview-content` - Conteúdo renderizado do markdown

### Classes de Syntax Highlighting
- `.cm-header1` a `.cm-header6` - Títulos H1-H6
- `.cm-strong` - Texto em negrito
- `.cm-em` - Texto em itálico
- `.cm-link` - Links
- `.cm-inline-code` - Código inline
- `.cm-keyword` - Palavras-chave
- `.cm-string` - Strings
- `.cm-comment` - Comentários

### Classes da Interface
- `.theme-card` - Cartões/containers
- `.theme-button` - Botões
- `.theme-input` - Campos de entrada
- `.theme-sidebar` - Sidebar
- `.theme-scrollbar` - Scrollbars customizadas

## ⚙️ Aplicação de Temas

### Via JavaScript/TypeScript
```typescript
// Aplicar tema programaticamente
document.documentElement.setAttribute('data-theme', 'dracula');

// Aplicar variáveis CSS dinamicamente
document.documentElement.style.setProperty('--theme-primary', '#your-color');
```

### Via CSS Import
```css
/* Em seu arquivo CSS principal */
@import './themes/meu-tema.css';
```

## 🎯 Dicas de Personalização

### 1. Contraste e Acessibilidade
- Mantenha contraste mínimo de 4.5:1 para texto normal
- Use contraste mínimo de 3:1 para texto grande
- Teste com ferramentas de acessibilidade

### 2. Consistência Visual
- Use uma paleta de cores harmoniosa
- Mantenha hierarquia visual clara nos títulos
- Equilibre cores quentes e frias

### 3. Performance
- Use variáveis CSS em vez de classes duplicadas
- Evite muitas alterações simultâneas de cor
- Teste em dispositivos de baixa potência

### 4. Testes
- Teste em modo claro e escuro
- Verifique legibilidade em diferentes tamanhos de fonte
- Teste com conteúdo markdown variado

## 🚀 Exemplos Avançados

### Tema com Animações
```css
[data-theme="animated"] {
  --theme-primary: #6366f1;
  
  .cm-cursor {
    animation: blink 1s infinite;
  }
  
  .cm-activeLine {
    transition: background-color 0.2s ease;
  }
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

### Tema Responsivo
```css
[data-theme="responsive"] {
  --inkdown-editor-font-size: clamp(12px, 2vw, 16px);
  --inkdown-editor-padding: clamp(8px, 2vw, 24px);
  
  @media (max-width: 768px) {
    --inkdown-editor-font-size: 14px;
    --theme-sidebar-background: rgba(0,0,0,0.9);
  }
}
```

## 📚 Recursos Adicionais

- **Paletas de Cores**: Use ferramentas como Adobe Color, Coolors.co
- **Teste de Contraste**: WebAIM Contrast Checker
- **Inspiração**: GitHub Themes, VS Code Themes, JetBrains Themes
- **Validação**: Lighthouse Accessibility Audit

---

**Nota**: Este sistema de temas é dinâmico e permite mudanças em tempo real. Todas as variáveis são aplicadas globalmente e afetam tanto o editor quanto o preview, garantindo uma experiência visual consistente.