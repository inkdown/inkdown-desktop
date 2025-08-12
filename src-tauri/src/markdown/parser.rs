use crate::markdown::basic_parser::parse_basic_markdown_to_html;
use crate::markdown::gfm_parser::parse_gfm_markdown_to_html;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ParseResult {
    pub html: String,
    pub word_count: usize,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

pub fn parse_markdown_to_html(markdown: &str) -> Result<ParseResult, String> {
    parse_basic_markdown_to_html(markdown)
}

pub fn parse_markdown_to_html_with_config(markdown: &str, gfm_enabled: bool) -> Result<ParseResult, String> {
    if gfm_enabled {
        parse_gfm_markdown_to_html(markdown)
    } else {
        parse_basic_markdown_to_html(markdown)
    }
}