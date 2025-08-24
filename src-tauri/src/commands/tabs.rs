use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use tauri::command;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabData {
    pub id: String,
    pub title: String,
    pub file_path: Option<String>,
    pub content: Option<String>,
    pub is_dirty: bool,
    pub is_active: bool,
    pub created_at: i64,
    pub last_accessed: i64,
    pub cursor_position: Option<CursorPosition>,
    pub scroll_position: Option<ScrollPosition>,
}

// Make these Send + Sync safe
unsafe impl Send for TabData {}
unsafe impl Sync for TabData {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CursorPosition {
    pub line: u32,
    pub column: u32,
}

unsafe impl Send for CursorPosition {}
unsafe impl Sync for CursorPosition {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScrollPosition {
    pub top: f64,
    pub left: f64,
}

unsafe impl Send for ScrollPosition {}
unsafe impl Sync for ScrollPosition {}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TabSession {
    pub workspace_path: String,
    pub tabs: Vec<TabData>,
    pub active_tab_id: Option<String>,
    pub created_at: i64,
    pub last_updated: i64,
}

unsafe impl Send for TabSession {}
unsafe impl Sync for TabSession {}

// Global tab manager with optimized memory management
static TAB_MANAGER: OnceLock<Arc<Mutex<TabManager>>> = OnceLock::new();

#[derive(Debug)]
struct TabManager {
    sessions: HashMap<String, TabSession>,
    content_cache: HashMap<String, String>,
    max_cache_size: usize,
    cache_cleanup_threshold: usize,
}

unsafe impl Send for TabManager {}
unsafe impl Sync for TabManager {}

impl TabManager {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
            content_cache: HashMap::new(),
            max_cache_size: 50, // Maximum cached file contents
            cache_cleanup_threshold: 40, // Cleanup when this threshold is reached
        }
    }

    fn get_or_create_session(&mut self, workspace_path: &str) -> &mut TabSession {
        let workspace_key = workspace_path.to_string();
        
        self.sessions.entry(workspace_key.clone()).or_insert_with(|| {
            TabSession {
                workspace_path: workspace_key,
                tabs: Vec::new(),
                active_tab_id: None,
                created_at: chrono::Utc::now().timestamp(),
                last_updated: chrono::Utc::now().timestamp(),
            }
        })
    }

    fn cleanup_cache(&mut self) {
        if self.content_cache.len() <= self.cache_cleanup_threshold {
            return;
        }

        // Keep only the most recently accessed content
        let active_files: std::collections::HashSet<String> = self.sessions
            .values()
            .flat_map(|session| &session.tabs)
            .filter_map(|tab| tab.file_path.as_ref())
            .cloned()
            .collect();

        // Remove cached content for files not in active tabs
        self.content_cache.retain(|path, _| active_files.contains(path));

        // If still too large, remove oldest entries
        if self.content_cache.len() > self.max_cache_size {
            let excess = self.content_cache.len() - self.max_cache_size;
            let keys_to_remove: Vec<_> = self.content_cache
                .keys()
                .take(excess)
                .cloned()
                .collect();
            
            for key in keys_to_remove {
                self.content_cache.remove(&key);
            }
        }
    }

    fn cache_content(&mut self, file_path: &str, content: String) {
        if self.content_cache.len() >= self.max_cache_size {
            self.cleanup_cache();
        }
        self.content_cache.insert(file_path.to_string(), content);
    }
}

fn get_tab_manager() -> Arc<Mutex<TabManager>> {
    TAB_MANAGER.get_or_init(|| Arc::new(Mutex::new(TabManager::new()))).clone()
}

