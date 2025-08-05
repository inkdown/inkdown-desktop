# 🎨 Inkdown Theming System

## Overview

Inkdown provides a comprehensive theming system that allows users to customize every aspect of the markdown editor appearance through CSS variables.

## 📋 Available CSS Variables

### Editor Base Colors
```css
--inkdown-editor-bg              /* Editor background color */
--inkdown-editor-fg              /* Editor text color */
--inkdown-editor-selection       /* Text selection background */
--inkdown-editor-cursor          /* Cursor color */
--inkdown-editor-border          /* Editor border color */
--inkdown-editor-line-number     /* Line numbers color */
--inkdown-editor-active-line     /* Active line highlight */
--inkdown-editor-scrollbar       /* Scrollbar color */
```

### Syntax Highlighting Colors
```css
--inkdown-syntax-keyword         /* Language keywords (if, for, class) */
--inkdown-syntax-string          /* String literals */
--inkdown-syntax-number          /* Number literals */
--inkdown-syntax-comment         /* Comments */
--inkdown-syntax-strong          /* Bold text */
--inkdown-syntax-emphasis        /* Italic text */
--inkdown-syntax-link            /* Links */
--inkdown-syntax-url             /* URLs */
--inkdown-syntax-strikethrough   /* Strikethrough text */
--inkdown-syntax-monospace       /* Inline code */
--inkdown-syntax-monospace-bg    /* Inline code background */
--inkdown-syntax-atom            /* Atoms/constants */
--inkdown-syntax-bool            /* Boolean values */
--inkdown-syntax-regexp          /* Regular expressions */
--inkdown-syntax-meta            /* Metadata */
--inkdown-syntax-punctuation     /* Punctuation */
--inkdown-syntax-list            /* List markers */
--inkdown-syntax-quote           /* Blockquotes */
--inkdown-syntax-separator       /* Content separators */
```

### Heading Colors
```css
--inkdown-heading-h1             /* H1 headings */
--inkdown-heading-h2             /* H2 headings */
--inkdown-heading-h3             /* H3 headings */
--inkdown-heading-h4             /* H4 headings */
--inkdown-heading-h5             /* H5 headings */
--inkdown-heading-h6             /* H6 headings */
```

### Typography Settings
```css
--inkdown-editor-font-family     /* Main editor font */
--inkdown-editor-mono-font-family /* Code font */
--inkdown-editor-font-size       /* Base font size */
--inkdown-editor-line-height     /* Line height */
--inkdown-editor-padding         /* Editor padding */
```

### Heading Typography
```css
--inkdown-heading-font-weight    /* Heading font weight */
--inkdown-heading-line-height    /* Heading line height */
--inkdown-heading-h1-size        /* H1 font size */
--inkdown-heading-h2-size        /* H2 font size */
--inkdown-heading-h3-size        /* H3 font size */
--inkdown-heading-h4-size        /* H4 font size */
--inkdown-heading-h5-size        /* H5 font size */
--inkdown-heading-h6-size        /* H6 font size */
```

### Code & Quotes Styling
```css
--inkdown-code-font-size         /* Code font size */
--inkdown-code-padding           /* Code padding */
--inkdown-code-border-radius     /* Code border radius */
--inkdown-quote-border-width     /* Quote border width */
--inkdown-quote-padding-left     /* Quote left padding */
--inkdown-quote-margin-left      /* Quote left margin */
```

### UI Elements
```css
--inkdown-scrollbar-width        /* Scrollbar width */
--inkdown-scrollbar-border-radius /* Scrollbar border radius */
```

## 🎯 Creating Custom Themes

### Method 1: CSS Override
Create a CSS file and override the variables:

```css
/* custom-theme.css */
:root {
  /* Dark Ocean Theme */
  --inkdown-editor-bg: #0a0e1a;
  --inkdown-editor-fg: #e2e8f0;
  --inkdown-heading-h1: #3b82f6;
  --inkdown-heading-h2: #06b6d4;
  --inkdown-heading-h3: #10b981;
  --inkdown-syntax-string: #34d399;
  --inkdown-syntax-keyword: #8b5cf6;
  --inkdown-syntax-comment: #64748b;
}
```

### Method 2: JavaScript Theme
```javascript
const customTheme = {
  '--inkdown-editor-bg': '#1a1a1a',
  '--inkdown-editor-fg': '#ffffff',
  '--inkdown-heading-h1': '#ff6b6b',  
  '--inkdown-heading-h2': '#4ecdc4',
  '--inkdown-syntax-string': '#95e1d3',
  '--inkdown-syntax-keyword': '#f38ba8'
};

// Apply theme
Object.entries(customTheme).forEach(([property, value]) => {
  document.documentElement.style.setProperty(property, value);
});
```

### Method 3: CSS Classes
```css
/* Specific theme classes */
.inkdown-theme-dracula {
  --inkdown-editor-bg: #282a36;
  --inkdown-editor-fg: #f8f8f2;
  --inkdown-heading-h1: #ff79c6;
  --inkdown-heading-h2: #8be9fd;
  --inkdown-syntax-string: #50fa7b;
  --inkdown-syntax-keyword: #bd93f9;
}

.inkdown-theme-monokai {
  --inkdown-editor-bg: #272822;
  --inkdown-editor-fg: #f8f8f2;
  --inkdown-heading-h1: #f92672;
  --inkdown-heading-h2: #a6e22e;
  --inkdown-syntax-string: #e6db74;
  --inkdown-syntax-keyword: #66d9ef;
}
```

## 🔧 Advanced Customization

### Targeting Specific Elements
Use Inkdown-specific classes for precise styling:

```css
/* Style specific syntax elements */
.inkdown-syntax-heading-h1 {
  border-bottom: 2px solid var(--inkdown-heading-h1);
  padding-bottom: 0.3em;
}

.inkdown-syntax-monospace {
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.inkdown-editor-line-numbers {
  font-size: 0.8em;
  opacity: 0.7;
}
```

### Responsive Theming
```css
@media (max-width: 768px) {
  :root {
    --inkdown-editor-font-size: 16px;
    --inkdown-editor-padding: 12px;
  }
}

@media (prefers-color-scheme: dark) {
  :root {
    --inkdown-editor-bg: #1a1a1a;
    --inkdown-editor-fg: #ffffff;
  }
}
```

## 📦 Pre-built Theme Examples

### GitHub Theme
```css
:root {
  --inkdown-editor-bg: #ffffff;
  --inkdown-editor-fg: #24292f;
  --inkdown-heading-h1: #0969da;
  --inkdown-heading-h2: #0969da;
  --inkdown-syntax-string: #032f62;
  --inkdown-syntax-keyword: #cf222e;
  --inkdown-syntax-comment: #6e7781;
}
```

### VS Code Dark Theme
```css
:root {
  --inkdown-editor-bg: #1e1e1e;  
  --inkdown-editor-fg: #d4d4d4;
  --inkdown-heading-h1: #569cd6;
  --inkdown-heading-h2: #4ec9b0;
  --inkdown-syntax-string: #ce9178;
  --inkdown-syntax-keyword: #569cd6;
  --inkdown-syntax-comment: #6a9955;
}
```

## 🚀 Usage

1. Import your theme CSS after the Inkdown styles
2. Apply theme classes to the editor container
3. Use CSS variables for dynamic theming
4. Test in both light and dark modes

```html
<link rel="stylesheet" href="inkdown-theme-vars.css">
<link rel="stylesheet" href="your-custom-theme.css">
```