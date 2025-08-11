use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path};

#[cfg(target_os = "windows")]
use std::os::windows::fs::MetadataExt;

fn normalize_path(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteSearchResult {
    pub name: String,
    pub path: String,
    pub content_preview: String,
    pub modified_time: u64,
    pub size: u64,
    pub match_score: f32,
}

#[tauri::command]
pub fn scan_directory(path: String) -> Result<FileNode, String> {
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path_obj = Path::new(&path);

    let canonical_path = match path_obj.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => {
            if !path_obj.exists() {
                return Err("Directory does not exist".to_string());
            }
            path_obj.to_path_buf()
        }
    };

    if !canonical_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    match std::fs::read_dir(&canonical_path) {
        Ok(_) => {}
        Err(e) => {
            return Err(format!("Cannot read directory: {}", e));
        }
    }

    build_tree(&canonical_path)
}

fn build_tree(path: &Path) -> Result<FileNode, String> {
    let name = path
        .file_name()
        .unwrap_or_else(|| path.as_os_str())
        .to_string_lossy()
        .to_string();

    let path_str = normalize_path(path);

    if path.is_dir() {
        let entries = fs::read_dir(path).map_err(|e| format!("Error reading directory: {}", e))?;

        let mut children = Vec::new();

        for entry in entries {
            match entry {
                Ok(entry) => {
                    let entry_path = entry.path();

                    if entry_path.is_dir()
                        || (entry_path.is_file()
                            && entry_path.extension().map_or(false, |ext| {
                                let ext_str = ext.to_string_lossy().to_lowercase();
                                ["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str())
                            }))
                    {
                        match build_tree(&entry_path) {
                            Ok(child_node) => children.push(child_node),
                            Err(_) => {}
                        }
                    }
                }
                Err(_) => {} // Skip problematic entries
            }
        }

        children.sort_by(|a, b| match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        });

        Ok(FileNode {
            name,
            path: path_str,
            is_directory: true,
            children: Some(children),
        })
    } else {
        if let Some(extension) = path.extension() {
            let ext_str = extension.to_string_lossy().to_lowercase();
            if ["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str()) {
                Ok(FileNode {
                    name,
                    path: path_str,
                    is_directory: false,
                    children: None,
                })
            } else {
                Err("Not a markdown file".to_string())
            }
        } else {
            Err("File has no extension".to_string())
        }
    }
}

#[tauri::command]
pub fn search_notes(
    workspace_path: String,
    query: String,
    limit: Option<usize>,
) -> Result<Vec<NoteSearchResult>, String> {
    let limit = limit.unwrap_or(50);
    let query = query.trim().to_lowercase();

    if query.is_empty() || query.len() < 2 {
        return Ok(Vec::new());
    }

    let workspace = Path::new(&workspace_path);

    let workspace = match workspace.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => {
            if !workspace.exists() {
                return Err(format!(
                    "Workspace directory does not exist: {}",
                    workspace_path
                ));
            }
            if !workspace.is_dir() {
                return Err(format!(
                    "Workspace path is not a directory: {}",
                    workspace_path
                ));
            }
            workspace.to_path_buf()
        }
    };

    if let Err(e) = fs::read_dir(&workspace) {
        return Err(format!("Cannot read workspace directory: {}", e));
    }

    let mut results = Vec::new();
    let workspace_str = normalize_path(&workspace);
    search_notes_simple(&workspace_str, &query, &mut results, limit)?;

    results.sort_by(|a, b| {
        let score_cmp = b
            .match_score
            .partial_cmp(&a.match_score)
            .unwrap_or(std::cmp::Ordering::Equal);
        if score_cmp == std::cmp::Ordering::Equal {
            b.modified_time.cmp(&a.modified_time)
        } else {
            score_cmp
        }
    });

    results.truncate(limit);
    Ok(results)
}

fn search_notes_simple(
    dir_path: &str,
    query: &str,
    results: &mut Vec<NoteSearchResult>,
    max_results: usize,
) -> Result<(), String> {
    if results.len() >= max_results {
        return Ok(()); // Early termination
    }

    let path = Path::new(dir_path);
    if !path.exists() || !path.is_dir() {
        return Ok(());
    }

    let entries = fs::read_dir(path).map_err(|e| format!("Error reading directory {}: {}", dir_path, e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();

            if entry_path.is_dir() {
                let dir_name = entry_path.file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("");

                if !dir_name.starts_with('.') && 
                   !["node_modules", "target", "build", "dist", ".git", ".vscode"].contains(&dir_name) {
                    if let Some(path_str) = entry_path.to_str() {
                        search_notes_simple(path_str, query, results, max_results)?;
                    }
                }
            } else if entry_path.is_file() {
                if let Some(extension) = entry_path.extension() {
                    let ext_str = extension.to_string_lossy().to_lowercase();
                    if ["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str()) {
                        if let Some(path_str) = entry_path.to_str() {
                            if let Ok(result) = create_search_result_simple(path_str, query) {
                                if result.match_score > 0.0 {
                                    results.push(result);
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

fn create_search_result_simple(
    file_path: &str,
    query: &str,
) -> Result<NoteSearchResult, String> {
    let path = Path::new(file_path);
    let metadata = fs::metadata(path).map_err(|e| format!("Failed to get metadata: {}", e))?;

    if metadata.len() > 1024 * 1024 {
        return Err("File too large".to_string());
    }

    let filename = path.file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut match_score = 0.0f32;

    let filename_lower = filename.to_lowercase();
    let query_lower = query.to_lowercase();
    
    if filename_lower.contains(&query_lower) {
        match_score += if filename_lower == query_lower { 100.0 } 
                      else if filename_lower.starts_with(&query_lower) { 50.0 } 
                      else { 20.0 };
    }

    let content_preview = if match_score > 0.0 {
        fs::read_to_string(path)
            .unwrap_or_default()
            .lines()
            .take(3)
            .collect::<Vec<_>>()
            .join(" ")
            .chars()
            .take(150)
            .collect::<String>()
    } else {
        String::new()
    };

    let modified_time = metadata.modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0);

    Ok(NoteSearchResult {
        name: filename,
        path: normalize_path(path),
        content_preview,
        modified_time,
        size: metadata.len(),
        match_score,
    })
}


#[tauri::command]
pub fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let old_path_obj = Path::new(&old_path);

    if !old_path_obj.exists() {
        return Err("File does not exist".to_string());
    }

    let parent = old_path_obj
        .parent()
        .ok_or("Cannot determine parent directory".to_string())?;

    let new_path = if old_path_obj.is_file() {
        if let Some(extension) = old_path_obj.extension() {
            parent.join(format!("{}.{}", new_name, extension.to_string_lossy()))
        } else {
            parent.join(&new_name)
        }
    } else {
        parent.join(&new_name)
    };

    if new_path.exists() {
        return Err("A file with this name already exists".to_string());
    }

    fs::rename(&old_path_obj, &new_path).map_err(|e| format!("Failed to rename file: {}", e))?;

    Ok(normalize_path(&new_path))
}
