use std::fs;
use std::path::{Path, PathBuf};
use std::env;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileNode>>,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn scan_directory(path: String) -> Result<FileNode, String> {
    scan_directory_recursive(&path)
}

fn scan_directory_recursive(path: &str) -> Result<FileNode, String> {
    let path_obj = Path::new(path);
    
    if !path_obj.exists() {
        return Err("Path does not exist".to_string());
    }

    let name = path_obj
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    if path_obj.is_file() {
        return Ok(FileNode {
            name,
            path: path.to_string(),
            is_directory: false,
            children: None,
        });
    }

    let mut children = Vec::new();
    
    match fs::read_dir(path_obj) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let entry_path = entry.path();
                    let entry_path_str = entry_path.to_string_lossy().to_string();
                    
                    // Filtra apenas arquivos .md e diretórios
                    if entry_path.is_dir() || 
                       (entry_path.is_file() && 
                        entry_path.extension()
                            .map_or(false, |ext| ext == "md" || ext == "markdown")) {
                        
                        if let Ok(child_node) = scan_directory_recursive(&entry_path_str) {
                            children.push(child_node);
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Error reading directory: {}", e)),
    }

    // Ordena: diretórios primeiro, depois arquivos, ambos alfabeticamente
    children.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(FileNode {
        name,
        path: path.to_string(),
        is_directory: true,
        children: Some(children),
    })
}

#[tauri::command]
fn get_app_config_dir() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    Ok(config_dir.to_string_lossy().to_string())
}

fn get_or_create_config_dir() -> Result<PathBuf, String> {
    let config_dir = if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\inkdown
        let appdata = env::var("APPDATA")
            .map_err(|_| "Could not find APPDATA directory".to_string())?;
        PathBuf::from(appdata).join("inkdown")
    } else if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/inkdown
        let home = env::var("HOME")
            .map_err(|_| "Could not find HOME directory".to_string())?;
        PathBuf::from(home).join("Library").join("Application Support").join("inkdown")
    } else {
        // Linux: ~/.inkdown
        let home = env::var("HOME")
            .map_err(|_| "Could not find HOME directory".to_string())?;
        PathBuf::from(home).join(".inkdown")
    };

    // Cria o diretório se não existir
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    Ok(config_dir)
}

