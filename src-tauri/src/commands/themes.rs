use serde::{Deserialize, Serialize};
use std::fs;

fn get_themes_directory() -> Result<std::path::PathBuf, String> {
    let home_dir = if cfg!(target_os = "windows") {
        std::env::var("USERPROFILE")
            .or_else(|_| {
                std::env::var("HOMEDRIVE").and_then(|drive| {
                    std::env::var("HOMEPATH").map(|path| format!("{}{}", drive, path))
                })
            })
            .map_err(|_| "Não foi possível obter diretório home no Windows")?
    } else {
        std::env::var("HOME").map_err(|_| "Não foi possível obter diretório home")?
    };

    let inkdown_dir = std::path::Path::new(&home_dir).join(".inkdown");
    Ok(inkdown_dir.join("themes"))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RepositoryTheme {
    pub name: String,
    pub author: String,
    pub repo: String,
    pub screenshot: String,
    pub modes: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeWithScreenshot {
    pub name: String,
    pub author: String,
    pub repo: String,
    pub screenshot: String,
    pub modes: Vec<String>,
    pub screenshot_data: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeVariant {
    pub id: String,
    pub name: String,
    pub mode: String,
    #[serde(rename = "cssFile")]
    pub css_file: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomTheme {
    pub name: String,
    pub author: String,
    pub description: String,
    pub variants: Vec<ThemeVariant>,
    pub version: String,
    pub homepage: Option<String>,
}

#[tauri::command]
pub fn get_custom_themes() -> Result<Vec<CustomTheme>, String> {
    let themes_dir = get_themes_directory()?;

    if !themes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut themes = Vec::new();

    let entries =
        fs::read_dir(&themes_dir).map_err(|e| format!("Failed to read themes directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                let theme_json = entry_path.join("theme.json");
                if theme_json.exists() {
                    match fs::read_to_string(&theme_json) {
                        Ok(content) => match serde_json::from_str::<CustomTheme>(&content) {
                            Ok(theme) => themes.push(theme),
                            Err(_) => continue,
                        },
                        Err(_) => continue,
                    }
                }
            }
        }
    }

    Ok(themes)
}

#[tauri::command]
pub fn get_theme_css(theme_id: String) -> Result<String, String> {
    let themes_dir = get_themes_directory()?;

    if !themes_dir.exists() {
        return Err("Themes directory not found".to_string());
    }

    let entries =
        fs::read_dir(&themes_dir).map_err(|e| format!("Failed to read themes directory: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let theme_path = entry.path();
            if theme_path.is_dir() {
                let theme_json = theme_path.join("theme.json");
                if !theme_json.exists() {
                    continue;
                }

                let theme_content = fs::read_to_string(&theme_json)
                    .map_err(|e| format!("Failed to read theme.json: {}", e))?;

                let theme: CustomTheme = serde_json::from_str(&theme_content)
                    .map_err(|e| format!("Failed to parse theme.json: {}", e))?;

                if let Some(variant) = theme.variants.iter().find(|v| v.id == theme_id) {
                    let css_file_path = theme_path.join(&variant.css_file);

                    if css_file_path.exists() {
                        return fs::read_to_string(css_file_path).map_err(|e| {
                            format!("Failed to read CSS file '{}': {}", variant.css_file, e)
                        });
                    } else {
                        if let Ok(entries) = fs::read_dir(&theme_path) {
                            for entry in entries {
                                if let Ok(entry) = entry {
                                    println!("  - {:?}", entry.file_name());
                                }
                            }
                        }

                        return Err(format!(
                            "CSS file '{}' not found for theme '{}' at path: {:?}",
                            variant.css_file, theme.name, css_file_path
                        ));
                    }
                }
            }
        }
    }

    Err(format!("Theme variant with ID '{}' not found", theme_id))
}

#[tauri::command]
pub async fn search_community_themes(repo_url: String) -> Result<Vec<ThemeWithScreenshot>, String> {
    let client = reqwest::Client::new();

    let themes_json_url = format!("{}/raw/main/themes.json", repo_url);

    let response = client
        .get(&themes_json_url)
        .header("User-Agent", "Inkdown/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch themes.json: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Failed to fetch themes.json: HTTP {}",
            response.status()
        ));
    }

    let themes: Vec<RepositoryTheme> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse themes.json: {}", e))?;

    let mut themes_with_screenshots = Vec::new();

    for theme in themes {
        let screenshot_data = fetch_theme_screenshot(&client, &theme.repo, &theme.screenshot).await;

        themes_with_screenshots.push(ThemeWithScreenshot {
            name: theme.name,
            author: theme.author,
            repo: theme.repo,
            screenshot: theme.screenshot,
            modes: theme.modes,
            screenshot_data,
        });
    }

    Ok(themes_with_screenshots)
}

async fn fetch_theme_screenshot(
    client: &reqwest::Client,
    repo: &str,
    screenshot_filename: &str,
) -> Option<String> {
    let screenshot_url = format!(
        "https://github.com/{}/raw/main/{}",
        repo, screenshot_filename
    );

    match client
        .get(&screenshot_url)
        .header("User-Agent", "Inkdown/1.0")
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => match response.bytes().await {
            Ok(bytes) => {
                let base64_data =
                    base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
                Some(format!("data:image/png;base64,{}", base64_data))
            }
            Err(_) => None,
        },
        _ => None,
    }
}

