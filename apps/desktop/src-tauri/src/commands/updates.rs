use serde::Serialize;
use tauri_plugin_updater::UpdaterExt;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    available: bool,
    version: Option<String>,
    notes: Option<String>,
}

#[tauri::command]
pub async fn updates_check(app: tauri::AppHandle) -> Result<UpdateCheckResult, String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    Ok(match update {
        Some(update) => UpdateCheckResult {
            available: true,
            version: Some(update.version.to_string()),
            notes: update.body,
        },
        None => UpdateCheckResult {
            available: false,
            version: None,
            notes: None,
        },
    })
}

#[tauri::command]
pub async fn updates_install(app: tauri::AppHandle) -> Result<(), String> {
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    let Some(update) = update else {
        return Ok(());
    };

    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|error| error.to_string())?;

    app.restart();
}
