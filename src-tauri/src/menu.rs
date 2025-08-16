use tauri::{
    menu::{Menu, MenuBuilder, MenuItemBuilder, SubmenuBuilder, PredefinedMenuItem},
    AppHandle, Wry
};
use tauri::Emitter;

pub fn create_app_menu(app_handle: &AppHandle) -> Result<Menu<Wry>, Box<dyn std::error::Error>> {
    // File Menu
    let file_menu = create_file_menu(app_handle)?;
    
    // Edit Menu
    let edit_menu = create_edit_menu(app_handle)?;
    
    // View Menu
    let view_menu = create_view_menu(app_handle)?;
    
    // Manuscript Menu
    let manuscript_menu = create_manuscript_menu(app_handle)?;
    
    // Tools Menu
    let tools_menu = create_tools_menu(app_handle)?;
    
    // Help Menu
    let help_menu = create_help_menu(app_handle)?;

    // Build main menu
    let menu = MenuBuilder::new(app_handle)
        .items(&[
            &file_menu,
            &edit_menu,
            &view_menu,
            &manuscript_menu,
            &tools_menu,
            &help_menu,
        ])
        .build()?;

    Ok(menu)
}

fn create_file_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let new_manuscript = MenuItemBuilder::with_id("file_new_manuscript", "New Manuscript")
        .accelerator("CmdOrCtrl+N")
        .build(app_handle)?;
    
    let open_manuscript = MenuItemBuilder::with_id("file_open_manuscript", "Open Manuscript...")
        .accelerator("CmdOrCtrl+O")
        .build(app_handle)?;
    
    let open_recent = SubmenuBuilder::with_id(app_handle, "file_recent", "Open Recent")
        .items(&[
            &MenuItemBuilder::with_id("file_recent_clear", "Clear Recent")
                .build(app_handle)?,
        ])
        .build()?;
    
    let save = MenuItemBuilder::with_id("file_save", "Save")
        .accelerator("CmdOrCtrl+S")
        .build(app_handle)?;
    
    let save_as = MenuItemBuilder::with_id("file_save_as", "Save As...")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app_handle)?;
    
    let import_submenu = SubmenuBuilder::with_id(app_handle, "file_import", "Import")
        .items(&[
            &MenuItemBuilder::with_id("file_import_docx", "Word Document (.docx)")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_import_txt", "Text File (.txt)")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_import_scrivener", "Scrivener Project")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_import_batch", "Batch Import...")
                .accelerator("CmdOrCtrl+Shift+I")
                .build(app_handle)?,
        ])
        .build()?;
    
    let export_submenu = SubmenuBuilder::with_id(app_handle, "file_export", "Export")
        .items(&[
            &MenuItemBuilder::with_id("file_export_docx", "Word Document (.docx)")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_export_pdf", "PDF Document")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_export_epub", "EPUB eBook")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_export_html", "HTML")
                .build(app_handle)?,
            &MenuItemBuilder::with_id("file_export_scrivener", "Scrivener Format")
                .build(app_handle)?,
        ])
        .build()?;
    
    let print = MenuItemBuilder::with_id("file_print", "Print...")
        .accelerator("CmdOrCtrl+P")
        .build(app_handle)?;
    
    let print_preview = MenuItemBuilder::with_id("file_print_preview", "Print Preview")
        .build(app_handle)?;
    
    let quit = MenuItemBuilder::with_id("file_quit", "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app_handle)?;

    let file_menu = SubmenuBuilder::with_id(app_handle, "file", "File")
        .items(&[
            &new_manuscript,
            &open_manuscript,
            &open_recent,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &save,
            &save_as,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &import_submenu,
            &export_submenu,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &print,
            &print_preview,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &quit,
        ])
        .build()?;

    Ok(file_menu)
}

