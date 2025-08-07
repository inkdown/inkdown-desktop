use std::fs;
use std::path::{Path, PathBuf};
use std::env;
use serde::{Deserialize, Serialize};

mod markdown;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct NoteSearchResult {
    pub name: String,
    pub path: String,
    pub content_preview: String,
    pub modified_time: u64,
    pub size: u64,
    pub match_score: f32,
}

use markdown::{MarkdownParser, HtmlRenderer, ParseResult};

// Thread-local parsers for maximum performance
thread_local! {
    static PARSER: std::cell::RefCell<MarkdownParser> = std::cell::RefCell::new(MarkdownParser::new());
    static RENDERER: std::cell::RefCell<HtmlRenderer> = std::cell::RefCell::new(HtmlRenderer::new());
}

#[tauri::command]
fn parse_markdown_to_html(markdown: String) -> Result<ParseResult, String> {
    if markdown.is_empty() {
        return Ok(ParseResult::new(String::new(), 0));
    }

    PARSER.with(|parser_cell| {
        RENDERER.with(|renderer_cell| {
            let mut parser = parser_cell.borrow_mut();
            let mut renderer = renderer_cell.borrow_mut();
            
            // Parse markdown to tokens
            let tokens = parser.parse(&markdown);
            
            // Render tokens to HTML
            let html = renderer.render(&tokens);
            
            // Count words
            let word_count = parser.count_words(&markdown);
            
            Ok(ParseResult::new(html, word_count))
        })
    })
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
        "readOnly": false,
        "sidebarVisible": true,
        "shortcuts": [
            {
                "name": "toggleSidebar",
                "shortcut": "Ctrl+B"
            },
            {
                "name": "openNotePalette",
                "shortcut": "Ctrl+O"
            }
        ]
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

#[tauri::command]
fn search_notes(workspace_path: String, query: String, limit: Option<usize>) -> Result<Vec<NoteSearchResult>, String> {
    let limit = limit.unwrap_or(50);
    let query = query.to_lowercase();
    
    if query.is_empty() {
        return Ok(Vec::new());
    }
    
    let mut results = Vec::new();
    search_notes_recursive(&workspace_path, &query, &mut results)?;
    
    // Ordena por score de match (maior primeiro) e depois por data de modificação
    results.sort_by(|a, b| {
        let score_cmp = b.match_score.partial_cmp(&a.match_score).unwrap_or(std::cmp::Ordering::Equal);
        if score_cmp == std::cmp::Ordering::Equal {
            b.modified_time.cmp(&a.modified_time)
        } else {
            score_cmp
        }
    });
    
    results.truncate(limit);
    Ok(results)
}

fn search_notes_recursive(dir_path: &str, query: &str, results: &mut Vec<NoteSearchResult>) -> Result<(), String> {
    let path = Path::new(dir_path);
    
    if !path.exists() || !path.is_dir() {
        return Ok(());
    }
    
    let entries = fs::read_dir(path)
        .map_err(|e| format!("Error reading directory {}: {}", dir_path, e))?;
    
    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            
            if entry_path.is_dir() {
                // Busca recursivamente em subdiretórios
                if let Some(path_str) = entry_path.to_str() {
                    let _ = search_notes_recursive(path_str, query, results);
                }
            } else if entry_path.is_file() {
                // Verifica se é arquivo markdown
                if let Some(extension) = entry_path.extension() {
                    let ext_str = extension.to_string_lossy().to_lowercase();
                    if ["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str()) {
                        if let Some(path_str) = entry_path.to_str() {
                            if let Ok(note_result) = create_search_result(path_str, query) {
                                if note_result.match_score > 0.0 {
                                    results.push(note_result);
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Ok(())
}

fn create_search_result(file_path: &str, query: &str) -> Result<NoteSearchResult, String> {
    let path = Path::new(file_path);
    let metadata = fs::metadata(path)
        .map_err(|e| format!("Failed to get metadata: {}", e))?;
    
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    let filename = path.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    
    let mut match_score = 0.0f32;
    
    // Score baseado no nome do arquivo
    let filename_lower = filename.to_lowercase();
    if filename_lower.contains(query) {
        match_score += if filename_lower == query {
            10.0 // Match exato no nome
        } else if filename_lower.starts_with(query) {
            5.0 // Começa com a query
        } else {
            2.0 // Contém a query
        };
    }
    
    // Score baseado no conteúdo
    let content_lower = content.to_lowercase();
    let query_matches = content_lower.matches(query).count();
    match_score += query_matches as f32 * 0.1;
    
    // Score baseado em títulos (linhas que começam com #)
    for line in content.lines() {
        if line.trim_start().starts_with('#') {
            let line_lower = line.to_lowercase();
            if line_lower.contains(query) {
                match_score += 1.0;
            }
        }
    }
    
    // Preview do conteúdo (primeiras linhas ou contexto ao redor do match)
    let content_preview = create_content_preview(&content, query, 150);
    
    let modified_time = metadata.modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0);
    
    Ok(NoteSearchResult {
        name: filename,
        path: file_path.to_string(),
        content_preview,
        modified_time,
        size: metadata.len(),
        match_score,
    })
}

fn create_content_preview(content: &str, query: &str, max_length: usize) -> String {
    let lines: Vec<&str> = content.lines().collect();
    
    // Procura por linha que contém a query
    for (i, line) in lines.iter().enumerate() {
        if line.to_lowercase().contains(&query.to_lowercase()) {
            // Pega algumas linhas ao redor do match
            let start = if i >= 2 { i - 2 } else { 0 };
            let end = std::cmp::min(lines.len(), i + 3);
            
            let preview_lines = &lines[start..end];
            let mut preview = preview_lines.join(" ");
            
            // Trunca se muito longo
            if preview.len() > max_length {
                preview.truncate(max_length - 3);
                preview.push_str("...");
            }
            
            return preview;
        }
    }
    
    // Se não encontrou match, retorna o início do arquivo
    let mut preview = lines.iter()
        .take(3)
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .collect::<Vec<_>>()
        .join(" ");
    
    if preview.len() > max_length {
        preview.truncate(max_length - 3);
        preview.push_str("...");
    }
    
    preview
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
            get_file_metadata,
            search_notes,
            parse_markdown_to_html
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
