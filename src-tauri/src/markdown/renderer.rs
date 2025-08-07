use super::parser::Token;
use std::collections::VecDeque;

pub struct HtmlRenderer {
    buffer_pool: VecDeque<String>,
}

impl Default for HtmlRenderer {
    fn default() -> Self {
        Self::new()
    }
}

impl HtmlRenderer {
    pub fn new() -> Self {
        let mut buffer_pool = VecDeque::with_capacity(4);
        // Pre-allocate buffers for performance
        for _ in 0..2 {
            buffer_pool.push_back(String::with_capacity(2048));
        }
        
        Self { buffer_pool }
    }

    fn get_buffer(&mut self) -> String {
        self.buffer_pool.pop_front().unwrap_or_else(|| String::with_capacity(1024))
    }

    fn return_buffer(&mut self, mut buffer: String) {
        if buffer.capacity() <= 8192 && self.buffer_pool.len() < 4 {
            buffer.clear();
            self.buffer_pool.push_back(buffer);
        }
    }

    pub fn render(&mut self, tokens: &[Token]) -> String {
        if tokens.is_empty() {
            return String::new();
        }

        let estimated_size = self.estimate_output_size(tokens);
        let mut html = self.get_buffer();
        
        if html.capacity() < estimated_size {
            html.reserve(estimated_size - html.capacity());
        }

        let mut in_list = false;

        for token in tokens {
            match token {
                Token::Heading { level, text } => {
                    if in_list {
                        html.push_str("</ul>\n");
                        in_list = false;
                    }
                    self.write_heading(&mut html, *level, text);
                }
                Token::Paragraph(text) => {
                    if in_list {
                        html.push_str("</ul>\n");
                        in_list = false;
                    }
                    self.write_paragraph(&mut html, text);
                }
                Token::CodeBlock { language, code } => {
                    if in_list {
                        html.push_str("</ul>\n");
                        in_list = false;
                    }
                    self.write_code_block(&mut html, language.as_deref(), code);
                }
                Token::ListItem(text) => {
                    if !in_list {
                        html.push_str("<ul>\n");
                        in_list = true;
                    }
                    self.write_list_item(&mut html, text);
                }
                Token::Blockquote(text) => {
                    if in_list {
                        html.push_str("</ul>\n");
                        in_list = false;
                    }
                    self.write_blockquote(&mut html, text);
                }
                Token::HorizontalRule => {
                    if in_list {
                        html.push_str("</ul>\n");
                        in_list = false;
                    }
                    html.push_str("<hr>\n");
                }
            }
        }

        // Close any open list
        if in_list {
            html.push_str("</ul>\n");
        }

        let result = html.clone();
        self.return_buffer(html);
        result
    }

    fn estimate_output_size(&self, tokens: &[Token]) -> usize {
        let mut size = 0;
        for token in tokens {
            size += match token {
                Token::Heading { text, .. } => text.len() + 20,
                Token::Paragraph(text) => text.len() + 10,
                Token::CodeBlock { code, .. } => code.len() + 50,
                Token::ListItem(text) => text.len() + 15,
                Token::Blockquote(text) => text.len() + 25,
                Token::HorizontalRule => 10,
            };
        }
        // Add 20% buffer
        size + (size / 5)
    }

    #[inline]
    fn write_heading(&self, html: &mut String, level: u8, text: &str) {
        html.push('<');
        html.push('h');
        html.push((b'0' + level) as char);
        html.push('>');
        html.push_str(text);
        html.push_str("</h");
        html.push((b'0' + level) as char);
        html.push_str(">\n");
    }

    #[inline]
    fn write_paragraph(&self, html: &mut String, text: &str) {
        html.push_str("<p>");
        html.push_str(text);
        html.push_str("</p>\n");
    }

    #[inline]
    fn write_code_block(&self, html: &mut String, language: Option<&str>, code: &str) {
        html.push_str("<pre><code");
        if let Some(lang) = language {
            html.push_str(" class=\"language-");
            html.push_str(lang);
            html.push('"');
        }
        html.push('>');
        html.push_str(&self.escape_html(code));
        html.push_str("</code></pre>\n");
    }

    #[inline]
    fn write_list_item(&self, html: &mut String, text: &str) {
        html.push_str("<li>");
        html.push_str(text);
        html.push_str("</li>\n");
    }

    #[inline]
    fn write_blockquote(&self, html: &mut String, text: &str) {
        html.push_str("<blockquote>");
        html.push_str(text);
        html.push_str("</blockquote>\n");
    }

    fn escape_html(&self, text: &str) -> String {
        if !text.contains(&['&', '<', '>', '"', '\''][..]) {
            return text.to_string();
        }

        text.replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
            .replace('\'', "&#x27;")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::markdown::parser::MarkdownParser;

    #[test]
    fn test_basic_rendering() {
        let mut parser = MarkdownParser::new();
        let mut renderer = HtmlRenderer::new();

        let markdown = "# Hello World\n\nThis is a **bold** text.";
        let tokens = parser.parse(markdown);
        let html = renderer.render(&tokens);

        assert!(html.contains("<h1>Hello World</h1>"));
        assert!(html.contains("<p>This is a <strong>bold</strong> text.</p>"));
    }

    #[test]
    fn test_code_block_rendering() {
        let mut parser = MarkdownParser::new();
        let mut renderer = HtmlRenderer::new();

        let markdown = "```rust\nfn main() {\n    println!(\"Hello\");\n}\n```";
        let tokens = parser.parse(markdown);
        let html = renderer.render(&tokens);

        assert!(html.contains("<pre><code class=\"language-rust\">"));
        assert!(html.contains("fn main()"));
    }
}