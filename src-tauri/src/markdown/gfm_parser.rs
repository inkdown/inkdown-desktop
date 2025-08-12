use std::collections::{VecDeque, HashMap};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

#[derive(Debug, Clone)]
pub enum GfmToken {
    Heading { level: u8, text: String },
    Paragraph(String),
    CodeBlock { language: Option<String>, code: String },
    List { items: Vec<GfmListItem>, ordered: bool },
    Table { headers: Vec<String>, rows: Vec<Vec<String>>, alignments: Vec<Alignment> },
    Blockquote(String),
    Alert { alert_type: AlertType, content: String },
    HorizontalRule,
}

#[derive(Debug, Clone)]
pub struct GfmListItem {
    pub content: String,
    pub level: u8,
    pub checked: Option<bool>,
}

#[derive(Debug, Clone)]
pub enum Alignment {
    Left,
    Center,
    Right,
    None,
}

#[derive(Debug, Clone)]
pub enum AlertType {
    Note,
    Tip,
    Important,
    Warning,
    Caution,
}

pub struct GfmMarkdownParser {
    buffer_pool: VecDeque<String>,
    html_cache: HashMap<u64, String>,
}

impl Default for GfmMarkdownParser {
    fn default() -> Self {
        Self::new()
    }
}

impl GfmMarkdownParser {
    pub fn new() -> Self {
        let mut buffer_pool = VecDeque::with_capacity(12);
        
        for _ in 0..8 {
            buffer_pool.push_back(String::with_capacity(2048));
        }
        
        Self { 
            buffer_pool,
            html_cache: HashMap::with_capacity(128),
        }
    }

    #[inline]
    fn get_buffer(&mut self) -> String {
        self.buffer_pool.pop_front().unwrap_or_else(|| String::with_capacity(512))
    }

    #[inline]
    fn return_buffer(&mut self, mut buffer: String) {
        if buffer.capacity() <= 8192 && self.buffer_pool.len() < 12 {
            buffer.clear();
            self.buffer_pool.push_back(buffer);
        }
    }


    #[inline]
    fn hash_string(&self, s: &str) -> u64 {
        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        hasher.finish()
    }

    pub fn parse(&mut self, markdown: &str) -> Vec<GfmToken> {
        if markdown.is_empty() {
            return Vec::new();
        }

        if self.html_cache.len() > 256 {
            let target_size = self.html_cache.len() / 2;
            let mut to_remove = Vec::new();
            for (key, _) in self.html_cache.iter().take(target_size) {
                to_remove.push(*key);
            }
            for key in to_remove {
                self.html_cache.remove(&key);
            }
        }

        let mut tokens = Vec::with_capacity(markdown.len() / 50);
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

            if self.is_potential_table_line(line) && i + 1 < lines.len() {
                if let Some((table_token, consumed)) = self.parse_table(&lines, i) {
                    tokens.push(table_token);
                    i += consumed;
                    continue;
                }
            }

            if let Some(token) = self.parse_heading(line) {
                tokens.push(token);
                i += 1;
                continue;
            }

            if self.is_horizontal_rule(line) {
                tokens.push(GfmToken::HorizontalRule);
                i += 1;
                continue;
            }

            if self.is_list_line(line) {
                let (list_token, consumed) = self.parse_list(&lines, i);
                tokens.push(list_token);
                i += consumed;
                continue;
            }

            if line.trim_start().starts_with("> ") {
                if let Some((alert_token, consumed)) = self.parse_alert(&lines, i) {
                    tokens.push(alert_token);
                    i += consumed;
                    continue;
                }
                
                let text = &line.trim_start()[2..];
                let processed_text = self.process_inline_formatting(text);
                tokens.push(GfmToken::Blockquote(processed_text));
                i += 1;
                continue;
            }

            let processed_text = self.process_inline_formatting(line);
            tokens.push(GfmToken::Paragraph(processed_text));
            i += 1;
        }