fn create_edit_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let undo = MenuItemBuilder::with_id("edit_undo", "Undo")
        .accelerator("CmdOrCtrl+Z")
        .build(app_handle)?;
    
    let redo = MenuItemBuilder::with_id("edit_redo", "Redo")
        .accelerator("CmdOrCtrl+Y")
        .build(app_handle)?;
    
    let cut = MenuItemBuilder::with_id("edit_cut", "Cut")
        .accelerator("CmdOrCtrl+X")
        .build(app_handle)?;
    
    let copy = MenuItemBuilder::with_id("edit_copy", "Copy")
        .accelerator("CmdOrCtrl+C")
        .build(app_handle)?;
    
    let paste = MenuItemBuilder::with_id("edit_paste", "Paste")
        .accelerator("CmdOrCtrl+V")
        .build(app_handle)?;
    
    let select_all = MenuItemBuilder::with_id("edit_select_all", "Select All")
        .accelerator("CmdOrCtrl+A")
        .build(app_handle)?;
    
    let find = MenuItemBuilder::with_id("edit_find", "Find...")
        .accelerator("CmdOrCtrl+F")
        .build(app_handle)?;
    
    let find_next = MenuItemBuilder::with_id("edit_find_next", "Find Next")
        .accelerator("CmdOrCtrl+G")
        .build(app_handle)?;
    
    let find_previous = MenuItemBuilder::with_id("edit_find_previous", "Find Previous")
        .accelerator("CmdOrCtrl+Shift+G")
        .build(app_handle)?;
    
    let replace = MenuItemBuilder::with_id("edit_replace", "Replace...")
        .accelerator("CmdOrCtrl+H")
        .build(app_handle)?;
    
    let global_search = MenuItemBuilder::with_id("edit_global_search", "Global Search")
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app_handle)?;

    let edit_menu = SubmenuBuilder::with_id(app_handle, "edit", "Edit")
        .items(&[
            &undo,
            &redo,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &cut,
            &copy,
            &paste,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &select_all,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &find,
            &find_next,
            &find_previous,
            &replace,
            &global_search,
        ])
        .build()?;

    Ok(edit_menu)
}

fn create_view_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let zoom_in = MenuItemBuilder::with_id("view_zoom_in", "Zoom In")
        .accelerator("CmdOrCtrl+Plus")
        .build(app_handle)?;
    
    let zoom_out = MenuItemBuilder::with_id("view_zoom_out", "Zoom Out")
        .accelerator("CmdOrCtrl+Minus")
        .build(app_handle)?;
    
    let zoom_reset = MenuItemBuilder::with_id("view_zoom_reset", "Actual Size")
        .accelerator("CmdOrCtrl+0")
        .build(app_handle)?;
    
    let focus_mode = MenuItemBuilder::with_id("view_focus_mode", "Focus Mode")
        .accelerator("CmdOrCtrl+Shift+F")
        .build(app_handle)?;
    
    let distraction_free = MenuItemBuilder::with_id("view_distraction_free", "Distraction-Free Mode")
        .accelerator("CmdOrCtrl+Shift+D")
        .build(app_handle)?;
    
    let typewriter_mode = MenuItemBuilder::with_id("view_typewriter_mode", "Typewriter Mode")
        .accelerator("CmdOrCtrl+T")
        .build(app_handle)?;
    
    let split_view_horizontal = MenuItemBuilder::with_id("view_split_horizontal", "Split View Horizontally")
        .build(app_handle)?;
    
    let split_view_vertical = MenuItemBuilder::with_id("view_split_vertical", "Split View Vertically")
        .build(app_handle)?;
    
    let close_split = MenuItemBuilder::with_id("view_close_split", "Close Split View")
        .build(app_handle)?;
    
    let show_document_outline = MenuItemBuilder::with_id("view_document_outline", "Document Outline")
        .accelerator("CmdOrCtrl+Shift+O")
        .build(app_handle)?;
    
    let show_writing_stats = MenuItemBuilder::with_id("view_writing_stats", "Writing Statistics")
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app_handle)?;
    
    let floating_notes = MenuItemBuilder::with_id("view_floating_notes", "Floating Notes")
        .accelerator("CmdOrCtrl+Shift+N")
        .build(app_handle)?;

    let view_menu = SubmenuBuilder::with_id(app_handle, "view", "View")
        .items(&[
            &zoom_in,
            &zoom_out,
            &zoom_reset,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &focus_mode,
            &distraction_free,
            &typewriter_mode,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &split_view_horizontal,
            &split_view_vertical,
            &close_split,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &show_document_outline,
            &show_writing_stats,
            &floating_notes,
        ])
        .build()?;

    Ok(view_menu)
}

