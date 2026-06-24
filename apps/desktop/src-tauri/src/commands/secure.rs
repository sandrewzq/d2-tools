use std::collections::HashMap;
use std::sync::Mutex;

pub struct SecureStoreState(pub Mutex<HashMap<String, String>>);

#[tauri::command]
pub fn secure_get(key: String, state: tauri::State<SecureStoreState>) -> Option<String> {
    state.0.lock().ok()?.get(&key).cloned()
}

#[tauri::command]
pub fn secure_set(
    key: String,
    value: String,
    state: tauri::State<SecureStoreState>,
) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .insert(key, value);
    Ok(())
}

#[tauri::command]
pub fn secure_delete(key: String, state: tauri::State<SecureStoreState>) -> Result<(), String> {
    state
        .0
        .lock()
        .map_err(|error| error.to_string())?
        .remove(&key);
    Ok(())
}
