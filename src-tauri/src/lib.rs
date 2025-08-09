mod markdown;
mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn parse_markdown_to_html(markdown: String) -> Result<crate::markdown::parser::ParseResult, String> {
    crate::markdown::parser::parse_markdown_to_html(&markdown)
        .map_err(|e| format!("Failed to parse markdown: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            parse_markdown_to_html,
            // Config commands
            commands::config::get_app_config_dir,
            commands::config::save_appearance_config,
            commands::config::load_appearance_config,
            commands::config::save_workspace_config,
            commands::config::update_workspace_config,
            commands::config::load_workspace_config,
            commands::config::is_first_run,
            commands::config::clear_workspace_config,
            // File operations
            commands::files::read_file,
            commands::files::write_file,
            commands::files::create_file,
            commands::files::create_directory,
            commands::files::delete_file_or_directory,
            commands::files::rename_file_or_directory,
            commands::files::get_file_metadata,
            // Search commands
            commands::search::scan_directory,
            commands::search::search_notes,
            commands::search::rename_file,
            // Theme commands
            commands::themes::get_custom_themes,
            commands::themes::get_theme_css,
            commands::themes::search_community_themes,
            commands::themes::download_community_theme,
            commands::themes::get_installed_theme_names
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
