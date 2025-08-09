use serde_json;
use std::fs;
use std::path::Path;

#[cfg(target_os = "windows")]
mod windows_utils {
    use std::path::{Path, PathBuf};

    // Windows reserved names
    const RESERVED_NAMES: &[&str] = &[
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];

    // Windows invalid characters for file/directory names
    const INVALID_CHARS: &[char] = &['<', '>', ':', '"', '|', '?', '*'];

    // Maximum path length on Windows (legacy limit without Long Path support)
    const MAX_PATH_LENGTH: usize = 259;

    pub fn sanitize_filename(name: &str) -> Result<String, String> {
        if name.trim().is_empty() {
            return Err("Filename cannot be empty".to_string());
        }

        // Remove invalid characters
        let mut sanitized: String = name
            .chars()
            .filter(|&c| !INVALID_CHARS.contains(&c) && c != '\0' && (c as u32) >= 32)
            .collect();

        // Remove leading/trailing spaces and dots (Windows requirement)
        sanitized = sanitized.trim().trim_end_matches('.').to_string();

        if sanitized.is_empty() {
            return Err("Filename contains only invalid characters".to_string());
        }

        // Check for reserved names
        let name_upper = sanitized.split('.').next().unwrap_or("").to_uppercase();
        if RESERVED_NAMES.contains(&name_upper.as_str()) {
            sanitized = format!("_{}", sanitized);
        }

        // Limit length (reserve space for extension and numbering)
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

        // Prevent path traversal
        if parent_path.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }

        // Canonicalize to resolve any symbolic links and validate existence
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

        // Start with the base name
        let mut path = parent.join(format!("{}{}", sanitized_name, ext));
        let mut counter = 1;

        // Find unique name by appending numbers
        while path.exists() {
            let name_with_counter = format!("{} ({}){}", sanitized_name, counter, ext);
            path = parent.join(name_with_counter);
            counter += 1;

            // Prevent infinite loops
            if counter > 9999 {
                return Err("Too many similar files exist".to_string());
            }
        }

        validate_path_length(&path)?;
        Ok(path)
    }
}

// Unix-specific utilities (Linux/macOS)
#[cfg(not(target_os = "windows"))]
mod windows_utils {
    use std::path::{Path, PathBuf};

    pub fn sanitize_filename(name: &str) -> Result<String, String> {
        if name.trim().is_empty() {
            return Err("Filename cannot be empty".to_string());
        }

        // Remove null bytes and control characters for Unix
        let sanitized: String = name.chars().filter(|&c| c != '\0' && c != '/').collect();

        if sanitized.is_empty() {
            return Err("Filename contains only invalid characters".to_string());
        }

        Ok(sanitized)
    }

    pub fn validate_path_length(_path: &Path) -> Result<(), String> {
        // Unix systems typically have much higher path limits
        Ok(())
    }

    pub fn validate_parent_path(parent_path: &str) -> Result<PathBuf, String> {
        let path = Path::new(parent_path);

        // Prevent path traversal
        if parent_path.contains("..") {
            return Err("Path traversal not allowed".to_string());
        }

        // Canonicalize to resolve any symbolic links and validate existence
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

        // Start with the base name
        let mut path = parent.join(format!("{}{}", sanitized_name, ext));
        let mut counter = 1;

        // Find unique name by appending numbers
        while path.exists() {
            let name_with_counter = format!("{} ({}){}", sanitized_name, counter, ext);
            path = parent.join(name_with_counter);
            counter += 1;

            // Prevent infinite loops
            if counter > 9999 {
                return Err("Too many similar files exist".to_string());
            }
        }

        Ok(path)
    }
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    // Prevent path traversal attacks
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let i_path = Path::new(&path);

    // Canonicalize to ensure file exists and resolve any symbolic links
    let canonical_path = i_path
        .canonicalize()
        .map_err(|e| format!("Invalid file path or file does not exist: {}", e))?;

    if !canonical_path.is_file() {
        return Err("Path is not a file".to_string());
    }

    fs::read_to_string(&canonical_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(file_path: String, content: String) -> Result<(), String> {
    // Prevent path traversal attacks
    if file_path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path = Path::new(&file_path);

    // For new files, validate the parent directory exists
    if !path.exists() {
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                return Err("Parent directory does not exist".to_string());
            }
        }

        // Validate path length on Windows for new files
        windows_utils::validate_path_length(&path)?;
    } else {
        // For existing files, canonicalize to resolve symbolic links
        let canonical_path = path
            .canonicalize()
            .map_err(|e| format!("Invalid file path: {}", e))?;

        if !canonical_path.is_file() {
            return Err("Path is not a file".to_string());
        }

        // Handle read-only files on Windows
        #[cfg(target_os = "windows")]
        {
            if let Ok(metadata) = canonical_path.metadata() {
                if metadata.permissions().readonly() {
                    // Remove read-only attribute before writing
                    let mut perms = metadata.permissions();
                    perms.set_readonly(false);
                    fs::set_permissions(&canonical_path, perms)
                        .map_err(|e| format!("Failed to remove read-only attribute: {}", e))?;
                }
            }
        }
    }