#[tauri::command]
fn save_appearance_config(config: String) -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("appearance.json");
    
    fs::write(config_file, config)
        .map_err(|e| format!("Failed to save appearance config: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let old_path_obj = Path::new(&old_path);
    
    if !old_path_obj.exists() {
        return Err("File does not exist".to_string());
    }
    
    // Get parent directory
    let parent_dir = old_path_obj.parent()
        .ok_or("Could not get parent directory".to_string())?;
    
    // Get file extension
    let extension = old_path_obj.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("");
    
    // Create new filename with extension
    let new_filename = if extension.is_empty() {
        new_name
    } else {
        format!("{}.{}", new_name, extension)
    };
    
    // Create new path
    let new_path = parent_dir.join(&new_filename);
    
    // Check if new path already exists
    if new_path.exists() {
        return Err("A file with this name already exists".to_string());
    }
    
    // Rename the file
    fs::rename(&old_path_obj, &new_path)
        .map_err(|e| format!("Failed to rename file: {}", e))?;
    
    // Return the new path
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn load_appearance_config() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("appearance.json");
    
    if !config_file.exists() {
        let default_config = serde_json::json!({
            "font-size": 14,
            "font-family": "Inter, system-ui, sans-serif",
            "theme": "light"
        });
        
        let config_string = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default appearance config: {}", e))?;
            
        fs::write(&config_file, &config_string)
            .map_err(|e| format!("Failed to create default appearance config: {}", e))?;
            
        return Ok(config_string);
    }
    
    fs::read_to_string(config_file)
        .map_err(|e| format!("Failed to load appearance config: {}", e))
}

#[tauri::command]
fn save_workspace_config(workspace_path: String) -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    let current_config = if config_file.exists() {
        fs::read_to_string(&config_file).unwrap_or_default()
    } else {
        String::new()
    };
    
    let mut config: serde_json::Value = if current_config.is_empty() {
        create_default_workspace_config()
    } else {
        serde_json::from_str(&current_config).unwrap_or_else(|_| create_default_workspace_config())
    };
    
    config["workspace_path"] = serde_json::Value::String(workspace_path);
    
    let config_string = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(config_file, config_string)
        .map_err(|e| format!("Failed to save workspace config: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn update_workspace_config(config: serde_json::Value) -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    let current_config = if config_file.exists() {
        fs::read_to_string(&config_file).unwrap_or_default()
    } else {
        String::new()
    };
    
    let mut current_config: serde_json::Value = if current_config.is_empty() {
        create_default_workspace_config()
    } else {
        serde_json::from_str(&current_config).unwrap_or_else(|_| create_default_workspace_config())
    };
    
    // Atualiza apenas os campos fornecidos
    if let serde_json::Value::Object(config_map) = config {
        for (key, value) in config_map {
            current_config[key] = value;
        }
    }
    
    let config_string = serde_json::to_string_pretty(&current_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    
    fs::write(config_file, config_string)
        .map_err(|e| format!("Failed to update workspace config: {}", e))?;
    
    Ok(())
}

fn create_default_workspace_config() -> serde_json::Value {
    serde_json::json!({
        "workspace_path": "/home/furqas/Documents/notation",
        "vimMode": false,
        "showLineNumbers": true,
        "highlightCurrentLine": true,
        "markdown": true,
        "readOnly": false
    })
}

#[tauri::command]
fn load_workspace_config() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    if !config_file.exists() {
        let default_config = create_default_workspace_config();
        let config_string = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;
        
        fs::write(&config_file, &config_string)
            .map_err(|e| format!("Failed to create default workspace config: {}", e))?;
        
        return Ok(config_string);
    }
    
    let config_content = fs::read_to_string(&config_file)
        .map_err(|e| format!("Failed to load workspace config: {}", e))?;
    
    // Parse and validate, but don't auto-merge on every load
    let config: serde_json::Value = serde_json::from_str(&config_content)
        .unwrap_or_else(|_| {
            // Only create default if parsing failed
            let default = create_default_workspace_config();
            let _ = fs::write(&config_file, serde_json::to_string_pretty(&default).unwrap());
            default
        });
    
    Ok(serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?)
}

#[tauri::command]
fn clear_workspace_config() -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    if config_file.exists() {
        fs::remove_file(config_file)
            .map_err(|e| format!("Failed to clear workspace config: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn create_directory(parent_path: String, name: Option<String>) -> Result<String, String> {
    let dir_name = name.unwrap_or_else(|| "Novo Diretório".to_string());
    let mut new_path = Path::new(&parent_path).join(&dir_name);
    let mut counter = 1;
    
    // Se já existir, adiciona um número
    while new_path.exists() {
        let numbered_name = format!("{} {}", dir_name, counter);
        new_path = Path::new(&parent_path).join(&numbered_name);
        counter += 1;
    }
    
    fs::create_dir(&new_path)
        .map_err(|e| format!("Failed to create directory: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_file(parent_path: String, name: Option<String>) -> Result<String, String> {
    let base_name = name.unwrap_or_else(|| "Nova Nota".to_string());
    let mut file_name = if !base_name.ends_with(".md") {
        format!("{}.md", base_name)
    } else {
        base_name
    };
    
    let mut new_path = Path::new(&parent_path).join(&file_name);
    let mut counter = 1;
    
    // Se já existir, adiciona um número
    while new_path.exists() {
        let name_without_ext = file_name.trim_end_matches(".md");
        let numbered_name = format!("{} {}.md", name_without_ext, counter);
        new_path = Path::new(&parent_path).join(&numbered_name);
        file_name = numbered_name;
        counter += 1;
    }
    
    // Cria arquivo com template básico
    let template_content = format!("# {}\n\n", file_name.trim_end_matches(".md"));
    
    fs::write(&new_path, template_content)
        .map_err(|e| format!("Failed to create file: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_file_or_directory(path: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if path_obj.is_dir() {
        fs::remove_dir_all(path_obj)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(path_obj)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    
    Ok(())
}

#[tauri::command]
fn rename_file_or_directory(old_path: String, new_name: String) -> Result<String, String> {
    let old_path_obj = Path::new(&old_path);
    
    if !old_path_obj.exists() {
        return Err("Path does not exist".to_string());
    }
    
    let parent = old_path_obj.parent()
        .ok_or("Cannot get parent directory".to_string())?;
    
    let new_name = if old_path_obj.is_file() && !new_name.ends_with(".md") {
        format!("{}.md", new_name)
    } else {
        new_name
    };
    
    let new_path = parent.join(&new_name);
    
    if new_path.exists() {
        return Err("Target already exists".to_string());
    }
    
    fs::rename(&old_path_obj, &new_path)
        .map_err(|e| format!("Failed to rename: {}", e))?;
    
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }
    
    if !path_obj.is_file() {
        return Err("Path is not a file".to_string());
    }
    
    // Verifica se é um arquivo markdown
    if let Some(extension) = path_obj.extension() {
        let ext_str = extension.to_string_lossy().to_lowercase();
        if !["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str()) {
            return Err("File is not a markdown file".to_string());
        }
    } else {
        return Err("File has no extension".to_string());
    }
    
    fs::read_to_string(path_obj)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<(), String> {
    let path_obj = Path::new(&path);
    
    // Verifica se é um arquivo markdown
    if let Some(extension) = path_obj.extension() {
        let ext_str = extension.to_string_lossy().to_lowercase();
        if !["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str()) {
            return Err("File is not a markdown file".to_string());
        }
    } else {
        return Err("File has no extension".to_string());
    }
    
    // Cria diretórios pais se não existirem
    if let Some(parent) = path_obj.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directories: {}", e))?;
        }
    }
    
    fs::write(path_obj, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
fn get_file_metadata(path: String) -> Result<serde_json::Value, String> {
    let path_obj = Path::new(&path);
    
    if !path_obj.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = fs::metadata(path_obj)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    
    let mut result = serde_json::Map::new();
    result.insert("size".to_string(), serde_json::Value::Number(metadata.len().into()));
    result.insert("is_file".to_string(), serde_json::Value::Bool(metadata.is_file()));
    result.insert("is_directory".to_string(), serde_json::Value::Bool(metadata.is_dir()));
    
    if let Ok(modified) = metadata.modified() {
        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
            result.insert("modified".to_string(), serde_json::Value::Number(duration.as_secs().into()));
        }
    }
    
    if let Ok(created) = metadata.created() {
        if let Ok(duration) = created.duration_since(std::time::UNIX_EPOCH) {
            result.insert("created".to_string(), serde_json::Value::Number(duration.as_secs().into()));
        }
    }
    
    Ok(serde_json::Value::Object(result))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            scan_directory, 
            get_app_config_dir,
            save_appearance_config,
            load_appearance_config,
            save_workspace_config,
            update_workspace_config,
            load_workspace_config,
            rename_file,
            clear_workspace_config,
            create_directory,
            create_file,
            delete_file_or_directory,
            rename_file_or_directory,
            read_file,
            write_file,
            get_file_metadata
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
