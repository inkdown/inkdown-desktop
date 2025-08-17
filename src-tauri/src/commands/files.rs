use serde_json;
use std::fs;
use std::path::Path;

#[cfg(target_os = "windows")]
mod windows_utils {
    use std::path::{Path, PathBuf};

    const RESERVED_NAMES: &[&str] = &[
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];

    const INVALID_CHARS: &[char] = &['<', '>', ':', '"', '|', '?', '*'];

    // Maximum path length on Windows (legacy limit without Long Path support)
    const MAX_PATH_LENGTH: usize = 259;

    pub fn sanitize_filename(name: &str) -> Result<String, String> {
        if name.trim().is_empty() {
            return Err("Filename cannot be empty".to_string());
        }

        let mut sanitized: String = name
            .chars()
            .filter(|&c| !INVALID_CHARS.contains(&c) && c != '\0' && (c as u32) >= 32)
            .collect();

        sanitized = sanitized.trim().trim_end_matches('.').to_string();

        if sanitized.is_empty() {
            return Err("Filename contains only invalid characters".to_string());
        }

        let name_upper = sanitized.split('.').next().unwrap_or("").to_uppercase();
        if RESERVED_NAMES.contains(&name_upper.as_str()) {
            sanitized = format!("_{}", sanitized);
        }

        if sanitized.len() > 100 {
            sanitized.truncate(100);
        }

        Ok(sanitized)
    }

    pub fn validate_path_length(path: &Path) -> Result<(), String> {
        let path_str = path.to_string_lossy();
        if path_str.len() > MAX_PATH_LENGTH {
            return Err(format!(
                "Path too long: {} characters (max: {})",
                path_str.len(),
                MAX_PATH_LENGTH
            ));
        }
        Ok(())
    }

