use std::sync::Mutex;

pub struct LogState(pub Mutex<Vec<String>>);

#[tauri::command]
pub fn log_write(
    level: String,
    message: String,
    state: tauri::State<LogState>,
) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .push(format!("{level}:{message}"));
    Ok(())
}

#[tauri::command]
pub fn log_export(state: tauri::State<LogState>) -> Result<String, String> {
    Ok(state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .join("\n"))
}
