use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    name: String,
    version: String,
    platform: String,
}

#[tauri::command]
pub fn app_get_info() -> AppInfo {
    AppInfo {
        name: "d2-tools".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: "desktop".to_string(),
    }
}
