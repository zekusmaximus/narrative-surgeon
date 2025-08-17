use crate::error::{AppError, AppResult, ErrorLogger, retry_with_backoff, RetryConfig};
use crate::db::DatabaseService;
use tauri::{AppHandle, State};
use serde_json::Value;

// Wrapper macro for Tauri commands with error handling and logging
macro_rules! tauri_command_with_error_handling {
    ($name:ident, $body:expr) => {
        #[tauri::command]
        pub async fn $name(
            app: AppHandle,
            db_service: State<'_, DatabaseService>
        ) -> Result<Value, AppError> {
            let operation_name = stringify!($name);
            let start_time = std::time::Instant::now();
            
            match $body(app.clone(), db_service.clone()).await {
                Ok(result) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    log_operation_success(&app, operation_name, execution_time).await;
                    Ok(serde_json::to_value(result).unwrap_or(Value::Null))
                },
                Err(error) => {
                    let execution_time = start_time.elapsed().as_millis() as u64;
                    log_operation_error(&app, operation_name, &error, execution_time).await;
                    Err(error)
                }
            }
        }
    };
}

async fn log_operation_success(app: &AppHandle, operation: &str, execution_time: u64) {
    // Log successful operation for monitoring
    println!("[{}] Operation '{}' completed successfully in {}ms", 
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"), 
        operation, 
        execution_time
    );
}

async fn log_operation_error(app: &AppHandle, operation: &str, error: &AppError, execution_time: u64) {
    // Log error with context
    let error_logger = ErrorLogger::new();
    let context = format!("Operation: {}, Duration: {}ms", operation, execution_time);
    
    if let Err(log_err) = error_logger.log_error(error, Some(&context)) {
        eprintln!("Failed to log error for operation '{}': {}", operation, log_err);
    }
    
    // Also log to console for immediate visibility
    eprintln!("[{}] Operation '{}' failed after {}ms: {}", 
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S"), 
        operation, 
        execution_time,
        error
    );
}

// Command validation utilities - made public for testing

pub fn validate_scene_id(id: &str) -> AppResult<()> {
    if id.is_empty() {
        return Err(AppError::validation_field(
            "Scene ID cannot be empty",
            "scene_id",
            id
        ));
    }
    
    if !uuid::Uuid::parse_str(id).is_ok() {
        return Err(AppError::validation_field(
            "Invalid scene ID format",
            "scene_id",
            id
        ));
    }
    
    Ok(())
}

pub fn validate_title(title: &str) -> AppResult<()> {
    if title.is_empty() {
        return Err(AppError::validation_field(
            "Title cannot be empty",
            "title",
            title
        ));
    }
    
    if title.len() > 255 {
        return Err(AppError::validation_field(
            "Title cannot be longer than 255 characters",
            "title",
            &format!("{} chars", title.len())
        ));
    }
    
    Ok(())
}

// Enhanced database commands with proper error handling
// Single manuscript mode - get the singleton manuscript
#[tauri::command]
pub async fn get_manuscript_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>
) -> Result<Value, AppError> {
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        
        async move {
            db_service.execute_with_cache(
                &app,
                "SELECT id, title, author, genre, created_at, updated_at, total_word_count, opening_strength_score, hook_effectiveness FROM manuscripts LIMIT 1",
                &[]
            ).await
        }
    }, RetryConfig::default()).await?;
    
    Ok(result)
}

#[tauri::command]
pub async fn update_manuscript_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    title: String,
    author: Option<String>,
    genre: Option<String>
) -> Result<Value, AppError> {
    // Validate input
    validate_title(&title)?;
    
    let now = chrono::Utc::now().timestamp_millis();
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let title = title.clone();
        let author = author.clone();
        let genre = genre.clone();
        
        async move {
            // Update the singleton manuscript
            db_service.execute_with_cache(
                &app,
                "UPDATE manuscripts SET title = ?, author = ?, genre = ?, updated_at = ? WHERE id = 'singleton-manuscript'",
                &[
                    title,
                    author.unwrap_or_default(),
                    genre.unwrap_or_default(),
                    now.to_string(),
                ]
            ).await
        }
    }, RetryConfig::default()).await?;
    
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn get_scenes_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>
) -> Result<Value, AppError> {
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        
        async move {
            // Get all scenes for the singleton manuscript
            db_service.execute_with_cache(
                &app,
                "SELECT id, title, raw_text, word_count, chapter_number, scene_number_in_chapter, index_in_manuscript, pov_character, location, created_at, updated_at FROM scenes ORDER BY index_in_manuscript",
                &[]
            ).await
        }
    }, RetryConfig::default()).await?;
    
    Ok(result)
}

