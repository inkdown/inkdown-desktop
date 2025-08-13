use std::collections::{VecDeque, HashMap};

#[derive(Debug, Clone)]
pub enum BasicToken {
    Heading { level: u8, text: String },
    Paragraph(String),
    CodeBlock { language: Option<String>, code: String },
    List { items: Vec<BasicListItem>, ordered: bool },
    Blockquote(String),
    HorizontalRule,
}

#[derive(Debug, Clone)]
pub struct BasicListItem {
    pub content: String,
    pub level: u8,
}

pub struct BasicMarkdownParser {
    buffer_pool: VecDeque<String>,
    html_cache: HashMap<u64, String>,
}

impl Default for BasicMarkdownParser {
    fn default() -> Self {
        Self::new()
    }
}

impl BasicMarkdownParser {
    pub fn new() -> Self {
        let mut buffer_pool = VecDeque::with_capacity(8);
        for _ in 0..4 {
            buffer_pool.push_back(String::with_capacity(512));
        }
        
        Self { 
            buffer_pool,
            html_cache: HashMap::with_capacity(32),
        }
    }

    #[inline]
    fn get_buffer(&mut self) -> String {
        self.buffer_pool.pop_front().unwrap_or_else(|| String::with_capacity(256))
    }

    #[inline]
    fn return_buffer(&mut self, mut buffer: String) {
        if buffer.capacity() <= 4096 && self.buffer_pool.len() < 8 {
            buffer.clear();
            self.buffer_pool.push_back(buffer);
        }
    }

    #[inline]
    fn hash_string(&self, s: &str) -> u64 {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        hasher.finish()
    }

    pub fn parse(&mut self, markdown: &str) -> Vec<BasicToken> {
        if markdown.is_empty() {
            return Vec::new();
        }

        // More intelligent cache management
        if self.html_cache.len() > 128 {
            let target_size = self.html_cache.len() / 2;
            let keys_to_remove: Vec<_> = self.html_cache.keys().take(target_size).copied().collect();
            for key in keys_to_remove {
                self.html_cache.remove(&key);
            }
        }

        let mut tokens = Vec::with_capacity(markdown.len() / 80);
        let lines: Vec<&str> = markdown.lines().collect();
        let mut i = 0;

        while i < lines.len() {
            let line = lines[i].trim_end();
            
            if line.trim().is_empty() {
                i += 1;
                continue;
            }

            // Code blocks
            if line.starts_with("```") {
                let (code_token, consumed) = self.parse_code_block(&lines, i);
                tokens.push(code_token);
                i += consumed;
                continue;
            }

            // Headings
            if let Some(token) = self.parse_heading(line) {
                tokens.push(token);
                i += 1;
                continue;
            }

            // Horizontal rules
            if self.is_horizontal_rule(line) {
                tokens.push(BasicToken::HorizontalRule);
                i += 1;
                continue;
            }

            // Lists
            if self.is_list_line(line) {
                let (list_token, consumed) = self.parse_list(&lines, i);
                tokens.push(list_token);
                i += consumed;
                continue;
            }

            // Blockquotes
            if line.trim_start().starts_with("> ") {
                let text = &line.trim_start()[2..];
                let processed_text = self.process_inline_formatting(text);
                tokens.push(BasicToken::Blockquote(processed_text));
                i += 1;
                continue;
            }

            // Paragraphs
            let processed_text = self.process_inline_formatting(line);
            tokens.push(BasicToken::Paragraph(processed_text));
            i += 1;
        }

        tokens
    }

    #[inline]
    fn is_list_line(&self, line: &str) -> bool {
        let trimmed = line.trim_start();
        
        // Quick check for minimum length
        if trimmed.len() < 2 {
            return false;
        }
        
        // Unordered lists - use bytes for faster comparison
        let first_two = trimmed.as_bytes();
        if (first_two[0] == b'-' || first_two[0] == b'*' || first_two[0] == b'+') && first_two[1] == b' ' {
            return true;
        }
        
        // Ordered lists - optimized for common case
        if let Some(dot_pos) = trimmed.find(". ") {
            if dot_pos > 0 && dot_pos <= 3 {
                return trimmed.as_bytes()[..dot_pos].iter().all(|&b| b.is_ascii_digit());
            }
        }
        
        false
    }