#[command]
pub async fn create_tab(workspace_path: String, file_path: Option<String>) -> Result<TabData, String> {
    let tab_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    
    // Determine tab title
    let title = if let Some(ref path) = file_path {
        std::path::Path::new(path)
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Untitled")
            .to_string()
    } else {
        "New Tab".to_string()
    };

    // Load content if file exists (outside of lock to avoid holding it during I/O)
    let content = if let Some(ref path) = file_path {
        // Check cache first
        let cached_content = {
            let tab_manager = get_tab_manager();
            let manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
            manager.content_cache.get(path).cloned()
        };
        
        if let Some(cached) = cached_content {
            Some(cached)
        } else {
            // Load from disk and cache
            match tokio::fs::read_to_string(path).await {
                Ok(file_content) => {
                    // Cache the content
                    {
                        let tab_manager = get_tab_manager();
                        let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
                        manager.cache_content(path, file_content.clone());
                    }
                    Some(file_content)
                }
                Err(_) => None,
            }
        }
    } else {
        Some(String::new()) // Empty content for new tabs
    };

    let tab = TabData {
        id: tab_id.clone(),
        title,
        file_path,
        content,
        is_dirty: false,
        is_active: false,
        created_at: now,
        last_accessed: now,
        cursor_position: None,
        scroll_position: None,
    };

    // Add tab to session
    {
        let tab_manager = get_tab_manager();
        let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
        let session = manager.get_or_create_session(&workspace_path);
        session.tabs.push(tab.clone());
        session.last_updated = now;
    }

    Ok(tab)
}

#[command]
pub async fn close_tab(workspace_path: String, tab_id: String) -> Result<Option<String>, String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let session = manager.get_or_create_session(&workspace_path);
    
    // Find and remove the tab
    if let Some(pos) = session.tabs.iter().position(|tab| tab.id == tab_id) {
        let removed_tab = session.tabs.remove(pos);
        
        // If closing the active tab, determine new active tab
        let new_active_id = if session.active_tab_id.as_ref() == Some(&tab_id) {
            if !session.tabs.is_empty() {
                // Activate the next tab, or previous if it was the last one
                let new_index = if pos < session.tabs.len() { pos } else { session.tabs.len() - 1 };
                Some(session.tabs[new_index].id.clone())
            } else {
                None
            }
        } else {
            session.active_tab_id.clone()
        };
        
        session.active_tab_id = new_active_id.clone();
        session.last_updated = chrono::Utc::now().timestamp();
        
        // Clean up cache if needed
        if let Some(file_path) = &removed_tab.file_path {
            // Only remove from cache if no other tabs use this file
            let still_in_use = session.tabs.iter()
                .any(|tab| tab.file_path.as_ref() == Some(file_path));
            
            if !still_in_use {
                manager.content_cache.remove(file_path);
            }
        }
        
        Ok(new_active_id)
    } else {
        Err("Tab not found".to_string())
    }
}

#[command]
pub async fn set_active_tab(workspace_path: String, tab_id: String) -> Result<(), String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let session = manager.get_or_create_session(&workspace_path);
    
    if session.tabs.iter().any(|tab| tab.id == tab_id) {
        session.active_tab_id = Some(tab_id.clone());
        session.last_updated = chrono::Utc::now().timestamp();
        
        // Update last accessed time for the tab
        if let Some(tab) = session.tabs.iter_mut().find(|tab| tab.id == tab_id) {
            tab.last_accessed = chrono::Utc::now().timestamp();
        }
        
        Ok(())
    } else {
        Err("Tab not found".to_string())
    }
}

#[command]
pub async fn update_tab_content(
    workspace_path: String,
    tab_id: String,
    content: String,
    is_dirty: bool,
) -> Result<(), String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let session = manager.get_or_create_session(&workspace_path);
    let now = chrono::Utc::now().timestamp();
    
    if let Some(tab) = session.tabs.iter_mut().find(|tab| tab.id == tab_id) {
        let file_path = tab.file_path.clone();
        tab.content = Some(content.clone());
        tab.is_dirty = is_dirty;
        tab.last_accessed = now;
        session.last_updated = now;
        
        // Update cache if this tab has a file path
        if let Some(ref path) = file_path {
            manager.cache_content(path, content);
        }
        
        Ok(())
    } else {
        Err("Tab not found".to_string())
    }
}