    pub fn validate_parent_path(parent_path: &str) -> Result<PathBuf, String> {
        let path = Path::new(parent_path);

        if parent_path.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }

        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("Invalid parent path: {}", e))?;

        if !canonical_path.is_dir() {
            return Err("Parent path must be a directory".to_string());
        }

        validate_path_length(&canonical_path)?;

        Ok(canonical_path)
    }

    pub fn safe_create_unique_path(
        parent: &Path,
        base_name: &str,
        extension: Option<&str>,
    ) -> Result<PathBuf, String> {
        let sanitized_name = sanitize_filename(base_name)?;
        let ext = extension.unwrap_or("");

        let mut path = parent.join(format!("{}{}", sanitized_name, ext));
        let mut counter = 1;

        while path.exists() {
            let name_with_counter = format!("{} ({}){}", sanitized_name, counter, ext);
            path = parent.join(name_with_counter);
            counter += 1;

            if counter > 9999 {
                return Err("Too many similar files exist".to_string());
            }
        }

        validate_path_length(&path)?;
        Ok(path)
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_utils {
    use std::path::{Path, PathBuf};

    pub fn sanitize_filename(name: &str) -> Result<String, String> {
        if name.trim().is_empty() {
            return Err("Filename cannot be empty".to_string());
        }

        let sanitized: String = name.chars().filter(|&c| c != '\0' && c != '/').collect();

        if sanitized.is_empty() {
            return Err("Filename contains only invalid characters".to_string());
        }

        Ok(sanitized)
    }

    pub fn validate_path_length(_path: &Path) -> Result<(), String> {
        Ok(())
    }

    pub fn validate_parent_path(parent_path: &str) -> Result<PathBuf, String> {
        let path = Path::new(parent_path);

        if parent_path.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }

        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("Invalid parent path: {}", e))?;

        if !canonical_path.is_dir() {
            return Err("Parent path must be a directory".to_string());
        }

        Ok(canonical_path)
    }

    pub fn safe_create_unique_path(
        parent: &Path,
        base_name: &str,
        extension: Option<&str>,
    ) -> Result<PathBuf, String> {
        let sanitized_name = sanitize_filename(base_name)?;
        let ext = extension.unwrap_or("");

        let mut path = parent.join(format!("{}{}", sanitized_name, ext));
        let mut counter = 1;

        while path.exists() {
            let name_with_counter = format!("{} ({}){}", sanitized_name, counter, ext);
            path = parent.join(name_with_counter);
            counter += 1;

            if counter > 9999 {
                return Err("Too many similar files exist".to_string());
            }
        }

        Ok(path)
    }
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let i_path = Path::new(&path);

    let canonical_path = i_path
        .canonicalize()
        .map_err(|e| format!("Invalid file path or file does not exist: {}", e))?;

    if !canonical_path.is_file() {
        return Err("Path is not a file".to_string());
    }

    fs::read_to_string(&canonical_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_binary_file(file_path: String, content: Vec<u8>) -> Result<(), String> {
    if file_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path = Path::new(&file_path);

    if !path.exists() {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err("Parent directory does not exist".to_string());
            }
        }

        windows_utils::validate_path_length(&path)?;
    } else {
        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("Invalid file path: {}", e))?;

        if !canonical_path.is_file() {
            return Err("Path is not a file".to_string());
        }

        #[cfg(target_os = "windows")]
        {
            if let Ok(metadata) = canonical_path.metadata() {
                if metadata.permissions().readonly() {
                    let mut perms = metadata.permissions();
                    perms.set_readonly(false);
                    fs::set_permissions(&canonical_path, perms)
                        .map_err(|e| format!("Failed to remove read-only attribute: {}", e))?;
                }
            }
        }
    }

    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn write_file(file_path: String, content: String) -> Result<(), String> {
    if file_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path = Path::new(&file_path);

    if !path.exists() {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err("Parent directory does not exist".to_string());
            }
        }

        windows_utils::validate_path_length(&path)?;
    } else {
        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("Invalid file path: {}", e))?;

        if !canonical_path.is_file() {
            return Err("Path is not a file".to_string());
        }

        #[cfg(target_os = "windows")]
        {
            if let Ok(metadata) = canonical_path.metadata() {
                if metadata.permissions().readonly() {
                    let mut perms = metadata.permissions();
                    perms.set_readonly(false);
                    fs::set_permissions(&canonical_path, perms)
                        .map_err(|e| format!("Failed to remove read-only attribute: {}", e))?;
                }
            }
        }
    }

    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn create_file(parent_path: String, name: Option<String>) -> Result<String, String> {
    let parent = windows_utils::validate_parent_path(&parent_path)?;

    let base_name = name.unwrap_or_else(|| "Nova Nota".to_string());

    let new_path = windows_utils::safe_create_unique_path(&parent, &base_name, Some(".md"))?;

    let file_stem = new_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Nova Nota");
    let template_content = format!("# {}\n\n", file_stem);

    match fs::write(&new_path, &template_content) {
        Ok(()) => {
            match new_path.to_str() {
                Some(path_str) => Ok(path_str.to_string()),
                None => {
                    Ok(new_path.to_string_lossy().to_string())
                }
            }
        }
        Err(e) => {
            if new_path.exists() && new_path.is_file() {
                match new_path.to_str() {
                    Some(path_str) => Ok(path_str.to_string()),
                    None => Ok(new_path.to_string_lossy().to_string()),
                }
            } else {
                Err(format!("Failed to create file: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn create_directory(parent_path: String, name: Option<String>) -> Result<String, String> {
    let parent = windows_utils::validate_parent_path(&parent_path)?;

    let base_name = name.unwrap_or_else(|| "Nova Pasta".to_string());

    let new_path = windows_utils::safe_create_unique_path(&parent, &base_name, None)?;

    match fs::create_dir(&new_path) {
        Ok(()) => {
            match new_path.to_str() {
                Some(path_str) => Ok(path_str.to_string()),
                None => {
                    Ok(new_path.to_string_lossy().to_string())
                }
            }
        }
        Err(e) => {
            if new_path.exists() && new_path.is_dir() {
                match new_path.to_str() {
                    Some(path_str) => Ok(path_str.to_string()),
                    None => Ok(new_path.to_string_lossy().to_string()),
                }
            } else {
                Err(format!("Failed to create directory: {}", e))
            }
        }
    }
}

#[tauri::command]
pub fn delete_file_or_directory(path: String) -> Result<(), String> {
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path_obj = Path::new(&path);

    let canonical_path = path_obj
        .canonicalize()
        .map_err(|e| format!("Invalid path or path does not exist: {}", e))?;

    let path_str = canonical_path.to_string_lossy().to_lowercase();

    #[cfg(target_os = "windows")]
    {
        if path_str.starts_with("c:\\windows")
            || path_str.starts_with("c:\\program files")
            || path_str.starts_with("c:\\program files (x86)")
            || path_str.starts_with("c:\\users\\default")
        {
            return Err("Cannot delete system directories".to_string());
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if path_str.starts_with("/bin")
            || path_str.starts_with("/sbin")
            || path_str.starts_with("/usr/bin")
            || path_str.starts_with("/usr/sbin")
            || path_str.starts_with("/etc")
            || path_str.starts_with("/var/log")
            || path_str.starts_with("/root")
            || path_str == "/"
        {
            return Err("Cannot delete system directories".to_string());
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(metadata) = canonical_path.metadata() {
            if metadata.permissions().readonly() {
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&canonical_path, perms);
            }
        }
    }

    if canonical_path.is_dir() {
        fs::remove_dir_all(&canonical_path)
            .map_err(|e| format!("Failed to delete directory: {}", e))?;
    } else {
        fs::remove_file(&canonical_path).map_err(|e| format!("Failed to delete file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn rename_file_or_directory(old_path: String, new_name: String) -> Result<String, String> {
    if old_path.contains("..") || new_name.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let old_path_obj = Path::new(&old_path);

    let canonical_old_path = old_path_obj
        .canonicalize()
        .map_err(|e| format!("Invalid path or path does not exist: {}", e))?;

    let parent = canonical_old_path
        .parent()
        .ok_or("Cannot determine parent directory".to_string())?;

    let sanitized_name = windows_utils::sanitize_filename(&new_name)?;

    let new_path = if canonical_old_path.is_file() {
        if let Some(extension) = canonical_old_path.extension() {
            parent.join(format!("{}.{}", sanitized_name, extension.to_string_lossy()))
        } else {
            parent.join(&sanitized_name)
        }
    } else {
        parent.join(&sanitized_name)
    };

    if new_path.exists() {
        return Err("A file or directory with this name already exists".to_string());
    }

    windows_utils::validate_path_length(&new_path)?;

    #[cfg(target_os = "windows")]
    {
        if let Ok(metadata) = canonical_old_path.metadata() {
            if metadata.permissions().readonly() {
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&canonical_old_path, perms);
            }
        }
    }

    fs::rename(&canonical_old_path, &new_path).map_err(|e| {
        #[cfg(target_os = "windows")]
        {
            if let Ok(metadata) = canonical_old_path.metadata() {
                if !metadata.permissions().readonly() {
                    let mut perms = metadata.permissions();
                    perms.set_readonly(true);
                    let _ = fs::set_permissions(&canonical_old_path, perms);
                }
            }
        }
        format!("Failed to rename: {}", e)
    })?;

    match new_path.to_str() {
        Some(path_str) => Ok(path_str.to_string()),
        None => {
            Ok(new_path.to_string_lossy().to_string())
        }
    }
}

#[tauri::command]
pub fn create_nested_path(workspace_path: String, path_input: String) -> Result<String, String> {
    let workspace = windows_utils::validate_parent_path(&workspace_path)?;
    
    let sanitized_path = path_input.trim().replace("\\", "/");
    
    if sanitized_path.is_empty() {
        return Err("Path cannot be empty".to_string());
    }
    
    if sanitized_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }
    
    let path_parts: Vec<&str> = sanitized_path.split('/').collect();
    let mut current_path = workspace.clone();
    
    let is_directory = sanitized_path.ends_with('/');
    let (dir_parts, file_name) = if is_directory {
        (path_parts.as_slice(), None)
    } else {
        if let Some((file, dirs)) = path_parts.split_last() {
            (dirs, Some(*file))
        } else {
            (path_parts.as_slice(), None)
        }
    };
    
    for part in dir_parts {
        if !part.is_empty() {
            let sanitized_part = windows_utils::sanitize_filename(part)?;
            current_path = current_path.join(sanitized_part);
            
            if !current_path.exists() {
                fs::create_dir_all(&current_path)
                    .map_err(|e| format!("Failed to create directory {}: {}", current_path.display(), e))?;
            }
        }
    }
    
    if let Some(file_name) = file_name {
        if !file_name.is_empty() {
            let sanitized_file = windows_utils::sanitize_filename(file_name)?;
            let file_path = if sanitized_file.ends_with(".md") {
                current_path.join(sanitized_file)
            } else {
                current_path.join(format!("{}.md", sanitized_file))
            };
            
            windows_utils::validate_path_length(&file_path)?;
            
            let file_stem = file_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Nova Nota");
            let template_content = format!("# {}\n\n", file_stem);
            
            fs::write(&file_path, &template_content)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            
            return match file_path.to_str() {
                Some(path_str) => Ok(path_str.to_string()),
                None => Ok(file_path.to_string_lossy().to_string()),
            };
        }
    }
    
    match current_path.to_str() {
        Some(path_str) => Ok(path_str.to_string()),
        None => Ok(current_path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
pub fn move_file_or_directory(source_path: String, target_parent_path: String) -> Result<String, String> {
    if source_path.contains("..") || target_parent_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let source_path_obj = Path::new(&source_path);
    let target_parent_obj = Path::new(&target_parent_path);

    let canonical_source = source_path_obj
        .canonicalize()
        .map_err(|e| format!("Invalid source path or path does not exist: {}", e))?;

    let canonical_target_parent = target_parent_obj
        .canonicalize()
        .map_err(|e| format!("Invalid target parent path or path does not exist: {}", e))?;

    if !canonical_target_parent.is_dir() {
        return Err("Target parent must be a directory".to_string());
    }

    // Prevent moving to itself or its subdirectory
    if canonical_source == canonical_target_parent {
        return Err("Cannot move to the same location".to_string());
    }

    // Check if trying to move a directory into itself or its subdirectory
    if canonical_source.is_dir() && canonical_target_parent.starts_with(&canonical_source) {
        return Err("Cannot move directory into itself or its subdirectory".to_string());
    }

    let file_name = canonical_source
        .file_name()
        .ok_or("Cannot determine file name".to_string())?;

    let target_path = canonical_target_parent.join(file_name);

    if target_path.exists() {
        return Err("A file or directory with this name already exists in the target location".to_string());
    }

    windows_utils::validate_path_length(&target_path)?;

    #[cfg(target_os = "windows")]
    {
        if let Ok(metadata) = canonical_source.metadata() {
            if metadata.permissions().readonly() {
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&canonical_source, perms);
            }
        }
    }

    fs::rename(&canonical_source, &target_path).map_err(|e| {
        #[cfg(target_os = "windows")]
        {
            if let Ok(metadata) = canonical_source.metadata() {
                if !metadata.permissions().readonly() {
                    let mut perms = metadata.permissions();
                    perms.set_readonly(true);
                    let _ = fs::set_permissions(&canonical_source, perms);
                }
            }
        }
        format!("Failed to move: {}", e)
    })?;

    match target_path.to_str() {
        Some(path_str) => Ok(path_str.to_string()),
        None => Ok(target_path.to_string_lossy().to_string()),
    }
}

#[tauri::command]
pub fn get_file_metadata(file_path: String) -> Result<serde_json::Value, String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let metadata = path
        .metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    let mut result = serde_json::Map::new();

    result.insert(
        "size".to_string(),
        serde_json::Value::Number(serde_json::Number::from(metadata.len())),
    );

    result.insert(
        "is_directory".to_string(),
        serde_json::Value::Bool(metadata.is_dir()),
    );

    result.insert(
        "is_file".to_string(),
        serde_json::Value::Bool(metadata.is_file()),
    );

    if let Ok(modified) = metadata.modified() {
        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
            result.insert(
                "modified_time".to_string(),
                serde_json::Value::Number(serde_json::Number::from(duration.as_secs())),
            );
        }
    }

    if let Ok(created) = metadata.created() {
        if let Ok(duration) = created.duration_since(std::time::UNIX_EPOCH) {
            result.insert(
                "created_time".to_string(),
                serde_json::Value::Number(serde_json::Number::from(duration.as_secs())),
            );
        }
    }

    Ok(serde_json::Value::Object(result))
}