    #[inline]
    fn get_list_indent_level(&self, line: &str) -> u8 {
        let mut level = 0u8;
        for ch in line.chars() {
            match ch {
                ' ' => level = level.saturating_add(1),
                '\t' => level = level.saturating_add(4),
                _ => break,
            }
        }
        (level / 2).min(15)
    }

    fn parse_list(&mut self, lines: &[&str], start: usize) -> (BasicToken, usize) {
        let mut items = Vec::new();
        let mut consumed = 0;
        let first_line = lines[start];
        let is_ordered = first_line.trim_start().chars().next().unwrap_or(' ').is_ascii_digit();
        
        // Calcular o nível base da primeira linha
        let base_level = self.get_list_indent_level(first_line);
        
        let mut i = start;
        while i < lines.len() {
            let line = lines[i];
            
            if line.trim().is_empty() {
                i += 1;
                consumed += 1;
                continue;
            }
            
            if !self.is_list_line(line) {
                break;
            }
            
            let absolute_level = self.get_list_indent_level(line);
            let level = absolute_level.saturating_sub(base_level); // Nível relativo ao primeiro item
            let trimmed = line.trim_start();
            
            let content = if is_ordered {
                if let Some(pos) = trimmed.find(". ") {
                    &trimmed[pos + 2..]
                } else {
                    ""
                }
            } else {
                &trimmed[2..]
            };
            
            let processed_content = self.process_inline_formatting(content.trim());
            
            items.push(BasicListItem {
                content: processed_content,
                level,
            });
            
            i += 1;
            consumed += 1;
        }
        
        (BasicToken::List { items, ordered: is_ordered }, consumed)
    }

    fn parse_heading(&self, line: &str) -> Option<BasicToken> {
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

        Some(BasicToken::Heading { level, text })
    }

    fn parse_code_block(&mut self, lines: &[&str], start: usize) -> (BasicToken, usize) {
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

        let token = BasicToken::CodeBlock {
            language,
            code: code.clone(),
        };

        self.return_buffer(code);
        (token, consumed)
    }

    #[inline]
    fn is_horizontal_rule(&self, line: &str) -> bool {
        let trimmed = line.trim();
        if trimmed.len() < 3 {
            return false;
        }

        // Use bytes for faster comparison
        let bytes = trimmed.as_bytes();
        let first_char = bytes[0];
        if !matches!(first_char, b'-' | b'*') {
            return false;
        }
        
        bytes.iter().all(|&b| b == first_char)
    }

    fn process_inline_formatting(&mut self, text: &str) -> String {
        if text.is_empty() {
            return String::new();
        }

        let hash = self.hash_string(text);
        if let Some(cached) = self.html_cache.get(&hash) {
            return cached.clone();
        }

        // Fast path for text without markdown formatting
        if !text.as_bytes().iter().any(|&b| matches!(b, b'*' | b'`' | b'[' | b'!')) {
            let result = text.to_string();
            if self.html_cache.len() < 64 {
                self.html_cache.insert(hash, result.clone());
            }
            return result;
        }

        let mut result = self.get_buffer();
        result.reserve(text.len() + (text.len() >> 2));
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
                    chars.next();
                    let mut temp_chars = chars.clone();
                    if let Some((alt_text, url)) = self.extract_link(&mut temp_chars) {
                        chars = temp_chars;
                        result.push_str("<img src=\"");
                        result.push_str(&self.escape_html(&url));
                        result.push_str("\" alt=\"");
                        result.push_str(&self.escape_html(&alt_text));
                        result.push_str("\" loading=\"lazy\">");
                    } else {
                        result.push('!');
                    }
                }
                '[' => {
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
        
        self.html_cache.insert(hash, output.clone());
        output
    }

