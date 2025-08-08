use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::thread;

#[cfg(target_os = "windows")]
use std::os::windows::fs::MetadataExt;

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
    // Prevent path traversal attacks
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path_obj = Path::new(&path);

    // Try to canonicalize path to resolve symlinks and ensure it exists
    let canonical_path = match path_obj.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => {
            // Fallback: check if path exists without canonicalization
            if !path_obj.exists() {
                return Err("Directory does not exist".to_string());
            }
            path_obj.to_path_buf()
        }
    };

    if !canonical_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Check read permissions
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

    // Use cross-platform path representation
    let path_str = path.display().to_string();

    if path.is_dir() {
        let entries = fs::read_dir(path).map_err(|e| format!("Error reading directory: {}", e))?;

        let mut children = Vec::new();

        for entry in entries {
            match entry {
                Ok(entry) => {
                    let entry_path = entry.path();

                    // Filter: only directories and markdown files
                    if entry_path.is_dir()
                        || (entry_path.is_file()
                            && entry_path.extension().map_or(false, |ext| {
                                let ext_str = ext.to_string_lossy().to_lowercase();
                                ["md", "markdown", "mdown", "mkd"].contains(&ext_str.as_str())
                            }))
                    {
                        match build_tree(&entry_path) {
                            Ok(child_node) => children.push(child_node),
                            Err(_) => {} // Skip problematic entries
                        }
                    }
                }
                Err(_) => {} // Skip problematic entries
            }
        }

        // Sort: directories first, then files, both alphabetically
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
        // Only return file nodes for markdown files
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

// Optimized search function with parallel processing and caching
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

    // Validate workspace path with better error handling
    let workspace = Path::new(&workspace_path);

    // Normalize path for Windows compatibility
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

    // Check if we can read the directory
    if let Err(e) = fs::read_dir(&workspace) {
        return Err(format!("Cannot read workspace directory: {}", e));
    }

    let results = Arc::new(Mutex::new(Vec::new()));
    let query_arc = Arc::new(query);

    // Use parallel processing for better performance
    let workspace_str = workspace.display().to_string();
    search_notes_parallel(&workspace_str, &query_arc, &results, limit)?;

    let mut final_results = {
        let results_guard = results
            .lock()
            .map_err(|_| "Failed to access search results")?;
        results_guard.clone()
    };

    // Sort by relevance score (higher is better) then by modification time (newer first)
    final_results.sort_by(|a, b| {
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

    final_results.truncate(limit);
    Ok(final_results)
}

fn search_notes_parallel(
    dir_path: &str,
    query: &Arc<String>,
    results: &Arc<Mutex<Vec<NoteSearchResult>>>,
    max_results: usize,
) -> Result<(), String> {
    let path = Path::new(dir_path);

    if !path.exists() || !path.is_dir() {
        return Ok(());
    }

    // Early termination if we have enough results
    {
        let current_results = results.lock().map_err(|_| "Mutex lock failed")?;
        if current_results.len() >= max_results * 2 {
            // Buffer to allow for better scoring
            return Ok(());
        }
    }

    let entries =
        fs::read_dir(path).map_err(|e| format!("Error reading directory {}: {}", dir_path, e))?;

    let mut handles = Vec::new();
    let mut subdirs = Vec::new();

    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();

            if entry_path.is_dir() {
                // Collect subdirectories for later processing
                if let Some(path_str) = entry_path.to_str() {
                    // Skip hidden directories and common build/cache directories
                    let dir_name = entry_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("");

                    // Windows-aware hidden directory detection
                    let is_hidden = if cfg!(target_os = "windows") {
                        // On Windows, check for hidden attribute
                        entry_path
                            .metadata()
                            .map(|_m| {
                                #[cfg(target_os = "windows")]
                                {
                                    _m.file_attributes() & 0x2 != 0
                                }
                                #[cfg(not(target_os = "windows"))]
                                {
                                    false
                                }
                            })
                            .unwrap_or(false)
                            || dir_name.starts_with('.')
                    } else {
                        dir_name.starts_with('.')
                    };

                    if !is_hidden
                        && ![
                            "node_modules",
                            "target",
                            "build",
                            "dist",
                            ".git",
                            ".vscode",
                            "System Volume Information",
                            "$RECYCLE.BIN",
                        ]
                        .contains(&dir_name)
                    {
                        subdirs.push(path_str.to_string());
                    }
                }
            } else if entry_path.is_file() {
                // Process files in parallel
                if let Some(extension) = entry_path.extension() {
                    let ext_str = extension.to_string_lossy().to_lowercase();
                    if ["md", "markdown", "mdown", "mkd", "txt"].contains(&ext_str.as_str()) {
                        if let Some(path_str) = entry_path.to_str() {
                            let path_string = path_str.to_string();
                            let query_clone = Arc::clone(query);
                            let results_clone = Arc::clone(results);

                            let handle = thread::spawn(move || {
                                if let Ok(note_result) =
                                    create_search_result_optimized(&path_string, &query_clone)
                                {
                                    if note_result.match_score > 0.0 {
                                        if let Ok(mut results_guard) = results_clone.lock() {
                                            results_guard.push(note_result);
                                        }
                                    }
                                }
                            });

                            handles.push(handle);

                            // Limit concurrent threads to avoid resource exhaustion
                            if handles.len() >= 8 {
                                for handle in handles.drain(..) {
                                    let _ = handle.join();
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Wait for remaining file processing threads
    for handle in handles {
        let _ = handle.join();
    }

    // Process subdirectories recursively
    for subdir in subdirs {
        search_notes_parallel(&subdir, query, results, max_results)?;
    }

    Ok(())
}

fn create_search_result_optimized(
    file_path: &str,
    query: &str,
) -> Result<NoteSearchResult, String> {
    let path = Path::new(file_path);

    // Get metadata first (faster than reading content)
    let metadata = fs::metadata(path).map_err(|e| format!("Failed to get metadata: {}", e))?;

    // Skip very large files to avoid performance issues
    if metadata.len() > 10 * 1024 * 1024 {
        // 10MB limit
        return Err("File too large".to_string());
    }

    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {}", e))?;

    let filename = path
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let mut match_score = 0.0f32;

    // Optimized scoring system
    let filename_lower = filename.to_lowercase();
    let content_lower = content.to_lowercase();

    // Filename matching (highest priority)
    if filename_lower == query {
        match_score += 100.0; // Exact match
    } else if filename_lower.starts_with(query) {
        match_score += 50.0; // Prefix match
    } else if filename_lower.contains(query) {
        match_score += 20.0; // Contains match
    }

    // Content matching with early termination for performance
    if match_score < 20.0 {
        // Only do expensive content search if filename didn't match well
        let mut query_matches = 0;
        let mut pos = 0;

        // Limit search to avoid performance issues with very large files
        let search_content = if content_lower.len() > 50000 {
            &content_lower[..50000] // Only search first 50KB
        } else {
            &content_lower
        };

        while let Some(found_pos) = search_content[pos..].find(query) {
            query_matches += 1;
            pos += found_pos + query.len();

            // Limit matches to avoid excessive scoring
            if query_matches >= 50 {
                break;
            }
        }

        match_score += (query_matches as f32 * 0.5).min(10.0);
    }

    // Header matching (markdown specific)
    if content.len() < 50000 {
        // Only for reasonably sized files
        let mut header_matches = 0;
        for line in content.lines() {
            if line.trim_start().starts_with('#') && header_matches < 10 {
                if line.to_lowercase().contains(query) {
                    header_matches += 1;
                    match_score += 3.0;
                }
            }
        }
    }

    // Only create preview if we have a decent match
    let content_preview = if match_score > 0.0 {
        create_content_preview_optimized(&content, query, 200)
    } else {
        String::new()
    };

    let modified_time = metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|duration| duration.as_secs())
        .unwrap_or(0);

    Ok(NoteSearchResult {
        name: filename,
        path: path.display().to_string(), // Use display() for cross-platform compatibility
        content_preview,
        modified_time,
        size: metadata.len(),
        match_score,
    })
}

fn create_content_preview_optimized(content: &str, query: &str, max_length: usize) -> String {
    let query_lower = query.to_lowercase();

    // Find the first line containing the query
    for line in content.lines().take(100) {
        // Limit line search for performance
        let line_lower = line.to_lowercase();
        if line_lower.contains(&query_lower) {
            // Extract context around the match
            let line_trimmed = line.trim();
            if line_trimmed.len() <= max_length {
                return line_trimmed.to_string();
            } else {
                // Find the query position and extract around it
                if let Some(pos) = line_lower.find(&query_lower) {
                    let start = if pos > 50 { pos - 50 } else { 0 };
                    let end = std::cmp::min(line.len(), start + max_length);
                    let mut preview = line[start..end].to_string();

                    if start > 0 {
                        preview = format!("...{}", preview);
                    }
                    if end < line.len() {
                        preview = format!("{}...", preview);
                    }

                    return preview;
                }
            }
        }
    }

    // Fallback: get the beginning of the content
    let preview_lines: Vec<&str> = content
        .lines()
        .take(3)
        .map(|line| line.trim())
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .collect();

    let mut preview = preview_lines.join(" ");

    if preview.len() > max_length {
        preview.truncate(max_length - 3);
        preview.push_str("...");
    }

    preview
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

    let new_path = parent.join(&new_name);

    if new_path.exists() {
        return Err("A file with this name already exists".to_string());
    }

    fs::rename(&old_path_obj, &new_path).map_err(|e| format!("Failed to rename file: {}", e))?;

    Ok(new_path.to_string_lossy().to_string())
}
