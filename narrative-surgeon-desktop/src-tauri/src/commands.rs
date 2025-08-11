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
pub fn validate_manuscript_id(id: &str) -> AppResult<()> {
    if id.is_empty() {
        return Err(AppError::validation_field(
            "Manuscript ID cannot be empty",
            "manuscript_id", 
            id
        ));
    }
    
    if !uuid::Uuid::parse_str(id).is_ok() {
        return Err(AppError::validation_field(
            "Invalid manuscript ID format",
            "manuscript_id",
            id
        ));
    }
    
    Ok(())
}

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

pub fn validate_manuscript_title(title: &str) -> AppResult<()> {
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
#[tauri::command]
pub async fn get_manuscripts_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>
) -> Result<Value, AppError> {
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        
        async move {
            db_service.execute_with_cache(
                &app,
                "SELECT id, title, author, genre, created_at, updated_at, total_word_count FROM manuscripts ORDER BY updated_at DESC",
                &[]
            ).await
        }
    }, RetryConfig::default()).await?;
    
    Ok(result)
}

#[tauri::command]
pub async fn create_manuscript_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    title: String,
    text: String,
    metadata: Option<Value>
) -> Result<Value, AppError> {
    // Validate input
    validate_manuscript_title(&title)?;
    
    if text.len() > 1_000_000 {
        return Err(AppError::validation_field(
            "Text content too large (max 1MB)",
            "text",
            &format!("{} chars", text.len())
        ));
    }
    
    let manuscript_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    let word_count = text.split_whitespace().count() as i32;
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let manuscript_id = manuscript_id.clone();
        let title = title.clone();
        let text = text.clone();
        
        async move {
            // Insert manuscript
            db_service.execute_with_cache(
                &app,
                "INSERT INTO manuscripts (id, title, created_at, updated_at, total_word_count) VALUES (?, ?, ?, ?, ?)",
                &[
                    manuscript_id.clone(),
                    title.clone(),
                    now.to_string(),
                    now.to_string(),
                    word_count.to_string(),
                ]
            ).await?;
            
            // Create initial scene
            let scene_id = uuid::Uuid::new_v4().to_string();
            db_service.execute_with_cache(
                &app,
                "INSERT INTO scenes (id, manuscript_id, index_in_manuscript, title, raw_text, word_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                &[
                    scene_id,
                    manuscript_id.clone(),
                    "0".to_string(),
                    "Opening Scene".to_string(),
                    text,
                    word_count.to_string(),
                    now.to_string(),
                    now.to_string(),
                ]
            ).await?;
            
            Ok::<String, AppError>(manuscript_id)
        }
    }, RetryConfig::default()).await?;
    
    Ok(serde_json::json!({ "id": result }))
}

#[tauri::command]
pub async fn get_scenes_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    manuscript_id: String
) -> Result<Value, AppError> {
    validate_manuscript_id(&manuscript_id)?;
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let manuscript_id = manuscript_id.clone();
        
        async move {
            db_service.execute_with_cache(
                &app,
                "SELECT id, manuscript_id, title, raw_text, word_count, index_in_manuscript, created_at, updated_at FROM scenes WHERE manuscript_id = ? ORDER BY index_in_manuscript",
                &[manuscript_id]
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
pub async fn delete_manuscript_safe(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    manuscript_id: String
) -> Result<Value, AppError> {
    validate_manuscript_id(&manuscript_id)?;
    
    let result = retry_with_backoff(|| {
        let app = app.clone();
        let db_service = db_service.inner().clone();
        let manuscript_id = manuscript_id.clone();
        
        async move {
            // Delete scenes first (foreign key constraint)
            db_service.execute_with_cache(
                &app,
                "DELETE FROM scenes WHERE manuscript_id = ?",
                &[manuscript_id.clone()]
            ).await?;
            
            // Delete manuscript
            let result = db_service.execute_with_cache(
                &app,
                "DELETE FROM manuscripts WHERE id = ?",
                &[manuscript_id]
            ).await?;
            
            Ok::<Value, AppError>(result)
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