    // Atomic write operation
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn create_file(parent_path: String, name: Option<String>) -> Result<String, String> {
    // Validate and canonicalize parent path
    let parent = windows_utils::validate_parent_path(&parent_path)?;

    let base_name = name.unwrap_or_else(|| "Nova Nota".to_string());

    // Create safe unique path with .md extension
    let new_path = windows_utils::safe_create_unique_path(&parent, &base_name, Some(".md"))?;

    // Generate template content based on sanitized filename
    let file_stem = new_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Nova Nota");
    let template_content = format!("# {}\n\n", file_stem);

    // Atomic file creation with proper error handling
    match fs::write(&new_path, &template_content) {
        Ok(()) => {
            // Convert path to string using proper UTF-8 handling
            match new_path.to_str() {
                Some(path_str) => Ok(path_str.to_string()),
                None => {
                    // Fallback for paths with invalid UTF-8
                    Ok(new_path.to_string_lossy().to_string())
                }
            }
        }
        Err(e) => {
            // Check if file was created by another process (race condition)
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
    // Validate and canonicalize parent path
    let parent = windows_utils::validate_parent_path(&parent_path)?;

    let base_name = name.unwrap_or_else(|| "Nova Pasta".to_string());

    // Create safe unique path without extension (directories don't have extensions)
    let new_path = windows_utils::safe_create_unique_path(&parent, &base_name, None)?;

    // Atomic directory creation
    match fs::create_dir(&new_path) {
        Ok(()) => {
            // Convert path to string using proper UTF-8 handling
            match new_path.to_str() {
                Some(path_str) => Ok(path_str.to_string()),
                None => {
                    // Fallback for paths with invalid UTF-8
                    Ok(new_path.to_string_lossy().to_string())
                }
            }
        }
        Err(e) => {
            // Check if directory was created by another process (race condition)
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
    // Prevent path traversal attacks
    if path.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let path_obj = Path::new(&path);

    // Canonicalize path to resolve any symbolic links and ensure it exists
    let canonical_path = path_obj
        .canonicalize()
        .map_err(|e| format!("Invalid path or path does not exist: {}", e))?;

    // Additional safety check: ensure we're not deleting system directories
    let path_str = canonical_path.to_string_lossy().to_lowercase();

    #[cfg(target_os = "windows")]
    {
        // Windows system directory protection
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
        // Unix-like system directory protection
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

    // Handle read-only files on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(metadata) = canonical_path.metadata() {
            if metadata.permissions().readonly() {
                // Remove read-only attribute before deletion
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&canonical_path, perms);
            }
        }
    }

    // Perform deletion based on file type
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
    // Prevent path traversal attacks
    if old_path.contains("..") || new_name.contains("..") {
        return Err("Path traversal not allowed".to_string());
    }

    let old_path_obj = Path::new(&old_path);

    // Canonicalize to ensure path exists and resolve any symbolic links
    let canonical_old_path = old_path_obj
        .canonicalize()
        .map_err(|e| format!("Invalid path or path does not exist: {}", e))?;

    let parent = canonical_old_path
        .parent()
        .ok_or("Cannot determine parent directory".to_string())?;

    // Sanitize the new name based on the operating system
    let sanitized_name = windows_utils::sanitize_filename(&new_name)?;

    // Preserve the original file extension if it's a file
    let new_path = if canonical_old_path.is_file() {
        if let Some(extension) = canonical_old_path.extension() {
            parent.join(format!("{}.{}", sanitized_name, extension.to_string_lossy()))
        } else {
            parent.join(&sanitized_name)
        }
    } else {
        parent.join(&sanitized_name)
    };

    // Check if target already exists
    if new_path.exists() {
        return Err("A file or directory with this name already exists".to_string());
    }

    // Validate path length on Windows
    windows_utils::validate_path_length(&new_path)?;

    // Handle read-only files on Windows
    #[cfg(target_os = "windows")]
    {
        if let Ok(metadata) = canonical_old_path.metadata() {
            if metadata.permissions().readonly() {
                // Temporarily remove read-only attribute
                let mut perms = metadata.permissions();
                perms.set_readonly(false);
                let _ = fs::set_permissions(&canonical_old_path, perms);
            }
        }
    }

    // Perform atomic rename operation
    fs::rename(&canonical_old_path, &new_path).map_err(|e| {
        // Restore read-only attribute on failure (Windows)
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

    // Convert to string with proper UTF-8 handling
    match new_path.to_str() {
        Some(path_str) => Ok(path_str.to_string()),
        None => {
            // Fallback for paths with invalid UTF-8
            Ok(new_path.to_string_lossy().to_string())
        }
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