#[command]
pub async fn update_tab_file(
    workspace_path: String,
    tab_id: String,
    file_path: String,
) -> Result<(), String> {
    // Load content first (outside the lock to avoid I/O while holding the mutex)
    let title = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Untitled")
        .to_string();

    let content = match tokio::fs::read_to_string(&file_path).await {
        Ok(file_content) => Some(file_content),
        Err(_) => Some(String::new()), // Empty content if file can't be read
    };

    // Now acquire the lock and update everything at once
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let now = chrono::Utc::now().timestamp();
    
    // Find and update the tab first
    let tab_found = {
        let session = manager.get_or_create_session(&workspace_path);
        if let Some(tab) = session.tabs.iter_mut().find(|tab| tab.id == tab_id) {
            // Update tab properties
            tab.file_path = Some(file_path.clone());
            tab.title = title;
            tab.content = content.clone();
            tab.is_dirty = false;
            tab.last_accessed = now;
            session.last_updated = now;
            true
        } else {
            false
        }
    };

    if tab_found {
        // Cache the content if we loaded it successfully (after updating the tab)
        if let Some(ref content_str) = content {
            if !content_str.is_empty() {
                manager.cache_content(&file_path, content_str.clone());
            }
        }
        Ok(())
    } else {
        Err("Tab not found".to_string())
    }
}

#[command]
pub async fn save_tab_state(
    workspace_path: String,
    tab_id: String,
    cursor_position: Option<CursorPosition>,
    scroll_position: Option<ScrollPosition>,
) -> Result<(), String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let session = manager.get_or_create_session(&workspace_path);
    
    if let Some(tab) = session.tabs.iter_mut().find(|tab| tab.id == tab_id) {
        tab.cursor_position = cursor_position;
        tab.scroll_position = scroll_position;
        tab.last_accessed = chrono::Utc::now().timestamp();
        session.last_updated = chrono::Utc::now().timestamp();
        Ok(())
    } else {
        Err("Tab not found".to_string())
    }
}

#[command]
pub async fn get_tab_session(workspace_path: String) -> Result<TabSession, String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    let session = manager.get_or_create_session(&workspace_path);
    Ok(session.clone())
}

#[command]
pub async fn get_tab_content(workspace_path: String, tab_id: String) -> Result<Option<String>, String> {
    let tab_manager = get_tab_manager();
    let manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    if let Some(session) = manager.sessions.get(&workspace_path) {
        if let Some(tab) = session.tabs.iter().find(|tab| tab.id == tab_id) {
            return Ok(tab.content.clone());
        }
    }
    
    Ok(None)
}

#[command]
pub async fn cleanup_tab_cache() -> Result<(), String> {
    let tab_manager = get_tab_manager();
    let mut manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    manager.cleanup_cache();
    Ok(())
}

// Persistence commands (save/load sessions to/from disk)
#[command]
pub async fn save_tab_session_to_disk(workspace_path: String) -> Result<(), String> {
    let tab_manager = get_tab_manager();
    let manager = tab_manager.lock().map_err(|_| "Failed to acquire lock")?;
    
    if let Some(session) = manager.sessions.get(&workspace_path) {
        let config_dir = crate::commands::config::get_or_create_config_dir()
            .map_err(|e| format!("Failed to get config dir: {}", e))?;
        
        let session_file = config_dir.join("tab_sessions.json");
        
        // Load existing sessions
        let mut all_sessions: HashMap<String, TabSession> = if session_file.exists() {
            let content = std::fs::read_to_string(&session_file)
                .map_err(|e| format!("Failed to read session file: {}", e))?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            HashMap::new()
        };
        
        // Update this workspace's session
        all_sessions.insert(workspace_path.clone(), session.clone());
        
        // Save back to disk
        let json = serde_json::to_string_pretty(&all_sessions)
            .map_err(|e| format!("Failed to serialize sessions: {}", e))?;
        
        std::fs::write(session_file, json)
            .map_err(|e| format!("Failed to write session file: {}", e))?;
    }
    
    Ok(())
}

#[command]
pub async fn load_tab_session_from_disk(workspace_path: String) -> Result<Option<TabSession>, String> {
    let config_dir = crate::commands::config::get_or_create_config_dir()
        .map_err(|e| format!("Failed to get config dir: {}", e))?;
    
    let session_file = config_dir.join("tab_sessions.json");
    
    if !session_file.exists() {
        return Ok(None);
    }
    
    let content = std::fs::read_to_string(&session_file)
        .map_err(|e| format!("Failed to read session file: {}", e))?;
    
    let all_sessions: HashMap<String, TabSession> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse session file: {}", e))?;
    
    Ok(all_sessions.get(&workspace_path).cloned())
}