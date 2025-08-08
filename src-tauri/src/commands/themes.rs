use serde::{Deserialize, Serialize};
use std::fs;
use crate::commands::config::get_or_create_config_dir;

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeVariant {
    pub id: String,
    pub name: String,
    pub mode: String,
    pub css_file: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomTheme {
    pub name: String,
    pub author: String,
    pub description: String,
    pub variants: Vec<ThemeVariant>,
    pub version: String,
    pub homepage: Option<String>,
}

#[tauri::command]
pub fn get_custom_themes() -> Result<Vec<CustomTheme>, String> {
    let config_dir = get_or_create_config_dir()?;
    let themes_dir = config_dir.join("themes");

    if !themes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut themes = Vec::new();

    let entries =
        fs::read_dir(&themes_dir).map_err(|e| format!("Failed to read themes directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let theme_json = entry_path.join("theme.json");
                if theme_json.exists() {
                    match fs::read_to_string(&theme_json) {
                        Ok(content) => match serde_json::from_str::<CustomTheme>(&content) {
                            Ok(theme) => themes.push(theme),
                            Err(_) => continue,
                        },
                        Err(_) => continue,
                    }
                }
            }
        }
    }

    Ok(themes)
}

#[tauri::command]
pub fn get_theme_css(theme_id: String) -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let themes_dir = config_dir.join("themes");

    if !themes_dir.exists() {
        return Err("Themes directory not found".to_string());
    }

    let entries =
        fs::read_dir(&themes_dir).map_err(|e| format!("Failed to read themes directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let theme_path = entry.path();
            if theme_path.is_dir() {
                let theme_json = theme_path.join("theme.json");
                if !theme_json.exists() {
                    continue;
                }

                let theme_content = fs::read_to_string(&theme_json)
                    .map_err(|e| format!("Failed to read theme.json: {}", e))?;

                let theme: CustomTheme = serde_json::from_str(&theme_content)
                    .map_err(|e| format!("Failed to parse theme.json: {}", e))?;

                if let Some(variant) = theme.variants.iter().find(|v| v.id == theme_id) {
                    let css_file = theme_path.join(&variant.css_file);
                    if css_file.exists() {
                        return fs::read_to_string(css_file).map_err(|e| {
                            format!("Failed to read CSS file '{}': {}", variant.css_file, e)
                        });
                    } else {
                        return Err(format!(
                            "CSS file '{}' not found for theme '{}'",
                            variant.css_file, theme.name
                        ));
                    }
                }
            }
        }
    }

    Err(format!("Theme variant with ID '{}' not found", theme_id))
}