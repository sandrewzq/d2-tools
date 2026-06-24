mod commands;

use commands::log::LogState;
use commands::secure::SecureStoreState;
use std::collections::HashMap;
use std::sync::Mutex;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(SecureStoreState(Mutex::new(HashMap::new())))
        .manage(LogState(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            commands::app::app_get_info,
            commands::external::open_external,
            commands::fs::fs_read_app_file,
            commands::fs::fs_write_app_file,
            commands::path::path_get_data_dir,
            commands::secure::secure_get,
            commands::secure::secure_set,
            commands::secure::secure_delete,
            commands::log::log_write,
            commands::log::log_export,
            commands::updates::updates_check,
            commands::updates::updates_install
        ])
        .run(tauri::generate_context!())
        .expect("failed to run d2-tools desktop app");
}