fn create_manuscript_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let analyze_scene = MenuItemBuilder::with_id("manuscript_analyze_scene", "Analyze Current Scene")
        .accelerator("CmdOrCtrl+Shift+A")
        .build(app_handle)?;
    
    let analyze_full = MenuItemBuilder::with_id("manuscript_analyze_full", "Analyze Full Manuscript")
        .build(app_handle)?;
    
    let quick_ai_suggestion = MenuItemBuilder::with_id("manuscript_quick_ai", "Quick AI Suggestion")
        .accelerator("CmdOrCtrl+Enter")
        .build(app_handle)?;
    
    let scene_comparison = MenuItemBuilder::with_id("manuscript_scene_comparison", "Open Scene Comparison")
        .accelerator("CmdOrCtrl+Shift+C")
        .build(app_handle)?;
    
    let statistics = MenuItemBuilder::with_id("manuscript_statistics", "Manuscript Statistics")
        .accelerator("CmdOrCtrl+I")
        .build(app_handle)?;
    
    let word_frequency = MenuItemBuilder::with_id("manuscript_word_frequency", "Word Frequency Analysis")
        .build(app_handle)?;
    
    let reading_time = MenuItemBuilder::with_id("manuscript_reading_time", "Reading Time Estimate")
        .build(app_handle)?;
    
    let version_history = MenuItemBuilder::with_id("manuscript_version_history", "Version History")
        .build(app_handle)?;
    
    let backup_create = MenuItemBuilder::with_id("manuscript_backup_create", "Create Backup")
        .build(app_handle)?;
    
    let backup_restore = MenuItemBuilder::with_id("manuscript_backup_restore", "Restore from Backup...")
        .build(app_handle)?;

    let manuscript_menu = SubmenuBuilder::with_id(app_handle, "manuscript", "Manuscript")
        .items(&[
            &analyze_scene,
            &analyze_full,
            &quick_ai_suggestion,
            &scene_comparison,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &statistics,
            &word_frequency,
            &reading_time,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &version_history,
            &backup_create,
            &backup_restore,
        ])
        .build()?;

    Ok(manuscript_menu)
}

fn create_tools_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let preferences = MenuItemBuilder::with_id("tools_preferences", "Preferences...")
        .accelerator("CmdOrCtrl+Comma")
        .build(app_handle)?;
    
    let ai_settings = MenuItemBuilder::with_id("tools_ai_settings", "AI Settings...")
        .build(app_handle)?;
    
    let export_settings = MenuItemBuilder::with_id("tools_export_settings", "Export Settings...")
        .build(app_handle)?;
    
    let keyboard_shortcuts = MenuItemBuilder::with_id("tools_keyboard_shortcuts", "Keyboard Shortcuts...")
        .build(app_handle)?;
    
    let plugin_manager = MenuItemBuilder::with_id("tools_plugin_manager", "Plugin Manager...")
        .build(app_handle)?;
    
    let theme_editor = MenuItemBuilder::with_id("tools_theme_editor", "Theme Editor...")
        .build(app_handle)?;
    
    let custom_dictionary = MenuItemBuilder::with_id("tools_custom_dictionary", "Custom Dictionary...")
        .build(app_handle)?;
    
    let manuscript_templates = MenuItemBuilder::with_id("tools_manuscript_templates", "Manuscript Templates...")
        .build(app_handle)?;

    let tools_menu = SubmenuBuilder::with_id(app_handle, "tools", "Tools")
        .items(&[
            &preferences,
            &ai_settings,
            &export_settings,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &keyboard_shortcuts,
            &plugin_manager,
            &theme_editor,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &custom_dictionary,
            &manuscript_templates,
        ])
        .build()?;

    Ok(tools_menu)
}

