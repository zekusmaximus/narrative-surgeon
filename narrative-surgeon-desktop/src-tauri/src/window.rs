use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindowBuilder};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct WindowConfig {
    pub width: f64,
    pub height: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub title: String,
    pub resizable: bool,
    pub always_on_top: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            width: 800.0,
            height: 600.0,
            x: None,
            y: None,
            title: "Narrative Surgeon".to_string(),
            resizable: true,
            always_on_top: false,
        }
    }
}

#[tauri::command]
pub async fn open_comparison_window(
    app_handle: AppHandle,
    scene1_id: String,
    scene2_id: String,
) -> Result<(), String> {
    let window_label = format!("comparison_{}_{}", scene1_id, scene2_id);
    
    // Check if window already exists
    if app_handle.get_webview_window(&window_label).is_some() {
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    let config = WindowConfig {
        width: 1200.0,
        height: 700.0,
        title: format!("Scene Comparison: {} vs {}", scene1_id, scene2_id),
        resizable: true,
        always_on_top: false,
        ..Default::default()
    };

    let url = format!("/comparison?scene1={}&scene2={}", scene1_id, scene2_id);
    
    let window = WebviewWindowBuilder::new(&app_handle, &window_label, tauri::WebviewUrl::App(url.into()))
    .title(&config.title)
    .inner_size(config.width, config.height)
    .resizable(config.resizable)
    .always_on_top(config.always_on_top);

    let window_builder = if let (Some(x), Some(y)) = (config.x, config.y) {
        window.position(x, y)
    } else {
        window.center()
    };
    
    window_builder.build().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_floating_notes(app_handle: AppHandle) -> Result<(), String> {
    let window_label = "floating_notes";
    
    // Check if window already exists
    if app_handle.get_webview_window(window_label).is_some() {
        if let Some(window) = app_handle.get_webview_window(window_label) {
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    let config = WindowConfig {
        width: 400.0,
        height: 600.0,
        title: "Floating Notes".to_string(),
        resizable: true,
        always_on_top: true,
        ..Default::default()
    };

    let window = WebviewWindowBuilder::new(&app_handle, window_label, tauri::WebviewUrl::App("/floating-notes".into()))
    .title(&config.title)
    .inner_size(config.width, config.height)
    .resizable(config.resizable)
    .always_on_top(config.always_on_top)
    .decorations(true)
    .transparent(false);

    // Position floating notes window to the right side of screen
    let window_builder = if let Ok(primary_monitor) = app_handle.primary_monitor() {
        if let Some(monitor) = primary_monitor {
            let monitor_size = monitor.size();
            let x = monitor_size.width as f64 - config.width - 50.0;
            let y = 100.0;
            window.position(x, y)
        } else {
            window.center()
        }
    } else {
        window.center()
    };
    
    window_builder.build().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn open_distraction_free_mode(app_handle: AppHandle) -> Result<(), String> {
    let window_label = "distraction_free";
    
    // Check if window already exists
    if app_handle.get_webview_window(window_label).is_some() {
        if let Some(window) = app_handle.get_webview_window(window_label) {
            window.set_focus().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    let config = WindowConfig {
        width: 1000.0,
        height: 700.0,
        title: "Distraction-Free Writing".to_string(),
        resizable: false,
        always_on_top: false,
        ..Default::default()
    };

    let window = WebviewWindowBuilder::new(&app_handle, window_label, tauri::WebviewUrl::App("/distraction-free".into()))
    .title(&config.title)
    .inner_size(config.width, config.height)
    .resizable(config.resizable)
    .always_on_top(config.always_on_top)
    .decorations(false) // Remove window decorations for full immersion
    .transparent(false)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn close_window(app_handle: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn minimize_window(app_handle: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.minimize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn maximize_window(app_handle: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.maximize().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_always_on_top(
    app_handle: AppHandle,
    window_label: String,
) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        let current_state = window.is_always_on_top().map_err(|e| e.to_string())?;
        let new_state = !current_state;
        window.set_always_on_top(new_state).map_err(|e| e.to_string())?;
        Ok(new_state)
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn set_window_position(
    app_handle: AppHandle,
    window_label: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: x as i32, y: y as i32 }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn set_window_size(
    app_handle: AppHandle,
    window_label: String,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: width as u32, height: height as u32 }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_window_info(
    app_handle: AppHandle,
    window_label: String,
) -> Result<HashMap<String, serde_json::Value>, String> {
    if let Some(window) = app_handle.get_webview_window(&window_label) {
        let mut info = HashMap::new();
        
        if let Ok(position) = window.outer_position() {
            info.insert("x".to_string(), serde_json::Value::Number(serde_json::Number::from(position.x)));
            info.insert("y".to_string(), serde_json::Value::Number(serde_json::Number::from(position.y)));
        }
        
        if let Ok(size) = window.outer_size() {
            info.insert("width".to_string(), serde_json::Value::Number(serde_json::Number::from(size.width)));
            info.insert("height".to_string(), serde_json::Value::Number(serde_json::Number::from(size.height)));
        }
        
        if let Ok(is_maximized) = window.is_maximized() {
            info.insert("is_maximized".to_string(), serde_json::Value::Bool(is_maximized));
        }
        
        if let Ok(is_minimized) = window.is_minimized() {
            info.insert("is_minimized".to_string(), serde_json::Value::Bool(is_minimized));
        }
        
        if let Ok(is_always_on_top) = window.is_always_on_top() {
            info.insert("is_always_on_top".to_string(), serde_json::Value::Bool(is_always_on_top));
        }
        
        Ok(info)
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn list_windows(app_handle: AppHandle) -> Result<Vec<String>, String> {
    let windows: Vec<String> = app_handle.webview_windows().keys().cloned().collect();
    Ok(windows)
}