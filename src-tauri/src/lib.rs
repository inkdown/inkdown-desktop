mod markdown;
mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn parse_markdown_basic(markdown: String) -> Result<crate::markdown::parser::ParseResult, String> {
    crate::markdown::basic_parser::parse_basic_markdown_to_html(&markdown)
}

#[tauri::command]
fn parse_markdown_gfm(markdown: String) -> Result<crate::markdown::parser::ParseResult, String> {
    crate::markdown::gfm_parser::parse_gfm_markdown_to_html(&markdown)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            parse_markdown_basic,
            parse_markdown_gfm,
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
            commands::files::write_binary_file,
            commands::files::create_file,
            commands::files::create_directory,
            commands::files::create_nested_path,
            commands::files::delete_file_or_directory,
            commands::files::rename_file_or_directory,
            commands::files::move_file_or_directory,
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
            commands::themes::get_installed_theme_names,
            commands::themes::delete_community_theme,
            // Plugin commands
            commands::plugins::scan_plugins_directory,
            commands::plugins::read_plugin_file,
            commands::plugins::validate_plugin_permissions,
            commands::plugins::install_plugin_from_path,
            commands::plugins::uninstall_plugin,
            commands::plugins::get_plugin_manifest,
            commands::plugins::check_plugin_compatibility,
            // Plugin settings commands
            commands::plugins::read_plugin_settings,
            commands::plugins::write_plugin_settings,
            commands::plugins::backup_plugin_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