#[tauri::command]
pub async fn update_scene_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    scene_id: String,
    updates: Value
) -> Result<Value, AppError> {
    validate_scene_id(&scene_id)?;
    
    let now = chrono::Utc::now().timestamp_millis();
    
    // Extract and validate updates
    let title = updates.get("title").and_then(|v| v.as_str());
    let raw_text = updates.get("raw_text").and_then(|v| v.as_str());
    
    if let Some(text) = raw_text {
        if text.len() > 500_000 {
            return Err(AppError::validation_field(
                "Scene text too large (max 500KB)",
                "raw_text",
                &format!("{} chars", text.len())
            ));
        }
    }
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let scene_id = scene_id.clone();
        let title = title.map(|s| s.to_string());
        let raw_text = raw_text.map(|s| s.to_string());
        
        async move {
            if let Some(text) = &raw_text {
                let word_count = text.split_whitespace().count() as i32;
                db_service.execute_with_cache(
                    &app,
                    "UPDATE scenes SET raw_text = ?, word_count = ?, updated_at = ? WHERE id = ?",
                    &[
                        text.clone(),
                        word_count.to_string(),
                        now.to_string(),
                        scene_id.clone()
                    ]
                ).await?;
            }
            
            if let Some(title_text) = &title {
                db_service.execute_with_cache(
                    &app,
                    "UPDATE scenes SET title = ?, updated_at = ? WHERE id = ?",
                    &[
                        title_text.clone(),
                        now.to_string(),
                        scene_id.clone()
                    ]
                ).await?;
            }
            
            Ok::<(), AppError>(())
        }
    }, RetryConfig::default()).await?;
    
    Ok(serde_json::json!({ "success": true }))
}

#[tauri::command]
pub async fn create_scene_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    title: String,
    content: String,
    chapter_number: Option<i32>,
    pov_character: Option<String>
) -> Result<Value, AppError> {
    // Validate input
    if content.len() > 500_000 {
        return Err(AppError::validation_field(
            "Scene content too large (max 500KB)",
            "content",
            &format!("{} chars", content.len())
        ));
    }
    
    let scene_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    let word_count = content.split_whitespace().count() as i32;
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let scene_id = scene_id.clone();
        let title = title.clone();
        let content = content.clone();
        let pov_character = pov_character.clone();
        
        async move {
            // Get the next index
            let index_result = db_service.execute_with_cache(
                &app,
                "SELECT COALESCE(MAX(index_in_manuscript), -1) + 1 as next_index FROM scenes",
                &[]
            ).await?;
            
            let next_index = 0; // TODO: Parse from index_result
            
            db_service.execute_with_cache(
                &app,
                "INSERT INTO scenes (id, index_in_manuscript, title, raw_text, word_count, chapter_number, pov_character, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                &[
                    scene_id.clone(),
                    next_index.to_string(),
                    title,
                    content,
                    word_count.to_string(),
                    chapter_number.map(|n| n.to_string()).unwrap_or_default(),
                    pov_character.unwrap_or_default(),
                    now.to_string(),
                    now.to_string(),
                ]
            ).await?;
            
            Ok::<String, AppError>(scene_id)
        }
    }, RetryConfig::default()).await?;
    
    Ok(serde_json::json!({ "id": result }))
}

#[tauri::command]
pub async fn delete_scene_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    scene_id: String
) -> Result<Value, AppError> {
    validate_scene_id(&scene_id)?;
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let scene_id = scene_id.clone();
        
        async move {
            db_service.execute_with_cache(
                &app,
                "DELETE FROM scenes WHERE id = ?",
                &[scene_id]
            ).await
        }
    }, RetryConfig::default()).await?;
    
    Ok(serde_json::json!({ "success": true }))
}

// Add error logging command for frontend
#[tauri::command]
pub async fn get_recent_errors(
    app: AppHandle,
    limit: Option<usize>
) -> Result<Value, AppError> {
    let error_logger = ErrorLogger::new();
    let errors = error_logger.get_recent_errors(limit.unwrap_or(50))
        .map_err(|e| AppError::file_system(
            format!("Failed to read error log: {}", e),
            "read_error_log"
        ))?;
    
    Ok(serde_json::to_value(errors)
        .map_err(|e| AppError::internal(format!("Failed to serialize errors: {}", e)))?)
}