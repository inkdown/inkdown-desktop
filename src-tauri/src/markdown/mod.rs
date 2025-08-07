pub mod parser;
pub mod renderer;

pub use parser::MarkdownParser;
pub use renderer::HtmlRenderer;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub html: String,
    pub word_count: i32,
    pub error: Option<String>,
}

impl ParseResult {
    pub fn new(html: String, word_count: i32) -> Self {
        Self {
            html,
            word_count,
            error: None,
        }
    }
}