fn create_help_menu(app_handle: &AppHandle) -> Result<tauri::menu::Submenu<Wry>, Box<dyn std::error::Error>> {
    let documentation = MenuItemBuilder::with_id("help_documentation", "Documentation")
        .build(app_handle)?;
    
    let keyboard_shortcuts_help = MenuItemBuilder::with_id("help_keyboard_shortcuts", "Keyboard Shortcuts")
        .build(app_handle)?;
    
    let video_tutorials = MenuItemBuilder::with_id("help_video_tutorials", "Video Tutorials")
        .build(app_handle)?;
    
    let community_forum = MenuItemBuilder::with_id("help_community_forum", "Community Forum")
        .build(app_handle)?;
    
    let report_bug = MenuItemBuilder::with_id("help_report_bug", "Report Bug")
        .build(app_handle)?;
    
    let feature_request = MenuItemBuilder::with_id("help_feature_request", "Request Feature")
        .build(app_handle)?;
    
    let check_updates = MenuItemBuilder::with_id("help_check_updates", "Check for Updates...")
        .build(app_handle)?;
    
    let about = MenuItemBuilder::with_id("help_about", "About Narrative Surgeon")
        .build(app_handle)?;

    let help_menu = SubmenuBuilder::with_id(app_handle, "help", "Help")
        .items(&[
            &documentation,
            &keyboard_shortcuts_help,
            &video_tutorials,
            &community_forum,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &report_bug,
            &feature_request,
            &PredefinedMenuItem::separator(app_handle).unwrap(),
            &check_updates,
            &about,
        ])
        .build()?;

    Ok(help_menu)
}

// Menu event handlers
pub async fn handle_menu_event(
    app_handle: &AppHandle,
    event: tauri::menu::MenuEvent,
) -> Result<(), Box<dyn std::error::Error>> {
    match event.id.as_ref() {
        // File menu events
        "file_new_manuscript" => {
            // Emit event to frontend
            app_handle.emit("menu-action", "new_manuscript")?;
        }
        "file_open_manuscript" => {
            app_handle.emit("menu-action", "open_manuscript")?;
        }
        "file_save" => {
            app_handle.emit("menu-action", "save")?;
        }
        "file_save_as" => {
            app_handle.emit("menu-action", "save_as")?;
        }
        "file_print" => {
            app_handle.emit("menu-action", "print")?;
        }
        "file_quit" => {
            app_handle.exit(0);
        }
        
        // Edit menu events
        "edit_undo" => {
            app_handle.emit("menu-action", "undo")?;
        }
        "edit_redo" => {
            app_handle.emit("menu-action", "redo")?;
        }
        "edit_find" => {
            app_handle.emit("menu-action", "find")?;
        }
        "edit_replace" => {
            app_handle.emit("menu-action", "replace")?;
        }
        "edit_global_search" => {
            app_handle.emit("menu-action", "global_search")?;
        }
        
        // View menu events
        "view_distraction_free" => {
            crate::window::open_distraction_free_mode(app_handle.clone()).await?;
        }
        "view_floating_notes" => {
            crate::window::open_floating_notes(app_handle.clone()).await?;
        }
        "view_focus_mode" => {
            app_handle.emit("menu-action", "focus_mode")?;
        }
        "view_zoom_in" => {
            app_handle.emit("menu-action", "zoom_in")?;
        }
        "view_zoom_out" => {
            app_handle.emit("menu-action", "zoom_out")?;
        }
        "view_zoom_reset" => {
            app_handle.emit("menu-action", "zoom_reset")?;
        }
        
        // Manuscript menu events
        "manuscript_analyze_scene" => {
            app_handle.emit("menu-action", "analyze_scene")?;
        }
        "manuscript_analyze_full" => {
            app_handle.emit("menu-action", "analyze_full")?;
        }
        "manuscript_quick_ai" => {
            app_handle.emit("menu-action", "quick_ai")?;
        }
        "manuscript_scene_comparison" => {
            app_handle.emit("menu-action", "scene_comparison")?;
        }
        "manuscript_statistics" => {
            app_handle.emit("menu-action", "statistics")?;
        }
        
        // Tools menu events
        "tools_preferences" => {
            app_handle.emit("menu-action", "preferences")?;
        }
        "tools_ai_settings" => {
            app_handle.emit("menu-action", "ai_settings")?;
        }
        "tools_export_settings" => {
            app_handle.emit("menu-action", "export_settings")?;
        }
        
        // Default case
        _ => {
            println!("Unhandled menu event: {:?}", event.id);
        }
    }
    
    Ok(())
}