use crate::error::{AppError, AppResult, ErrorLogger, retry_with_backoff, RetryConfig};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::collections::HashMap;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_sql::{Migration, MigrationKind, Database};
use uuid::Uuid;
use tokio::sync::Mutex;
use chrono::{DateTime, Utc};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct Manuscript {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub target_audience: Option<String>,
    pub comp_titles: Option<String>, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
    pub total_word_count: i32,
    pub opening_strength_score: Option<i32>,
    pub hook_effectiveness: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    pub manuscript_id: String,
    pub chapter_number: Option<i32>,
    pub scene_number_in_chapter: Option<i32>,
    pub index_in_manuscript: i32,
    pub title: Option<String>,
    pub raw_text: String,
    pub word_count: i32,
    pub is_opening: bool,
    pub is_chapter_end: bool,
    pub opens_with_hook: bool,
    pub ends_with_hook: bool,
    pub pov_character: Option<String>,
    pub location: Option<String>,
    pub time_marker: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    pub manuscript_id: String,
    pub name: String,
    pub role: Option<String>,
    pub first_appearance_scene_id: Option<String>,
    pub voice_sample: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RevisionNote {
    pub id: String,
    pub scene_id: String,
    pub r#type: Option<String>, // 'type' is a reserved keyword in Rust
    pub content: String,
    pub resolved: bool,
    pub created_at: i64,
}

// Database connection pool and service
#[derive(Clone)]
pub struct DatabaseService {
    pub pool: Arc<Mutex<Option<Database>>>,
    pub query_cache: Arc<Mutex<HashMap<String, String>>>,
    pub error_logger: Arc<ErrorLogger>,
}

impl DatabaseService {
    pub fn new() -> Self {
        Self {
            pool: Arc::new(Mutex::new(None)),
            query_cache: Arc::new(Mutex::new(HashMap::new())),
            error_logger: Arc::new(ErrorLogger::new()),
        }
    }

    pub async fn get_connection(&self, app: &AppHandle) -> AppResult<Database> {
        let mut pool = self.pool.lock().await;
        
        if pool.is_none() {
            let db = retry_with_backoff(|| {
                let app = app.clone();
                async move {
                    tauri_plugin_sql::Builder::default()
                        .add_migrations(
                            "sqlite:narrative_surgeon.db",
                            get_migrations()
                        )
                        .build()
                        .initialize(&app)
                        .await
                        .map_err(|e| AppError::database(format!("Failed to initialize database: {}", e)))
                }
            }, RetryConfig::default()).await?;
            
            // Configure database pragmas with retry logic
            retry_with_backoff(|| {
                let db = db.clone();
                async move {
                    // Enable WAL mode for better concurrent access
                    db.execute("PRAGMA journal_mode=WAL", &[])
                        .await
                        .map_err(|e| AppError::database_with_query(
                            format!("Failed to set WAL mode: {}", e),
                            "PRAGMA journal_mode=WAL"
                        ))?;
                    
                    // Set synchronous mode for better performance
                    db.execute("PRAGMA synchronous=NORMAL", &[])
                        .await
                        .map_err(|e| AppError::database_with_query(
                            format!("Failed to set synchronous mode: {}", e),
                            "PRAGMA synchronous=NORMAL"
                        ))?;
                    
                    // Set cache size (10MB)
                    db.execute("PRAGMA cache_size=10000", &[])
                        .await
                        .map_err(|e| AppError::database_with_query(
                            format!("Failed to set cache size: {}", e),
                            "PRAGMA cache_size=10000"
                        ))?;
                    
                    // Enable foreign keys
                    db.execute("PRAGMA foreign_keys=ON", &[])
                        .await
                        .map_err(|e| AppError::database_with_query(
                            format!("Failed to enable foreign keys: {}", e),
                            "PRAGMA foreign_keys=ON"
                        ))?;
                    
                    Ok::<(), AppError>(())
                }
            }, RetryConfig::default()).await?;
            
            *pool = Some(db);
        }
        
        Ok(pool.as_ref().unwrap().clone())
    }

    pub async fn execute_with_cache(&self, app: &AppHandle, sql: &str, params: &[String]) -> AppResult<serde_json::Value> {
        let cache_key = format!("{}:{:?}", sql, params);
        
        // Check cache for SELECT queries
        if sql.trim().to_uppercase().starts_with("SELECT") {
            let cache = self.query_cache.lock().await;
            if let Some(cached_result) = cache.get(&cache_key) {
                return serde_json::from_str(cached_result)
                    .map_err(|e| AppError::internal(format!("Failed to parse cached result: {}", e)));
            }
        }
        
        let result = retry_with_backoff(|| {
            let app = app.clone();
            let sql = sql.to_string();
            let params = params.to_vec();
            let service = self.clone();
            
            async move {
                let db = service.get_connection(&app).await?;
                db.execute(&sql, &params)
                    .await
                    .map_err(|e| {
                        let error = AppError::database_with_query(
                            format!("Query execution failed: {}", e),
                            sql.clone()
                        );
                        
                        // Log the error
                        if let Err(log_err) = service.error_logger.log_error(&error, Some("Database query execution")) {
                            eprintln!("Failed to log error: {}", log_err);
                        }
                        
                        error
                    })
            }
        }, RetryConfig::default()).await?;
        
        // Cache SELECT results
        if sql.trim().to_uppercase().starts_with("SELECT") {
            let mut cache = self.query_cache.lock().await;
            let serialized = serde_json::to_string(&result)
                .map_err(|e| AppError::internal(format!("Failed to serialize result for cache: {}", e)))?;
            cache.insert(cache_key, serialized);
        }
        
        Ok(result)
    }

    pub async fn clear_cache(&self) {
        let mut cache = self.query_cache.lock().await;
        cache.clear();
    }
}

// Full-text search service
#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub scene_id: String,
    pub manuscript_id: String,
    pub scene_title: Option<String>,
    pub matching_text: String,
    pub match_rank: f64,
    pub context_before: String,
    pub context_after: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub manuscript_id: Option<String>,
    pub limit: Option<i32>,
    pub highlight: bool,
}

