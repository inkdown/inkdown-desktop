use serde_json;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, command};

pub fn get_or_create_config_dir() -> Result<PathBuf, String> {
    let home_dir = env::var("HOME")
        .or_else(|_| env::var("USERPROFILE"))
        .map_err(|_| "Could not find home directory")?;

    let config_dir = Path::new(&home_dir).join(".inkdown");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(config_dir)
}

#[tauri::command]
pub fn get_app_config_dir() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    config_dir
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
pub fn save_appearance_config(config: serde_json::Value) -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("appearance.json");

    let mut current_config: serde_json::Value = if config_file.exists() {
        match fs::read_to_string(&config_file) {
            Ok(content) if !content.trim().is_empty() => {
                // Try to parse, but preserve original data if parsing fails
                serde_json::from_str(&content).unwrap_or_else(|_| {
                    // If parsing fails, start with empty object but keep backup
                    let mut fallback = serde_json::json!({});
                    fallback["_backup_content"] = serde_json::Value::String(content);
                    fallback
                })
            }
            _ => serde_json::json!({})
        }
    } else {
        serde_json::json!({})
    };

    if let serde_json::Value::Object(config_map) = config {
        for (key, value) in config_map {
            current_config[key] = value;
        }
    }

    let config_string = serde_json::to_string_pretty(&current_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(config_file, config_string)
        .map_err(|e| format!("Failed to save appearance config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_appearance_config() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("appearance.json");

    if !config_file.exists() {
        let default_config = serde_json::json!({
            "theme": "light",
            "font-size": 14,
            "font-family": "Inter, system-ui, sans-serif"
        });

        let config_string = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;

        fs::write(&config_file, &config_string)
            .map_err(|e| format!("Failed to create default appearance config: {}", e))?;

        return Ok(config_string);
    }

    fs::read_to_string(&config_file).map_err(|e| format!("Failed to load appearance config: {}", e))
}

#[tauri::command]
pub fn clear_workspace_config() -> Result<(), String> {
    let cache = CONFIG_CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(mut cached_config) = cache.lock() {
        *cached_config = None;
    }
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");

    if config_file.exists() {
        fs::remove_file(config_file)
            .map_err(|e| format!("Failed to clear workspace config: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn is_first_run() -> Result<bool, String> {
    let config_dir = get_or_create_config_dir()?;
    let workspace_config = config_dir.join("workspace.json");

    if !workspace_config.exists() {
        return Ok(true);
    }

    match fs::read_to_string(&workspace_config) {
        Ok(content) => {
            if content.trim().is_empty() {
                return Ok(true);
            }
            
            if let Ok(config) = serde_json::from_str::<serde_json::Value>(&content) {
                // Check if workspace_path exists and is not null/empty string
                match &config["workspace_path"] {
                    serde_json::Value::Null => Ok(true),
                    serde_json::Value::String(path) if path.trim().is_empty() => Ok(true),
                    serde_json::Value::String(_) => Ok(false),
                    _ => Ok(true), // Any other type means invalid config
                }
            } else {
                Ok(true) // Corrupted JSON = first run
            }
        }
        Err(_) => Ok(true), // Can't read = first run
    }
}

fn create_default_workspace_config() -> serde_json::Value {
    serde_json::json!({
        "workspace_path": null,
        "vimMode": false,
        "showLineNumbers": false,
        "highlightCurrentLine": true,
        "readOnly": false,
        "sidebarVisible": true,
        "githubMarkdown": false,
        "pasteUrlsAsLinks": true,
        "devMode": false,
        "shortcuts": [
            {
                "name": "toggleSidebar",
                "shortcut": "Ctrl+Shift+B"
            },
            {
                "name": "openNotePalette",
                "shortcut": "Ctrl+O"
            },
            {
                "name": "save",
                "shortcut": "Ctrl+S"
            },
            {
                "name": "openSettings",
                "shortcut": "Ctrl+P"
            }
        ]
    })
}

#[tauri::command]
pub fn save_workspace_config(workspace_path: String) -> Result<(), String> {
    let cache = CONFIG_CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(mut cached_config) = cache.lock() {
        *cached_config = None;
    }
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");

    let mut config: serde_json::Value = if config_file.exists() {
        match fs::read_to_string(&config_file) {
            Ok(content) if !content.trim().is_empty() => {
                // Try to parse existing config
                match serde_json::from_str(&content) {
                    Ok(parsed_config) => parsed_config,
                    Err(_) => {
                        // If parsing fails, still use defaults but log the issue
                        create_default_workspace_config()
                    }
                }
            }
            _ => create_default_workspace_config()
        }
    } else {
        create_default_workspace_config()
    };

    config["workspace_path"] = serde_json::Value::String(workspace_path);

    let config_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(config_file, config_string)
        .map_err(|e| format!("Failed to save workspace config: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn update_workspace_config(config: serde_json::Value) -> Result<(), String> {
    let cache = CONFIG_CACHE.get_or_init(|| Mutex::new(None));
    if let Ok(mut cached_config) = cache.lock() {
        *cached_config = None;
    }
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");

    let mut current_config: serde_json::Value = if config_file.exists() {
        match fs::read_to_string(&config_file) {
            Ok(content) if !content.trim().is_empty() => {
                // Try to parse existing config, preserve original data
                match serde_json::from_str(&content) {
                    Ok(parsed_config) => parsed_config,
                    Err(_) => {
                        // If parsing fails, return error instead of overwriting with defaults
                        return Err(format!("Failed to parse existing workspace config. Content: {}", content));
                    }
                }
            }
            _ => create_default_workspace_config()
        }
    } else {
        create_default_workspace_config()
    };

    // Debug: Check if workspace_path exists before update
    let workspace_path_before = current_config.get("workspace_path").cloned();
    
    if let serde_json::Value::Object(config_map) = config {
        for (key, value) in config_map {
            current_config[key] = value;
        }
    }
    
    // Debug: Check if workspace_path exists after update
    let workspace_path_after = current_config.get("workspace_path").cloned();

    let config_string = serde_json::to_string_pretty(&current_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(config_file, config_string)
        .map_err(|e| format!("Failed to update workspace config: {}", e))?;

    Ok(())
}

use std::sync::{Mutex, OnceLock};

static CONFIG_CACHE: OnceLock<Mutex<Option<serde_json::Value>>> = OnceLock::new();

#[tauri::command]
pub fn load_workspace_config() -> Result<String, String> {
    let cache = CONFIG_CACHE.get_or_init(|| Mutex::new(None));
    
    if let Ok(cached_config) = cache.lock() {
        if let Some(config) = &*cached_config {
            return serde_json::to_string_pretty(config)
                .map_err(|e| format!("Failed to serialize cached config: {}", e));
        }
    }
    
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");

    let config = if !config_file.exists() {
        let default_config = create_default_workspace_config();
        let config_string = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;

        fs::write(&config_file, &config_string)
            .map_err(|e| format!("Failed to create default workspace config: {}", e))?;

        default_config
    } else {
        let config_content = fs::read_to_string(&config_file)
            .map_err(|e| format!("Failed to load workspace config: {}", e))?;

        match serde_json::from_str::<serde_json::Value>(&config_content) {
            Ok(config) => config,
            Err(_) => {
                return Ok(config_content);
            }
        }
    };
    
    if let Ok(mut cached_config) = cache.lock() {
        *cached_config = Some(config.clone());
    }
    
    serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))
}

#[tauri::command]
pub fn get_plugins_directory_path() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let plugins_dir = config_dir.join("plugins");
    
    // Create plugins directory if it doesn't exist
    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }
    
    plugins_dir
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
pub fn get_themes_directory_path() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let themes_dir = config_dir.join("themes");
    
    // Create themes directory if it doesn't exist
    if !themes_dir.exists() {
        fs::create_dir_all(&themes_dir)
            .map_err(|e| format!("Failed to create themes directory: {}", e))?;
    }
    
    themes_dir
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

#[tauri::command]
pub async fn open_directory_in_explorer(app_handle: AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    
    if !path_buf.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    
    app_handle
        .opener()
        .open_path(&path, None::<String>)
        .map_err(|e| format!("Failed to open directory: {}", e))
}