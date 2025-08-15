pub mod db;
pub mod fs;
pub mod window;
pub mod menu;
pub mod export;
pub mod error;
// pub mod commands;  // Temporarily disabled until database layer is complete

use tauri_plugin_sql::{Builder as SqlBuilder, Migration, MigrationKind};
use tauri::Manager;

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
            db::get_all_manuscripts,
            db::get_manuscript,
            db::create_manuscript,
            db::update_manuscript,
            db::delete_manuscript,
            db::get_manuscript_scenes,
            db::get_scene,
            db::create_scene,
            db::update_scene,
            db::delete_scene,
            db::rename_scene,
            db::reorder_scenes,
            db::search_content,
            db::create_database_backup,
            fs::import_manuscript_file,
            fs::export_manuscript_file,
            fs::open_file_dialog,
            fs::save_file_dialog,
            fs::batch_import_files,
            fs::backup_manuscript,
            window::open_comparison_window,
            window::open_floating_notes,
            window::open_distraction_free_mode,
            window::close_window,
            window::minimize_window,
            window::maximize_window,
            window::toggle_always_on_top,
            window::set_window_position,
            window::set_window_size,
            window::get_window_info,
            window::list_windows,
            export::export_manuscript,
            export::get_export_formats,
            export::validate_export_options,
        ])
        .setup(|app| {
            // Initialize database service
            let db_service = db::DatabaseService::new();
            app.manage(db_service);
            
            // Create and set the app menu
            let menu = menu::create_app_menu(app.handle())?;
            app.set_menu(menu)?;
            
            Ok(())
        })
        .on_menu_event(|app, event| {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = menu::handle_menu_event(&app, event).await {
                    eprintln!("Menu event error: {}", e);
                }
            });
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