#[tauri::command]
pub async fn download_community_theme(theme: RepositoryTheme) -> Result<(), String> {
    let client = reqwest::Client::new();

    let themes_dir = get_themes_directory()?;

    let safe_theme_name = sanitize_filename(&theme.name);
    let theme_dir = themes_dir.join(safe_theme_name);

    std::fs::create_dir_all(&theme_dir)
        .map_err(|e| format!("Falha ao criar diretório do tema: {}", e))?;

    let css_files = fetch_css_files_from_repo(&client, &theme.repo).await?;

    for css_file in &css_files {
        let css_content = fetch_file_content(&client, &theme.repo, &css_file).await?;
        let file_path = theme_dir.join(&css_file);

        if let Some(parent) = file_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Falha ao criar diretório: {}", e))?;
        }

        std::fs::write(&file_path, &css_content)
            .map_err(|e| format!("Falha ao salvar arquivo CSS {}: {}", css_file, e))?;
    }

    if theme.modes.len() > 1 {
        for mode in &theme.modes {
            let target_file = format!("{}.css", mode.to_lowercase());
            let target_path = theme_dir.join(&target_file);

            let source_css = css_files
                .iter()
                .find(|css| css.to_lowercase().contains(&mode.to_lowercase()))
                .unwrap_or(&css_files[0]);

            let source_path = theme_dir.join(source_css);

            if source_path != target_path {
                std::fs::copy(&source_path, &target_path)
                    .map_err(|e| format!("Falha ao criar {}: {}", target_file, e))?;
            }
        }
    }
    let variants = if theme.modes.len() > 1 {
        theme
            .modes
            .iter()
            .map(|mode| {
                serde_json::json!({
                    "id": format!("{}-{}", theme.name.to_lowercase().replace(" ", "-"), mode),
                    "name": format!("{} {}", theme.name, mode),
                    "mode": mode,
                    "cssFile": format!("{}.css", mode.to_lowercase())
                })
            })
            .collect::<Vec<_>>()
    } else {
        let css_file = &css_files[0];
        theme
            .modes
            .iter()
            .map(|mode| {
                serde_json::json!({
                    "id": format!("{}-{}", theme.name.to_lowercase().replace(" ", "-"), mode),
                    "name": format!("{} {}", theme.name, mode),
                    "mode": mode,
                    "cssFile": css_file
                })
            })
            .collect::<Vec<_>>()
    };

    let theme_json = serde_json::json!({
        "name": theme.name,
        "author": theme.author,
        "description": format!("Tema {} criado por {}", theme.name, theme.author),
        "version": "1.0.0",
        "homepage": format!("https://github.com/{}", theme.repo),
        "variants": variants
    });

    let theme_json_path = theme_dir.join("theme.json");
    std::fs::write(
        &theme_json_path,
        serde_json::to_string_pretty(&theme_json).unwrap(),
    )
    .map_err(|e| format!("Falha ao salvar theme.json: {}", e))?;

    Ok(())
}

