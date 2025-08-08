use std::collections::VecDeque;

#[derive(Debug, Clone)]
pub enum Token {
    Heading { level: u8, text: String },
    Paragraph(String),
    CodeBlock { language: Option<String>, code: String },
    ListItem(String),
    Blockquote(String),
    HorizontalRule,
}

pub struct MarkdownParser {
    buffer_pool: VecDeque<String>,
}

impl Default for MarkdownParser {
    fn default() -> Self {
        Self::new()
    }
}

impl MarkdownParser {
    pub fn new() -> Self {
        let mut buffer_pool = VecDeque::with_capacity(8);
        for _ in 0..4 {
            buffer_pool.push_back(String::with_capacity(1024));
        }
        
        Self { buffer_pool }
    }

    fn get_buffer(&mut self) -> String {
        self.buffer_pool.pop_front().unwrap_or_else(|| String::with_capacity(512))
    }

    fn return_buffer(&mut self, mut buffer: String) {
        if buffer.capacity() <= 4096 && self.buffer_pool.len() < 8 {
            buffer.clear();
            self.buffer_pool.push_back(buffer);
        }
    }

    pub fn parse(&mut self, markdown: &str) -> Vec<Token> {
        if markdown.is_empty() {
            return Vec::new();
        }

        let mut tokens = Vec::with_capacity(markdown.lines().count());
        let lines: Vec<&str> = markdown.lines().collect();
        let mut i = 0;

        while i < lines.len() {
            let line = lines[i].trim_end();
            
            if line.trim().is_empty() {
                i += 1;
                continue;
            }

            if line.starts_with("```") {
                let (code_token, consumed) = self.parse_code_block(&lines, i);
                tokens.push(code_token);
                i += consumed;
                continue;
            }

            if let Some(token) = self.parse_heading(line) {
                tokens.push(token);
                i += 1;
                continue;
            }

            if self.is_horizontal_rule(line) {
                tokens.push(Token::HorizontalRule);
                i += 1;
                continue;
            }

            if line.trim_start().starts_with("- ") || line.trim_start().starts_with("* ") {
                let text = &line.trim_start()[2..];
                let processed_text = self.process_inline_formatting(text);
                tokens.push(Token::ListItem(processed_text));
                i += 1;
                continue;
            }

            if line.trim_start().starts_with("> ") {
                let text = &line.trim_start()[2..];
                let processed_text = self.process_inline_formatting(text);
                tokens.push(Token::Blockquote(processed_text));
                i += 1;
                continue;
            }

            let processed_text = self.process_inline_formatting(line);
            tokens.push(Token::Paragraph(processed_text));
            i += 1;
        }

        tokens
    }

    fn parse_heading(&self, line: &str) -> Option<Token> {
        if !line.starts_with('#') {
            return None;
        }

        let mut level = 0u8;
        let mut chars = line.chars();
        
        while let Some(ch) = chars.next() {
            if ch == '#' && level < 6 {
                level += 1;
            } else if ch == ' ' {
                break;
            } else {
                return None; 
            }
        }

        if level == 0 || level > 6 {
            return None;
        }

        let text = line[level as usize..].trim().to_string();
        if text.is_empty() {
            return None;
        }

        Some(Token::Heading { level, text })
    }

    fn parse_code_block(&mut self, lines: &[&str], start: usize) -> (Token, usize) {
        let first_line = lines[start];
        let language = if first_line.len() > 3 {
            let lang = first_line[3..].trim();
            if lang.is_empty() { None } else { Some(lang.to_string()) }
        } else {
            None
        };

        let mut code = self.get_buffer();
        let mut consumed = 1;

        for i in (start + 1)..lines.len() {
            let line = lines[i];
            if line.trim() == "```" {
                consumed = i - start + 1;
                break;
            }
            
            if !code.is_empty() {
                code.push('\n');
            }
            code.push_str(line);
        }

        let token = Token::CodeBlock {
            language,
            code: code.clone(),
        };

        self.return_buffer(code);
        (token, consumed)
    }

    fn is_horizontal_rule(&self, line: &str) -> bool {
        let trimmed = line.trim();
        let chars: Vec<char> = trimmed.chars().collect();
        
        if chars.len() < 3 {
            return false;
        }

        (chars.iter().all(|&c| c == '-') || chars.iter().all(|&c| c == '*')) && chars.len() >= 3
    }

