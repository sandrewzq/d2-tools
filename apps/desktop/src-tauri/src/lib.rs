mod commands;

use commands::log::LogState;
use commands::secure::SecureStoreState;
use std::collections::HashMap;
use std::sync::Mutex;

pub fn run() {
    tauri::Builder::default()
        .manage(SecureStoreState(Mutex::new(HashMap::new())))
        .manage(LogState(Mutex::new(Vec::new())))
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::app::app_get_info,
            commands::path::path_get_data_dir,
            commands::secure::secure_get,
            commands::secure::secure_set,
            commands::secure::secure_delete,
            commands::log::log_write,
            commands::log::log_export
        ])
        .run(tauri::generate_context!())
        .expect("failed to run d2-tools desktop app");
}