async fn fetch_css_files_from_repo(
    client: &reqwest::Client,
    repo: &str,
) -> Result<Vec<String>, String> {
    let api_url = format!("https://api.github.com/repos/{}/contents", repo);

    let response = client
        .get(&api_url)
        .header("User-Agent", "Inkdown/1.0")
        .send()
        .await
        .map_err(|e| format!("Falha ao buscar conteúdo do repositório: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Falha ao buscar conteúdo: HTTP {}",
            response.status()
        ));
    }

    let files: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("Falha ao parsear resposta da API: {}", e))?;

    let css_files: Vec<String> = files
        .iter()
        .filter_map(|file| {
            let name = file.get("name")?.as_str()?;
            let file_type = file.get("type")?.as_str()?;
            if file_type == "file" && name.ends_with(".css") {
                Some(name.to_string())
            } else {
                None
            }
        })
        .collect();

    if css_files.is_empty() {
        return Err("Nenhum arquivo CSS encontrado no repositório".to_string());
    }

    Ok(css_files)
}

async fn fetch_file_content(
    client: &reqwest::Client,
    repo: &str,
    filename: &str,
) -> Result<String, String> {
    let file_url = format!("https://github.com/{}/raw/main/{}", repo, filename);

    let response = client
        .get(&file_url)
        .header("User-Agent", "Inkdown/1.0")
        .send()
        .await
        .map_err(|e| format!("Falha ao baixar arquivo {}: {}", filename, e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Falha ao baixar {}: HTTP {}",
            filename,
            response.status()
        ));
    }

    response
        .text()
        .await
        .map_err(|e| format!("Falha ao ler conteúdo de {}: {}", filename, e))
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            c if c.is_control() => '-',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[tauri::command]
pub fn get_installed_theme_names() -> Result<Vec<String>, String> {
    let themes_dir = get_themes_directory()?;

    if !themes_dir.exists() {
        return Ok(Vec::new());
    }

    let mut theme_names = Vec::new();

    if let Ok(entries) = fs::read_dir(&themes_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(extension) = path.extension() {
                    if extension == "json" {
                        if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                            theme_names.push(name.to_string());
                        }
                    }
                }
            }
        }
    }

    theme_names.sort();
    Ok(theme_names)
}

#[tauri::command]
pub fn delete_community_theme(theme_name: String, theme_author: String) -> Result<(), String> {
    // Validate input parameters
    if theme_name.trim().is_empty() || theme_author.trim().is_empty() {
        return Err("Nome do tema e autor são obrigatórios".to_string());
    }

    // Sanitize inputs for security
    let safe_theme_name = sanitize_filename(&theme_name);
    let safe_author = sanitize_filename(&theme_author);
    
    // Prevent path traversal attacks
    if safe_theme_name.contains("..") || safe_author.contains("..") {
        return Err("Nomes de tema inválidos detectados".to_string());
    }

    let themes_dir = get_themes_directory()?;
    
    if !themes_dir.exists() {
        return Err("Diretório de temas não encontrado".to_string());
    }

    // Find theme directory by matching theme.json content
    let entries = fs::read_dir(&themes_dir)
        .map_err(|e| format!("Falha ao ler diretório de temas: {}", e))?;

    for entry in entries {
        if let Ok(entry) = entry {
            let theme_path = entry.path();
            if theme_path.is_dir() {
                let theme_json_path = theme_path.join("theme.json");
                
                if theme_json_path.exists() {
                    // Read and parse theme.json to match name and author
                    match fs::read_to_string(&theme_json_path) {
                        Ok(content) => {
                            match serde_json::from_str::<CustomTheme>(&content) {
                                Ok(theme) => {
                                    // Match both name and author for security
                                    if theme.name == theme_name && theme.author == theme_author {
                                        // Perform atomic deletion with error recovery
                                        match fs::remove_dir_all(&theme_path) {
                                            Ok(()) => {
                                                println!("Tema '{}' por '{}' removido com sucesso", theme_name, theme_author);
                                                return Ok(());
                                            }
                                            Err(e) => {
                                                return Err(format!(
                                                    "Falha ao remover tema '{}': {}. Verifique permissões.", 
                                                    theme_name, e
                                                ));
                                            }
                                        }
                                    }
                                }
                                Err(_) => continue, // Skip malformed theme.json files
                            }
                        }
                        Err(_) => continue, // Skip unreadable files
                    }
                }
            }
        }
    }

    Err(format!(
        "Tema '{}' por '{}' não foi encontrado nos temas instalados", 
        theme_name, theme_author
    ))
}