    fn process_inline_formatting(&mut self, text: &str) -> String {
        if text.is_empty() {
            return String::new();
        }

        // Fast path: if no special characters, return as-is
        if !text.contains(&['*', '`', '[', '!'][..]) {
            return text.to_string();
        }

        let mut result = self.get_buffer();
        result.reserve(text.len() + (text.len() >> 2)); // Reserve 25% extra for tags
        let mut chars = text.chars().peekable();
        
        while let Some(ch) = chars.next() {
            match ch {
                '*' if chars.peek() == Some(&'*') => {
                    chars.next();
                    if let Some(bold_text) = self.extract_until(&mut chars, "**") {
                        result.push_str("<strong>");
                        result.push_str(&bold_text);
                        result.push_str("</strong>");
                    } else {
                        result.push_str("**");
                    }
                }
                '*' => {
                    if let Some(italic_text) = self.extract_until(&mut chars, "*") {
                        result.push_str("<em>");
                        result.push_str(&italic_text);
                        result.push_str("</em>");
                    } else {
                        result.push(ch);
                    }
                }
                '`' => {
                    if let Some(code_text) = self.extract_until(&mut chars, "`") {
                        result.push_str("<code>");
                        result.push_str(&self.escape_html(&code_text));
                        result.push_str("</code>");
                    } else {
                        result.push(ch);
                    }
                }
                '!' if chars.peek() == Some(&'[') => {
                    // Image parsing
                    chars.next(); // consume '['
                    let mut temp_chars = chars.clone();
                    if let Some((alt_text, url)) = self.extract_link(&mut temp_chars) {
                        chars = temp_chars;
                        result.push_str("<img src=\"");
                        result.push_str(&self.escape_html(&url));
                        result.push_str("\" alt=\"");
                        result.push_str(&self.escape_html(&alt_text));
                        result.push_str("\">");
                    } else {
                        result.push('!');
                    }
                }
                '[' => {
                    // Link parsing
                    let mut temp_chars = chars.clone();
                    if let Some((link_text, url)) = self.extract_link(&mut temp_chars) {
                        chars = temp_chars;
                        result.push_str("<a href=\"");
                        result.push_str(&self.escape_html(&url));
                        result.push_str("\">");
                        result.push_str(&self.escape_html(&link_text));
                        result.push_str("</a>");
                    } else {
                        result.push(ch);
                    }
                }
                _ => result.push(ch),
            }
        }

        let output = result.clone();
        self.return_buffer(result);
        output
    }

    fn extract_until(&self, chars: &mut std::iter::Peekable<std::str::Chars>, delimiter: &str) -> Option<String> {
        let mut content = String::with_capacity(64);
        
        if delimiter == "*" {
            while let Some(&ch) = chars.peek() {
                if ch == '*' {
                    chars.next(); // consume *
                    return Some(content);
                }
                chars.next();
                content.push(ch);
                if content.len() > 1000 { return None; }
            }
        } else if delimiter == "**" {
            while let Some(&ch) = chars.peek() {
                if ch == '*' {
                    chars.next(); // consume first *
                    if let Some(&next_ch) = chars.peek() {
                        if next_ch == '*' {
                            chars.next(); // consume second *
                            return Some(content);
                        } else {
                            content.push(ch);
                        }
                    } else {
                        content.push(ch);
                    }
                } else {
                    chars.next();
                    content.push(ch);
                }
                if content.len() > 1000 { return None; }
            }
        } else if delimiter == "`" {
            while let Some(&ch) = chars.peek() {
                if ch == '`' {
                    chars.next(); // consume `
                    return Some(content);
                }
                chars.next();
                content.push(ch);
                if content.len() > 1000 { return None; }
            }
        }

        None
    }

    fn extract_link(&self, chars: &mut std::iter::Peekable<std::str::Chars>) -> Option<(String, String)> {
        let mut link_text = String::with_capacity(32);
        
        while let Some(&ch) = chars.peek() {
            chars.next();
            if ch == ']' {
                break;
            }
            link_text.push(ch);
            if link_text.len() > 500 {
                return None;
            }
        }

        if chars.peek() != Some(&'(') {
            return None;
        }
        chars.next();

        let mut url = String::with_capacity(128);
        
        while let Some(&ch) = chars.peek() {
            chars.next();
            if ch == ')' {
                return Some((link_text, url));
            }
            url.push(ch);
            if url.len() > 1000 {
                return None;
            }
        }

        None
    }

    fn escape_html(&self, text: &str) -> String {
        // Fast path: if no HTML chars, return as-is
        if !text.contains(&['&', '<', '>', '"', '\''][..]) {
            return text.to_string();
        }
        
        let mut result = String::with_capacity(text.len() + (text.len() >> 3));
        for ch in text.chars() {
            match ch {
                '&' => result.push_str("&amp;"),
                '<' => result.push_str("&lt;"),
                '>' => result.push_str("&gt;"),
                '"' => result.push_str("&quot;"),
                '\'' => result.push_str("&#x27;"),
                _ => result.push(ch),
            }
        }
        result
    }

}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub html: String,
    pub word_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

// Public function for the Tauri command
pub fn parse_markdown_to_html(markdown: &str) -> Result<ParseResult, String> {
    let mut parser = MarkdownParser::new();
    let tokens = parser.parse(markdown);
    
    let mut html = String::with_capacity(markdown.len() + (markdown.len() >> 2));
    let mut word_count = 0;
    
    for token in tokens {
        match token {
            Token::Heading { level, text } => {
                word_count += count_words(&text);
                html.push_str(&format!("<h{0}>{1}</h{0}>", level, text));
            },
            Token::Paragraph(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<p>{}</p>", text));
            },
            Token::CodeBlock { language, code } => {
                word_count += count_words(&code);
                if let Some(lang) = language {
                    html.push_str(&format!("<pre><code class=\"language-{}\">{}</code></pre>", lang, code));
                } else {
                    html.push_str(&format!("<pre><code>{}</code></pre>", code));
                }
            },
            Token::ListItem(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<li>{}</li>", text));
            },
            Token::Blockquote(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<blockquote>{}</blockquote>", text));
            },
            Token::HorizontalRule => {
                html.push_str("<hr>");
            },
        }
    }
    
    Ok(ParseResult {
        html,
        word_count,
        error: None,
    })
}

// Optimized word counting function
fn count_words(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    
    let mut count = 0;
    let mut in_word = false;
    
    for ch in text.chars() {
        if ch.is_whitespace() {
            in_word = false;
        } else if !in_word {
            in_word = true;
            count += 1;
        }
    }
    
    count
}