use std::path::{Component, Path, PathBuf};

use tauri::Manager;

fn app_file_path(app: tauri::AppHandle, path: String) -> Result<PathBuf, String> {
    let relative_path = Path::new(&path);
    if relative_path.components().next().is_none() {
        return Err("path must not be empty".to_string());
    }

    for component in relative_path.components() {
        match component {
            Component::Normal(_) | Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("path must stay inside app data dir".to_string());
            }
        }
    }

    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    std::fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Ok(root.join(relative_path))
}

#[tauri::command]
pub fn fs_read_app_file(app: tauri::AppHandle, path: String) -> Result<Option<String>, String> {
    let file_path = app_file_path(app, path)?;
    if !file_path.exists() {
        return Ok(None);
    }

    std::fs::read_to_string(file_path)
        .map(Some)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub fn fs_write_app_file(
    app: tauri::AppHandle,
    path: String,
    content: String,
) -> Result<(), String> {
    let file_path = app_file_path(app, path)?;
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    std::fs::write(file_path, content).map_err(|error| error.to_string())
}
