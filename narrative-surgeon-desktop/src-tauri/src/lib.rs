mod db;
mod fs;

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            SqlBuilder::default()
                .add_migrations(
                    "sqlite:narrative_surgeon.db",
                    vec![Migration {
                        version: 1,
                        description: "create_initial_tables",
                        sql: include_str!("../migrations/001_initial.sql"),
                        kind: MigrationKind::Up,
                    }],
                )
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            db::get_manuscripts,
            db::create_manuscript,
            db::get_scenes,
            db::update_scene,
            db::delete_manuscript,
            db::create_scene,
            db::delete_scene,
            db::rename_scene,
            db::reorder_scenes,
            fs::import_manuscript_file,
            fs::export_manuscript,
            fs::open_file_dialog,
            fs::save_file_dialog,
            fs::batch_import_files,
            fs::backup_manuscript
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