    fn extract_until(&self, chars: &mut std::iter::Peekable<std::str::Chars>, delimiter: &str) -> Option<String> {
        let mut content = String::with_capacity(32);
        
        match delimiter {
            "*" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '*' {
                        chars.next();
                        return Some(content);
                    }
                    chars.next();
                    content.push(ch);
                    if content.len() > 200 { return None; }
                }
            }
            "**" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '*' {
                        chars.next();
                        if let Some(&next_ch) = chars.peek() {
                            if next_ch == '*' {
                                chars.next();
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
                    if content.len() > 200 { return None; }
                }
            }
            "`" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '`' {
                        chars.next();
                        return Some(content);
                    }
                    chars.next();
                    content.push(ch);
                    if content.len() > 200 { return None; }
                }
            }
            _ => return None,
        }

        None
    }

    fn extract_link(&self, chars: &mut std::iter::Peekable<std::str::Chars>) -> Option<(String, String)> {
        let mut link_text = String::with_capacity(16);
        
        while let Some(&ch) = chars.peek() {
            chars.next();
            if ch == ']' {
                break;
            }
            link_text.push(ch);
            if link_text.len() > 100 {
                return None;
            }
        }

        if chars.peek() != Some(&'(') {
            return None;
        }
        chars.next();

        let mut url = String::with_capacity(64);
        
        while let Some(&ch) = chars.peek() {
            chars.next();
            if ch == ')' {
                return Some((link_text, url));
            }
            url.push(ch);
            if url.len() > 200 {
                return None;
            }
        }

        None
    }

    #[inline]
    fn escape_html(&self, text: &str) -> String {
        if !text.contains(&['&', '<', '>', '"', '\''][..]) {
            return text.to_string();
        }
        
        let mut result = String::with_capacity(text.len() + (text.len() >> 4));
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

use crate::markdown::parser::ParseResult;

pub fn parse_basic_markdown_to_html(markdown: &str) -> Result<ParseResult, String> {
    let mut parser = BasicMarkdownParser::new();
    let tokens = parser.parse(markdown);
    
    let mut html = String::with_capacity(markdown.len() + (markdown.len() >> 2));
    let mut word_count = 0;
    
    for token in tokens {
        match token {
            BasicToken::Heading { level, text } => {
                word_count += count_words(&text);
                html.push_str(&format!("<h{0}>{1}</h{0}>", level, text));
            },
            BasicToken::Paragraph(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<p>{}</p>", text));
            },
            BasicToken::CodeBlock { language, code } => {
                word_count += count_words(&code);
                if let Some(lang) = language {
                    html.push_str(&format!("<pre><code class=\"language-{}\">{}</code></pre>", lang, code));
                } else {
                    html.push_str(&format!("<pre><code>{}</code></pre>", code));
                }
            },
            BasicToken::List { items, ordered } => {
                if ordered {
                    html.push_str("<ol>");
                } else {
                    html.push_str("<ul>");
                }
                
                render_basic_list_items(&items, &mut html, &mut word_count);
                
                if ordered {
                    html.push_str("</ol>");
                } else {
                    html.push_str("</ul>");
                }
            },
            BasicToken::Blockquote(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<blockquote><p>{}</p></blockquote>", text));
            },
            BasicToken::HorizontalRule => {
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

fn render_basic_list_items(items: &[BasicListItem], html: &mut String, word_count: &mut usize) {
    if items.is_empty() {
        return;
    }
    
    let mut current_level = 0u8;
    let mut stack = Vec::with_capacity(8);
    
    for (i, item) in items.iter().enumerate() {
        *word_count += count_words(&item.content);
        
        // Adjust nesting level
        if item.level > current_level {
            // Going deeper - open new nested lists
            for _ in current_level..item.level {
                html.push_str("<ul>");
                stack.push("</ul>");
            }
        } else if item.level < current_level {
            // Going shallower - close nested lists
            for _ in item.level..current_level {
                html.push_str("</li>");
                if let Some(close_tag) = stack.pop() {
                    html.push_str(close_tag);
                }
            }
        } else if i > 0 {
            // Same level as previous - close previous list item
            html.push_str("</li>");
        }
        
        current_level = item.level;
        
        // Open new list item
        html.push_str(&format!("<li>{}", item.content));
    }
    
    // Close the final list item
    html.push_str("</li>");
    
    // Close all remaining nested lists
    while let Some(close_tag) = stack.pop() {
        html.push_str(close_tag);
    }
}

#[inline]
fn count_words(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    
    let mut count = 0;
    let mut in_word = false;
    
    for byte in text.bytes() {
        if byte.is_ascii_whitespace() {
            in_word = false;
        } else if !in_word {
            in_word = true;
            count += 1;
        }
    }
    
    count
}