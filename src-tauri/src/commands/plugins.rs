use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    #[serde(rename = "minAppVersion")]
    pub min_app_version: String,
    pub main: String,
    pub homepage: Option<String>,
    pub repository: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub permissions: Option<Vec<PluginPermission>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginPermission {
    #[serde(rename = "type")]
    pub permission_type: String,
    pub description: String,
    pub optional: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PluginInfo {
    pub manifest: PluginManifest,
    pub enabled: bool,
    pub loaded: bool,
    pub error: Option<String>,
}

type PluginCache = Mutex<HashMap<String, PluginInfo>>;

fn get_plugins_config_dir() -> Result<String, String> {
    let config_dir = super::config::get_app_config_dir()?;
    Ok(format!("{}/plugins", config_dir))
}

#[tauri::command]
pub async fn scan_plugins_directory() -> Result<Vec<PluginInfo>, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugins_dir = Path::new(&config_dir);
    
    println!("🔍 [Rust] Scanning plugins directory: {:?}", plugins_dir);

    if !plugins_dir.exists() {
        println!("⚠️ [Rust] Plugins directory doesn't exist, creating: {:?}", plugins_dir);
        if let Err(e) = fs::create_dir_all(&plugins_dir) {
            return Err(format!("Failed to create plugins directory: {}", e));
        }
        return Ok(Vec::new());
    }

    let mut plugins = Vec::new();
    println!("📂 [Rust] Reading directory contents...");

    match fs::read_dir(&plugins_dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    println!("📁 [Rust] Found entry: {:?}, is_dir: {}", path, path.is_dir());
                    if path.is_dir() {
                        if let Some(plugin_id) = path.file_name().and_then(|n| n.to_str()) {
                            println!("🔍 [Rust] Processing plugin: {}", plugin_id);
                            match load_plugin_manifest(&path, plugin_id).await {
                                Ok(plugin_info) => {
                                    println!("✅ [Rust] Successfully loaded plugin: {}", plugin_id);
                                    plugins.push(plugin_info);
                                },
                                Err(e) => {
                                    println!("❌ [Rust] Failed to load plugin {}: {}", plugin_id, e);
                                    // Still include the plugin with error info
                                    plugins.push(PluginInfo {
                                        manifest: PluginManifest {
                                            id: plugin_id.to_string(),
                                            name: plugin_id.to_string(),
                                            version: "unknown".to_string(),
                                            description: "Failed to load manifest".to_string(),
                                            author: "unknown".to_string(),
                                            min_app_version: "0.0.0".to_string(),
                                            main: "main.js".to_string(),
                                            homepage: None,
                                            repository: None,
                                            keywords: None,
                                            permissions: None,
                                        },
                                        enabled: false,
                                        loaded: false,
                                        error: Some(e),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(format!("Failed to read plugins directory: {}", e)),
    }

    println!("📊 [Rust] Scan completed, found {} plugins", plugins.len());
    for plugin in &plugins {
        println!("📋 [Rust] Plugin: {} ({})", plugin.manifest.id, plugin.manifest.name);
    }
    Ok(plugins)
}

async fn load_plugin_manifest(plugin_dir: &Path, plugin_id: &str) -> Result<PluginInfo, String> {
    let manifest_path = plugin_dir.join("manifest.json");

    if !manifest_path.exists() {
        return Err("manifest.json not found".to_string());
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest.json: {}", e))?;

    let manifest: PluginManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest.json: {}", e))?;

    // Validate manifest
    if manifest.id != plugin_id {
        return Err("Plugin ID in manifest doesn't match directory name".to_string());
    }

    let main_file_path = plugin_dir.join(&manifest.main);
    if !main_file_path.exists() {
        return Err(format!("Main file '{}' not found", manifest.main));
    }

    Ok(PluginInfo {
        manifest,
        enabled: false, // Will be set by the frontend based on settings
        loaded: false,
        error: None,
    })
}

#[tauri::command]
pub async fn read_plugin_file(plugin_id: String, file_path: String) -> Result<String, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);

    if !plugin_dir.exists() {
        return Err("Plugin directory not found".to_string());
    }

    let file_full_path = plugin_dir.join(&file_path);

    // Security check: ensure the file is within the plugin directory
    if !file_full_path.starts_with(&plugin_dir) {
        return Err("Invalid file path: path traversal not allowed".to_string());
    }

    if !file_full_path.exists() {
        return Err("File not found".to_string());
    }

    fs::read_to_string(&file_full_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn validate_plugin_permissions(
    plugin_id: String,
    requested_permissions: Vec<String>,
) -> Result<HashMap<String, bool>, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);
    let manifest_path = plugin_dir.join("manifest.json");

    if !manifest_path.exists() {
        return Err("Plugin manifest not found".to_string());
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: PluginManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    let mut permission_results = HashMap::new();

    for requested in &requested_permissions {
        let granted = manifest
            .permissions
            .as_ref()
            .map(|perms| {
                perms.iter().any(|p| p.permission_type == *requested)
            })
            .unwrap_or(false);

        permission_results.insert(requested.clone(), granted);
    }

    Ok(permission_results)
}

#[tauri::command]
pub async fn install_plugin_from_path(source_path: String) -> Result<String, String> {
    let source = Path::new(&source_path);
    
    if !source.exists() {
        return Err("Source path does not exist".to_string());
    }

    // Check if it's a valid plugin directory
    let manifest_path = source.join("manifest.json");
    if !manifest_path.exists() {
        return Err("manifest.json not found in source directory".to_string());
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: PluginManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    let config_dir = get_plugins_config_dir()?;
    let plugins_dir = Path::new(&config_dir);
    let target_dir = plugins_dir.join(&manifest.id);

    if target_dir.exists() {
        return Err("Plugin already installed".to_string());
    }

    // Create plugins directory if it doesn't exist
    if !plugins_dir.exists() {
        fs::create_dir_all(&plugins_dir)
            .map_err(|e| format!("Failed to create plugins directory: {}", e))?;
    }

    // Copy plugin files
    copy_dir_recursive(&source, &target_dir)
        .map_err(|e| format!("Failed to copy plugin files: {}", e))?;

    Ok(format!("Plugin '{}' installed successfully", manifest.id))
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), std::io::Error> {
    fs::create_dir_all(dst)?;
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let target_path = dst.join(entry.file_name());

        if path.is_dir() {
            copy_dir_recursive(&path, &target_path)?;
        } else {
            fs::copy(&path, &target_path)?;
        }
    }
    
    Ok(())
}

#[tauri::command]
pub async fn uninstall_plugin(plugin_id: String) -> Result<String, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);

    if !plugin_dir.exists() {
        return Err("Plugin not found".to_string());
    }

    fs::remove_dir_all(&plugin_dir)
        .map_err(|e| format!("Failed to remove plugin directory: {}", e))?;

    Ok(format!("Plugin '{}' uninstalled successfully", plugin_id))
}

#[tauri::command]
pub async fn get_plugin_manifest(plugin_id: String) -> Result<PluginManifest, String> {
    let config_dir = get_plugins_config_dir()?;
    let manifest_path = Path::new(&config_dir)
        .join(&plugin_id)
        .join("manifest.json");

    if !manifest_path.exists() {
        return Err("Plugin manifest not found".to_string());
    }

    let manifest_content = fs::read_to_string(&manifest_path)
        .map_err(|e| format!("Failed to read manifest: {}", e))?;

    let manifest: PluginManifest = serde_json::from_str(&manifest_content)
        .map_err(|e| format!("Failed to parse manifest: {}", e))?;

    Ok(manifest)
}


#[tauri::command] 
pub async fn check_plugin_compatibility(plugin_id: String, app_version: String) -> Result<bool, String> {
    let manifest = get_plugin_manifest(plugin_id).await?;
    
    // Simple version comparison - in a real app you'd want more sophisticated version parsing
    let plugin_min_version = &manifest.min_app_version;
    let is_compatible = compare_versions(&app_version, plugin_min_version) >= 0;
    
    Ok(is_compatible)
}


fn compare_versions(version1: &str, version2: &str) -> i32 {
    let v1_parts: Vec<u32> = version1.split('.').filter_map(|s| s.parse().ok()).collect();
    let v2_parts: Vec<u32> = version2.split('.').filter_map(|s| s.parse().ok()).collect();
    
    let max_len = v1_parts.len().max(v2_parts.len());
    
    for i in 0..max_len {
        let v1_part = v1_parts.get(i).unwrap_or(&0);
        let v2_part = v2_parts.get(i).unwrap_or(&0);
        
        match v1_part.cmp(v2_part) {
            std::cmp::Ordering::Greater => return 1,
            std::cmp::Ordering::Less => return -1,
            std::cmp::Ordering::Equal => continue,
        }
    }
    
    0
}

#[tauri::command]
pub async fn read_plugin_settings(plugin_id: String) -> Result<Value, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);
    
    if !plugin_dir.exists() {
        return Err("Plugin directory not found".to_string());
    }

    let settings_path = plugin_dir.join("configs.json");
    
    if !settings_path.exists() {
        // Return empty object if settings file doesn't exist
        return Ok(serde_json::json!({}));
    }

    let settings_content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings file: {}", e))?;

    let settings: Value = serde_json::from_str(&settings_content)
        .map_err(|e| format!("Failed to parse settings JSON: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn write_plugin_settings(plugin_id: String, settings: Value) -> Result<String, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);
    
    if !plugin_dir.exists() {
        return Err("Plugin directory not found".to_string());
    }

    let settings_path = plugin_dir.join("configs.json");
    
    // Pretty-print the JSON for better readability
    let settings_content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, settings_content)
        .map_err(|e| format!("Failed to write settings file: {}", e))?;

    println!("✅ [Rust] Plugin settings saved: {}/configs.json", plugin_id);
    Ok("Settings saved successfully".to_string())
}

#[tauri::command]
pub async fn backup_plugin_settings(plugin_id: String) -> Result<String, String> {
    let config_dir = get_plugins_config_dir()?;
    let plugin_dir = Path::new(&config_dir).join(&plugin_id);
    let settings_path = plugin_dir.join("configs.json");
    
    if !settings_path.exists() {
        return Err("No settings file to backup".to_string());
    }

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let backup_path = plugin_dir.join(format!("configs.backup.{}.json", timestamp));
    
    fs::copy(&settings_path, &backup_path)
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(format!("Backup created: configs.backup.{}.json", timestamp))
}