        tokens
    }

    #[inline]
    fn is_list_line(&self, line: &str) -> bool {
        let trimmed = line.trim_start();
        
        if trimmed.starts_with("- ") || trimmed.starts_with("* ") || trimmed.starts_with("+ ") {
            return true;
        }
        
        if let Some(dot_pos) = trimmed.find(". ") {
            if dot_pos > 0 && dot_pos <= 4 {
                return trimmed.bytes().take(dot_pos).all(|b| b.is_ascii_digit());
            }
        }
        
        false
    }

    #[inline]
    fn get_list_indent_level(&self, line: &str) -> u8 {
        let mut level = 0u8;
        for byte in line.bytes() {
            match byte {
                b' ' => level = level.saturating_add(1),
                b'\t' => level = level.saturating_add(4),
                _ => break,
            }
        }
        (level / 2).min(20)
    }

    fn parse_list(&mut self, lines: &[&str], start: usize) -> (GfmToken, usize) {
        let mut items = Vec::with_capacity(8);
        let mut consumed = 0;
        let first_line = lines[start];
        let is_ordered = first_line.trim_start().bytes().next().unwrap_or(b' ').is_ascii_digit();
        
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
            let level = absolute_level.saturating_sub(base_level);
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
            
            let (checked, final_content) = if content.len() >= 3 && content.starts_with('[') {
                let second_char = content.bytes().nth(1).unwrap_or(b'?');
                match second_char {
                    b' ' if content.bytes().nth(2) == Some(b']') => (Some(false), &content[3..]),
                    b'x' | b'X' if content.bytes().nth(2) == Some(b']') => (Some(true), &content[3..]),
                    _ => (None, content),
                }
            } else {
                (None, content)
            };
            
            let processed_content = self.process_inline_formatting(final_content.trim());
            
            items.push(GfmListItem {
                content: processed_content,
                level,
                checked,
            });
            
            i += 1;
            consumed += 1;
        }
        
        (GfmToken::List { items, ordered: is_ordered }, consumed)
    }

    #[inline]
    fn is_potential_table_line(&self, line: &str) -> bool {
        line.len() > 2 && line.contains('|')
    }

    fn parse_table(&mut self, lines: &[&str], start: usize) -> Option<(GfmToken, usize)> {
        if start + 1 >= lines.len() {
            return None;
        }
        
        let header_line = lines[start];
        let separator_line = lines[start + 1];
        
        // Verificar se segunda linha é separador válido
        if !self.is_table_separator(separator_line) {
            return None;
        }
        
        let mut headers = Vec::new();
        let mut alignments = Vec::new();
        
        let header_cells: Vec<&str> = if header_line.starts_with('|') && header_line.ends_with('|') {
            header_line[1..header_line.len()-1].split('|').collect()
        } else {
            header_line.split('|').collect()
        };
        
        for cell in header_cells {
            let trimmed = cell.trim();
            if !trimmed.is_empty() {
                headers.push(self.process_inline_formatting(trimmed));
            }
        }
        
        if headers.is_empty() {
            return None;
        }
        
        let separator_cells: Vec<&str> = if separator_line.starts_with('|') && separator_line.ends_with('|') {
            separator_line[1..separator_line.len()-1].split('|').collect()
        } else {
            separator_line.split('|').collect()
        };
        
        for cell in separator_cells {
            let trimmed = cell.trim();
            if !trimmed.is_empty() && trimmed.contains('-') {
                let starts_colon = trimmed.starts_with(':');
                let ends_colon = trimmed.ends_with(':');
                
                let alignment = match (starts_colon, ends_colon) {
                    (true, true) => Alignment::Center,
                    (false, true) => Alignment::Right,
                    (true, false) => Alignment::Left,
                    (false, false) => Alignment::None,
                };
                alignments.push(alignment);
            } else {
                alignments.push(Alignment::None);
            }
        }
        
        let mut rows = Vec::new();
        let mut consumed = 2;
        
        let mut i = start + 2;
        while i < lines.len() {
            let line = lines[i];
            if !line.contains('|') || line.trim().is_empty() {
                break;
            }
            
            let row_cells: Vec<&str> = if line.starts_with('|') && line.ends_with('|') {
                line[1..line.len()-1].split('|').collect()
            } else {
                line.split('|').collect()
            };
            
            let mut row = Vec::with_capacity(headers.len());
            for cell in row_cells {
                let trimmed = cell.trim();
                row.push(self.process_inline_formatting(trimmed));
            }
            
            if !row.is_empty() {
                rows.push(row);
                consumed += 1;
            }
            
            i += 1;
        }
        
        Some((GfmToken::Table { headers, rows, alignments }, consumed))
    }

    fn is_table_separator(&self, line: &str) -> bool {
        let trimmed = line.trim();
        if trimmed.len() < 3 || !trimmed.contains('|') {
            return false;
        }
        
        let cells: Vec<&str> = if trimmed.starts_with('|') && trimmed.ends_with('|') {
            trimmed[1..trimmed.len()-1].split('|').collect()
        } else {
            trimmed.split('|').collect()
        };
        
        let mut found_valid_separator = false;
        
        for cell in cells {
            let cell_trimmed = cell.trim();
            if cell_trimmed.is_empty() {
                continue;
            }
            
            if !cell_trimmed.bytes().all(|b| matches!(b, b':' | b'-' | b' ')) {
                return false;
            }
            
            if cell_trimmed.contains('-') {
                found_valid_separator = true;
            }
        }
        
        found_valid_separator
    }

    fn parse_heading(&self, line: &str) -> Option<GfmToken> {
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

        Some(GfmToken::Heading { level, text })
    }

    fn parse_code_block(&mut self, lines: &[&str], start: usize) -> (GfmToken, usize) {
        let first_line = lines[start];
        let language = if first_line.len() > 3 {
            let lang = first_line[3..].trim();
            if lang.is_empty() { None } else { Some(lang.to_string()) }
        } else {
            None
        };

        let mut code = self.get_buffer();
        code.reserve(lines.len() * 50);
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

        let token = GfmToken::CodeBlock {
            language,
            code: code.clone(),
        };

        self.return_buffer(code);
        (token, consumed)
    }

    #[inline]
    fn parse_alert_type(&self, text: &str) -> Option<AlertType> {
        match text {
            "[!NOTE]" => Some(AlertType::Note),
            "[!TIP]" => Some(AlertType::Tip),
            "[!IMPORTANT]" => Some(AlertType::Important),
            "[!WARNING]" => Some(AlertType::Warning),
            "[!CAUTION]" => Some(AlertType::Caution),
            _ => None,
        }
    }

    fn parse_alert(&mut self, lines: &[&str], start: usize) -> Option<(GfmToken, usize)> {
        let first_line = lines[start];
        let trimmed = first_line.trim_start();
        
        if !trimmed.starts_with("> [!") {
            return None;
        }
        
        let alert_text = &trimmed[2..];
        
        if let Some(close_bracket) = alert_text.find(']') {
            let alert_type_str = &alert_text[..close_bracket + 1];
            
            if let Some(alert_type) = self.parse_alert_type(alert_type_str) {
                let mut content = String::with_capacity(256);
                let mut consumed = 1;
                
                // Adicionar conteúdo da primeira linha após o tipo
                let remaining_first = &alert_text[close_bracket + 1..].trim();
                if !remaining_first.is_empty() {
                    content.push_str(&self.process_inline_formatting(remaining_first));
                }
                
                // Processar linhas subsequentes
                for i in (start + 1)..lines.len() {
                    let line = lines[i];
                    let trimmed_line = line.trim_start();
                    
                    if trimmed_line.starts_with("> ") {
                        let line_content = &trimmed_line[2..];
                        
                        // Parar se encontrar outro alert
                        if line_content.starts_with("[!") {
                            break;
                        }
                        
                        if !content.is_empty() {
                            content.push(' ');
                        }
                        content.push_str(&self.process_inline_formatting(line_content));
                        consumed += 1;
                    } else if trimmed_line.trim().is_empty() {
                        // Linha vazia - continuar mas não incrementar consumed se não há conteúdo
                        consumed += 1;
                    } else {
                        break;
                    }
                }
                
                return Some((GfmToken::Alert { alert_type, content }, consumed));
            }
        }
        
        None
    }

    #[inline]
    fn is_horizontal_rule(&self, line: &str) -> bool {
        let trimmed = line.trim();
        if trimmed.len() < 3 {
            return false;
        }

        let first_char = trimmed.bytes().next().unwrap_or(0);
        if !matches!(first_char, b'-' | b'*') {
            return false;
        }

        trimmed.bytes().all(|b| b == first_char) && trimmed.len() >= 3
    }

    fn process_inline_formatting(&mut self, text: &str) -> String {
        if text.is_empty() {
            return String::new();
        }

        let hash = self.hash_string(text);
        if let Some(cached) = self.html_cache.get(&hash) {
            return cached.to_owned();
        }

        if !text.as_bytes().iter().any(|&b| matches!(b, b'*' | b'`' | b'[' | b'!' | b'~' | b'_')) {
            let result = text.to_string();
            if self.html_cache.len() < 256 {
                self.html_cache.insert(hash, result.clone());
            }
            return result;
        }

        let mut result = self.get_buffer();
        result.reserve(text.len() + (text.len() >> 2));
        let mut chars = text.chars().peekable();
        
        while let Some(ch) = chars.next() {
            match ch {
                '~' if chars.peek() == Some(&'~') => {
                    chars.next();
                    if let Some(strike_text) = self.extract_until(&mut chars, "~~") {
                        result.push_str("<del>");
                        result.push_str(&strike_text);
                        result.push_str("</del>");
                    } else {
                        result.push_str("~~");
                    }
                }
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
                '_' if chars.peek() == Some(&'_') => {
                    chars.next();
                    if let Some(bold_text) = self.extract_until(&mut chars, "__") {
                        result.push_str("<strong>");
                        result.push_str(&bold_text);
                        result.push_str("</strong>");
                    } else {
                        result.push_str("__");
                    }
                }
                '_' => {
                    if let Some(italic_text) = self.extract_until(&mut chars, "_") {
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
        
        if self.html_cache.len() < 256 {
            self.html_cache.insert(hash, output.clone());
        }
        output
    }

    fn extract_until(&self, chars: &mut std::iter::Peekable<std::str::Chars>, delimiter: &str) -> Option<String> {
        let mut content = String::with_capacity(64);
        let max_len = match delimiter {
            "~~" | "**" | "__" => 300,
            "*" | "`" | "_" => 200,
            _ => return None,
        };
        
        match delimiter {
            "*" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '*' {
                        chars.next();
                        return Some(content);
                    }
                    chars.next();
                    content.push(ch);
                    if content.len() > max_len { return None; }
                }
            }
            "**" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '*' {
                        chars.next();
                        if chars.peek() == Some(&'*') {
                            chars.next();
                            return Some(content);
                        } else {
                            content.push(ch);
                        }
                    } else {
                        chars.next();
                        content.push(ch);
                    }
                    if content.len() > max_len { return None; }
                }
            }
            "~~" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '~' {
                        chars.next();
                        if chars.peek() == Some(&'~') {
                            chars.next();
                            return Some(content);
                        } else {
                            content.push(ch);
                        }
                    } else {
                        chars.next();
                        content.push(ch);
                    }
                    if content.len() > max_len { return None; }
                }
            }
            "_" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '_' {
                        chars.next();
                        return Some(content);
                    }
                    chars.next();
                    content.push(ch);
                    if content.len() > max_len { return None; }
                }
            }
            "__" => {
                while let Some(&ch) = chars.peek() {
                    if ch == '_' {
                        chars.next();
                        if chars.peek() == Some(&'_') {
                            chars.next();
                            return Some(content);
                        } else {
                            content.push(ch);
                        }
                    } else {
                        chars.next();
                        content.push(ch);
                    }
                    if content.len() > max_len { return None; }
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
                    if content.len() > max_len { return None; }
                }
            }
            _ => return None,
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
            if link_text.len() > 200 {
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
            if url.len() > 500 {
                return None;
            }
        }

        None
    }


    #[inline]
    fn escape_html(&self, text: &str) -> String {
        if !text.as_bytes().iter().any(|&b| matches!(b, b'&' | b'<' | b'>' | b'"' | b'\'')) {
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

use crate::markdown::parser::ParseResult;

pub fn parse_gfm_markdown_to_html(markdown: &str) -> Result<ParseResult, String> {
    let mut parser = GfmMarkdownParser::new();
    let tokens = parser.parse(markdown);
    
    let mut html = String::with_capacity(markdown.len() + (markdown.len() >> 1));
    let mut word_count = 0;
    
    for token in tokens {
        match token {
            GfmToken::Heading { level, text } => {
                word_count += count_words(&text);
                html.push_str(&format!("<h{0}>{1}</h{0}>", level, text));
            },
            GfmToken::Paragraph(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<p>{}</p>", text));
            },
            GfmToken::CodeBlock { language, code } => {
                word_count += count_words(&code);
                if let Some(lang) = language {
                    html.push_str(&format!("<pre><code class=\"language-{}\">{}</code></pre>", lang, code));
                } else {
                    html.push_str(&format!("<pre><code>{}</code></pre>", code));
                }
            },
            GfmToken::List { items, ordered } => {
                let tag = if ordered { "ol" } else { "ul" };
                html.push_str(&format!("<{}>", tag));
                
                render_gfm_list_items(&items, &mut html, &mut word_count);
                
                html.push_str(&format!("</{}>", tag));
            },
            GfmToken::Table { headers, rows, alignments } => {
                html.push_str("<table>");
                
                html.push_str("<thead><tr>");
                for (i, header) in headers.iter().enumerate() {
                    let align = get_align_style(&alignments, i);
                    html.push_str(&format!("<th{}>{}</th>", align, header));
                    word_count += count_words(header);
                }
                html.push_str("</tr></thead>");
                
                if !rows.is_empty() {
                    html.push_str("<tbody>");
                    for row in rows {
                        html.push_str("<tr>");
                        for (i, cell) in row.iter().enumerate() {
                            let align = get_align_style(&alignments, i);
                            html.push_str(&format!("<td{}>{}</td>", align, cell));
                            word_count += count_words(cell);
                        }
                        html.push_str("</tr>");
                    }
                    html.push_str("</tbody>");
                }
                
                html.push_str("</table>");
            },
            GfmToken::Blockquote(text) => {
                word_count += count_words(&text);
                html.push_str(&format!("<blockquote><p>{}</p></blockquote>", text));
            },
            GfmToken::Alert { alert_type, content } => {
                word_count += count_words(&content);
                let (class, icon, title) = get_alert_config(&alert_type);
                html.push_str(&format!(
                    "<div class=\"alert alert-{}\"><div class=\"alert-icon\">{}</div><div class=\"alert-content\"><div class=\"alert-title\">{}</div><p>{}</p></div></div>", 
                    class, icon, title, content
                ));
            },
            GfmToken::HorizontalRule => {
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

#[inline]
fn get_alert_config(alert_type: &AlertType) -> (&'static str, &'static str, &'static str) {
    match alert_type {
        AlertType::Note => (
            "note", 
            "ℹ️", 
            "Note"
        ),
        AlertType::Tip => (
            "tip", 
            "💡", 
            "Tip"
        ),
        AlertType::Important => (
            "important", 
            "❗", 
            "Important"
        ),
        AlertType::Warning => (
            "warning", 
            "⚠️", 
            "Warning"
        ),
        AlertType::Caution => (
            "caution", 
            "⛔", 
            "Caution"
        ),
    }
}

#[inline]
fn get_align_style(alignments: &[Alignment], index: usize) -> &'static str {
    match alignments.get(index).unwrap_or(&Alignment::None) {
        Alignment::Left => " style=\"text-align: left\"",
        Alignment::Center => " style=\"text-align: center\"",
        Alignment::Right => " style=\"text-align: right\"",
        Alignment::None => "",
    }
}

fn render_gfm_list_items(items: &[GfmListItem], html: &mut String, word_count: &mut usize) {
    if items.is_empty() {
        return;
    }
    
    let mut current_level = items[0].level;
    let mut level_stack = Vec::with_capacity(8);
    
    for item in items {
        *word_count += count_words(&item.content);
        
        while current_level < item.level {
            html.push_str("<ul>");
            level_stack.push(current_level);
            current_level += 1;
        }
        
        while current_level > item.level {
            if level_stack.pop().is_some() {
                html.push_str("</ul>");
                current_level -= 1;
            } else {
                break;
            }
        }
        
        if let Some(checked) = item.checked {
            let checkbox = if checked {
                "<input type=\"checkbox\" checked disabled> "
            } else {
                "<input type=\"checkbox\" disabled> "
            };
            html.push_str(&format!("<li>{}{}</li>", checkbox, item.content));
        } else {
            html.push_str(&format!("<li>{}</li>", item.content));
        }
    }
    
    while level_stack.pop().is_some() {
        html.push_str("</ul>");
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