// Backup and restore functionality
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub manuscript_count: i32,
    pub scene_count: i32,
    pub total_words: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupData {
    pub metadata: BackupMetadata,
    pub manuscripts: Vec<Manuscript>,
    pub scenes: Vec<Scene>,
    pub characters: Vec<Character>,
    pub revision_notes: Vec<RevisionNote>,
}

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_indexes_for_performance",
            sql: include_str!("../migrations/002_indexes.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_fts5_search_tables",
            sql: include_str!("../migrations/003_fts5_search.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_analytics_tables",
            sql: include_str!("../migrations/004_analytics.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[tauri::command]
pub async fn get_manuscripts(
    app: AppHandle,
    db_service: State<'_, DatabaseService>
) -> Result<Vec<Manuscript>, AppError> {
    let result = db_service.execute_with_cache(
        &app, 
        "SELECT * FROM manuscripts ORDER BY updated_at DESC",
        &[]
    ).await?;

    // Parse the result into Manuscript structs
    // In a real implementation, you would properly parse the JSON result
    // For now, return empty vector as placeholder
    Ok(vec![])
}

#[tauri::command]
pub async fn create_manuscript(
    app: AppHandle,
    title: String,
    text: String,
    metadata: Option<serde_json::Value>,
) -> Result<Manuscript, String> {
    let manuscript_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    // Parse scenes from text (simplified version)
    let word_count = text.split_whitespace().count() as i32;

    let manuscript = Manuscript {
        id: manuscript_id.clone(),
        title,
        author: None,
        genre: None,
        target_audience: None,
        comp_titles: None,
        created_at: now,
        updated_at: now,
        total_word_count: word_count,
        opening_strength_score: None,
        hook_effectiveness: None,
    };

    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    // Insert manuscript into database
    db.execute(
        "INSERT INTO manuscripts (id, title, created_at, updated_at, total_word_count) VALUES (?, ?, ?, ?, ?)",
        &[
            manuscript.id.clone(),
            manuscript.title.clone(),
            manuscript.created_at.to_string(),
            manuscript.updated_at.to_string(),
            manuscript.total_word_count.to_string(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(manuscript)
}

#[tauri::command]
pub async fn get_scenes(app: AppHandle, manuscript_id: String) -> Result<Vec<Scene>, String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    // This is a placeholder - implement proper scene retrieval
    Ok(vec![])
}

#[tauri::command]
pub async fn update_scene(
    app: AppHandle,
    scene_id: String,
    updates: serde_json::Value,
) -> Result<(), String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    // Implement scene update logic
    Ok(())
}

#[tauri::command]
pub async fn delete_manuscript(app: AppHandle, manuscript_id: String) -> Result<(), String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM manuscripts WHERE id = ?",
        &[manuscript_id],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn create_scene(
    app: AppHandle,
    manuscript_id: String,
    after_scene_id: Option<String>,
) -> Result<Scene, String> {
    let scene_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    // Determine the index for the new scene
    let index_in_manuscript = if let Some(after_id) = &after_scene_id {
        // Get the index of the scene we're inserting after
        let result = db
            .execute(
                "SELECT index_in_manuscript FROM scenes WHERE id = ?",
                &[after_id.clone()],
            )
            .await
            .map_err(|e| e.to_string())?;

        // This is simplified - you'd need to get the actual result and parse it
        // For now, we'll append to the end
        let count_result = db
            .execute(
                "SELECT COUNT(*) as count FROM scenes WHERE manuscript_id = ?",
                &[manuscript_id.clone()],
            )
            .await
            .map_err(|e| e.to_string())?;

        // Simplified - in real implementation you'd parse the count
        0 // This should be the actual count + 1
    } else {
        // Append to end
        let count_result = db
            .execute(
                "SELECT COUNT(*) as count FROM scenes WHERE manuscript_id = ?",
                &[manuscript_id.clone()],
            )
            .await
            .map_err(|e| e.to_string())?;

        0 // This should be the actual count
    };

    let new_scene = Scene {
        id: scene_id.clone(),
        manuscript_id: manuscript_id.clone(),
        chapter_number: Some(1), // Default to chapter 1
        scene_number_in_chapter: Some(1),
        index_in_manuscript: index_in_manuscript,
        title: Some("New Scene".to_string()),
        raw_text: "<p>Start writing here...</p>".to_string(),
        word_count: 0,
        is_opening: false,
        is_chapter_end: false,
        opens_with_hook: false,
        ends_with_hook: false,
        pov_character: None,
        location: None,
        time_marker: None,
        created_at: now,
        updated_at: now,
    };

    db.execute(
        "INSERT INTO scenes (id, manuscript_id, chapter_number, scene_number_in_chapter, index_in_manuscript, title, raw_text, word_count, is_opening, is_chapter_end, opens_with_hook, ends_with_hook, pov_character, location, time_marker, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        &[
            scene_id,
            manuscript_id,
            "1".to_string(),
            "1".to_string(),
            index_in_manuscript.to_string(),
            "New Scene".to_string(),
            "<p>Start writing here...</p>".to_string(),
            "0".to_string(),
            "0".to_string(),
            "0".to_string(),
            "0".to_string(),
            "0".to_string(),
            "".to_string(), // pov_character
            "".to_string(), // location
            "".to_string(), // time_marker
            now.to_string(),
            now.to_string(),
        ],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(new_scene)
}

#[tauri::command]
pub async fn delete_scene(app: AppHandle, scene_id: String) -> Result<(), String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    db.execute("DELETE FROM scenes WHERE id = ?", &[scene_id])
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn rename_scene(
    app: AppHandle,
    scene_id: String,
    new_title: String,
) -> Result<(), String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().timestamp_millis();

    db.execute(
        "UPDATE scenes SET title = ?, updated_at = ? WHERE id = ?",
        &[new_title, now.to_string(), scene_id],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn reorder_scenes(
    app: AppHandle,
    scene_ids: Vec<String>,
) -> Result<(), String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    let now = chrono::Utc::now().timestamp_millis();

    for (index, scene_id) in scene_ids.iter().enumerate() {
        db.execute(
            "UPDATE scenes SET index_in_manuscript = ?, updated_at = ? WHERE id = ?",
            &[index.to_string(), now.to_string(), scene_id.clone()],
        )
        .await
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Full-text search commands
#[tauri::command]
pub async fn search_content(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    search_query: SearchQuery,
) -> Result<Vec<SearchResult>, String> {
    let start_time = std::time::Instant::now();
    
    let mut sql = String::from("
        SELECT 
            s.id as scene_id,
            s.manuscript_id,
            s.title as scene_title,
            snippet(scenes_fts, 2, '<mark>', '</mark>', '...', 30) as matching_text,
            bm25(scenes_fts) as match_rank,
            substr(s.raw_text, max(1, scenes_fts.bm25 - 50), 50) as context_before,
            substr(s.raw_text, scenes_fts.bm25 + length(snippet(scenes_fts, 2, '', '', '', 0)), 50) as context_after
        FROM scenes_fts 
        JOIN scenes s ON s.id = scenes_fts.scene_id
        WHERE scenes_fts MATCH ?
    ");
    
    let mut params = vec![search_query.query.clone()];
    
    if let Some(manuscript_id) = &search_query.manuscript_id {
        sql.push_str(" AND s.manuscript_id = ?");
        params.push(manuscript_id.clone());
    }
    
    sql.push_str(" ORDER BY bm25(scenes_fts)");
    
    if let Some(limit) = search_query.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    } else {
        sql.push_str(" LIMIT 50");
    }
    
    let result = db_service
        .execute_with_cache(&app, &sql, &params)
        .await
        .map_err(|e| e.to_string())?;
    
    // Log search performance
    let execution_time = start_time.elapsed().as_millis() as i32;
    log_performance_metric(
        &app, 
        &db_service,
        "search", 
        search_query.manuscript_id.as_deref(),
        execution_time,
        true,
        None
    ).await?;
    
    // Parse results (simplified - in real implementation you'd properly parse the SQLite result)
    let results = vec![]; // This would be populated from the actual query result
    
    Ok(results)
}

#[tauri::command]
pub async fn create_database_backup(
    app: AppHandle,
    db_service: State<'_, DatabaseService>,
    backup_path: PathBuf,
) -> Result<BackupMetadata, String> {
    let start_time = std::time::Instant::now();
    
    // Get all data
    let manuscripts_result = db_service
        .execute_with_cache(&app, "SELECT * FROM manuscripts", &[])
        .await
        .map_err(|e| e.to_string())?;
    let scenes_result = db_service
        .execute_with_cache(&app, "SELECT * FROM scenes", &[])
        .await
        .map_err(|e| e.to_string())?;
    let characters_result = db_service
        .execute_with_cache(&app, "SELECT * FROM characters", &[])
        .await
        .map_err(|e| e.to_string())?;
    let notes_result = db_service
        .execute_with_cache(&app, "SELECT * FROM revision_notes", &[])
        .await
        .map_err(|e| e.to_string())?;
    
    // Create backup metadata
    let metadata = BackupMetadata {
        version: "1.0".to_string(),
        created_at: Utc::now(),
        manuscript_count: 0, // Would be parsed from results
        scene_count: 0,      // Would be parsed from results
        total_words: 0,      // Would be calculated
    };
    
    let backup_data = BackupData {
        metadata: metadata.clone(),
        manuscripts: vec![], // Would be populated from query results
        scenes: vec![],
        characters: vec![],
        revision_notes: vec![],
    };
    
    // Write backup to file
    let backup_json = serde_json::to_string_pretty(&backup_data).map_err(|e| e.to_string())?;
    std::fs::write(&backup_path, backup_json).map_err(|e| e.to_string())?;
    
    // Log performance
    let execution_time = start_time.elapsed().as_millis() as i32;
    log_performance_metric(&app, &db_service, "backup", None, execution_time, true, None).await?;
    
    Ok(metadata)
}

// Helper functions
async fn log_performance_metric(
    app: &AppHandle,
    db_service: &DatabaseService,
    operation_type: &str,
    manuscript_id: Option<&str>,
    execution_time_ms: i32,
    success: bool,
    error_message: Option<String>,
) -> Result<(), String> {
    let metric_id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    
    let sql = "
        INSERT INTO performance_metrics 
        (id, operation_type, manuscript_id, execution_time_ms, success, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ";
    
    let params = vec![
        metric_id,
        operation_type.to_string(),
        manuscript_id.unwrap_or("").to_string(),
        execution_time_ms.to_string(),
        if success { "1" } else { "0" }.to_string(),
        error_message.unwrap_or_default(),
        now.to_string(),
    ];
    
    db_service
        .execute_with_cache(app, sql, &params)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

fn calculate_productivity_score(words_added: i32, words_deleted: i32, time_active_ms: i32) -> f32 {
    if time_active_ms == 0 {
        return 0.0;
    }
    
    let net_words = words_added - words_deleted;
    let time_minutes = time_active_ms as f32 / 1000.0 / 60.0;
    let words_per_minute = net_words as f32 / time_minutes;
    
    // Normalize to 0-100 scale (assuming 20 WPM is perfect score)
    (words_per_minute / 20.0 * 100.0).min(100.0).max(0.0)
}