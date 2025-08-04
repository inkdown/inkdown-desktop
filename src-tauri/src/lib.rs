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
fn load_appearance_config() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("appearance.json");
    
    if !config_file.exists() {
        // Retorna config padrão de aparência
        let default_config = r#"{
            "themes": [
                {
                    "name": "Gruvbox",
                    "url": "",
                    "author": "Lucas",
                    "enable": true
                }
            ],
            "font-size": 14,
            "font-family": "Inter, system-ui, sans-serif"
        }"#;
        return Ok(default_config.to_string());
    }
    
    fs::read_to_string(config_file)
        .map_err(|e| format!("Failed to load appearance config: {}", e))
}

#[tauri::command]
fn save_workspace_config(workspace_path: String) -> Result<(), String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    let workspace_config = format!(r#"{{"workspace_path": "{}"}}"#, workspace_path.replace("\\", "\\\\"));
    
    fs::write(config_file, workspace_config)
        .map_err(|e| format!("Failed to save workspace config: {}", e))?;
    
    Ok(())
}

#[tauri::command]
fn load_workspace_config() -> Result<String, String> {
    let config_dir = get_or_create_config_dir()?;
    let config_file = config_dir.join("workspace.json");
    
    if !config_file.exists() {
        return Ok(r#"{"workspace_path": null}"#.to_string());
    }
    
    fs::read_to_string(config_file)
        .map_err(|e| format!("Failed to load workspace config: {}", e))
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
            load_workspace_config,
            clear_workspace_config,
            create_directory,
            create_file,
            delete_file_or_directory,
            rename_file_or_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
