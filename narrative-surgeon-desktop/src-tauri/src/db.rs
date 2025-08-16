use serde::{Deserialize, Serialize};
use chrono::Utc;
use tauri::AppHandle;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Manuscript {
    pub id: String,
    pub title: String,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub target_audience: Option<String>,
    pub comp_titles: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub total_word_count: u32,
    pub opening_strength_score: Option<u32>,
    pub hook_effectiveness: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Scene {
    pub id: String,
    pub manuscript_id: String,
    pub chapter_number: Option<i32>,
    pub scene_number_in_chapter: Option<i32>,
    pub index_in_manuscript: u32,
    pub title: Option<String>,
    pub raw_text: String,
    pub word_count: u32,
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModuleStatus {
    pub scene_id: String,
    pub events_v: Option<String>,
    pub events_dirty: i32,
    pub plants_v: Option<String>,
    pub plants_dirty: i32,
    pub state_v: Option<String>,
    pub state_dirty: i32,
    pub beats_v: Option<String>,
    pub beats_dirty: i32,
    pub last_processed: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateModuleStatusRequest {
    pub scene_id: String,
    pub module: String,
    pub version: String,
    pub dirty: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchRequest {
    pub query: String,
    pub manuscript_id: Option<String>,
    pub case_sensitive: bool,
    pub whole_words: bool,
    pub regex: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub scene_id: String,
    pub scene_title: Option<String>,
    pub manuscript_id: String,
    pub manuscript_title: String,
    pub matches: Vec<SearchMatch>,
    pub total_matches: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchMatch {
    pub start_offset: u32,
    pub end_offset: u32,
    pub context_before: String,
    pub matched_text: String,
    pub context_after: String,
    pub line_number: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BatchSceneRequest {
    pub scenes: Vec<Scene>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderRequest {
    pub manuscript_id: String,
    pub scene_id: String,
    pub new_index: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RenameRequest {
    pub scene_id: String,
    pub new_title: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub backup_id: String,
    pub created_at: i64,
    pub manuscript_count: u32,
    pub total_scenes: u32,
    pub file_size: u64,
    pub compression_ratio: f32,
}

// Database service for managing connections and caching
pub struct DatabaseService {
    cache: Arc<RwLock<HashMap<String, (String, i64)>>>, // key -> (value, timestamp)
    database_url: String,
}

impl DatabaseService {
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            database_url: "sqlite:narrative_surgeon.db".to_string(),
        }
    }

    pub fn get_database_url(&self) -> &str {
        &self.database_url
    }

    // Cache management methods
    pub async fn get_cached_result(&self, key: &str) -> Option<String> {
        let cache = self.cache.read().await;
        if let Some((value, timestamp)) = cache.get(key) {
            // Cache for 5 minutes
            if Utc::now().timestamp() - timestamp < 300 {
                return Some(value.clone());
            }
        }
        None
    }

    pub async fn cache_result(&self, key: &str, value: &str) {
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), (value.to_string(), Utc::now().timestamp()));
        
        // Clean old entries if cache gets too large
        if cache.len() > 1000 {
            let cutoff = Utc::now().timestamp() - 300;
            cache.retain(|_, (_, timestamp)| *timestamp > cutoff);
        }
    }

    pub async fn invalidate_cache(&self, pattern: &str) {
        let mut cache = self.cache.write().await;
        cache.retain(|key, _| !key.contains(pattern));
    }
}

// Validation functions
fn _validate_manuscript(manuscript: &Manuscript) -> AppResult<()> {
    if manuscript.title.trim().is_empty() {
        return Err(AppError::validation_field(
            "Manuscript title cannot be empty",
            "title",
            &manuscript.title
        ));
    }
    
    if manuscript.title.len() > 500 {
        return Err(AppError::validation_field(
            "Manuscript title too long (max 500 characters)",
            "title",
            &manuscript.title
        ));
    }
    
    Ok(())
}

fn _validate_scene(scene: &Scene) -> AppResult<()> {
    if scene.raw_text.trim().is_empty() {
        return Err(AppError::validation_field(
            "Scene content cannot be empty",
            "raw_text",
            "empty"
        ));
    }
    
    if scene.raw_text.len() > 100_000 {
        return Err(AppError::validation_field(
            "Scene content too long (max 100,000 characters)",
            "raw_text",
            "too_long"
        ));
    }
    
    Ok(())
}

fn _calculate_word_count(text: &str) -> u32 {
    text.split_whitespace().count() as u32
}

// PLACEHOLDER IMPLEMENTATIONS - TODO: Replace with SQLx

// MANUSCRIPT CRUD OPERATIONS

pub async fn get_all_manuscripts_impl(_app: &AppHandle) -> AppResult<Vec<Manuscript>> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn get_manuscript_impl(_app: &AppHandle, _id: String) -> AppResult<Option<Manuscript>> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn create_manuscript_impl(_app: &AppHandle, _manuscript: Manuscript) -> AppResult<String> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn update_manuscript_impl(_app: &AppHandle, _manuscript: Manuscript) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn delete_manuscript_impl(_app: &AppHandle, _id: String) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

// SCENE CRUD OPERATIONS

pub async fn get_manuscript_scenes_impl(_app: &AppHandle, _manuscript_id: String) -> AppResult<Vec<Scene>> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn get_scene_impl(_app: &AppHandle, _id: String) -> AppResult<Option<Scene>> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn create_scene_impl(_app: &AppHandle, _scene: Scene) -> AppResult<String> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn update_scene_impl(_app: &AppHandle, _scene: Scene) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn delete_scene_impl(_app: &AppHandle, _id: String) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn rename_scene_impl(_app: &AppHandle, _request: RenameRequest) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn reorder_scenes_impl(_app: &AppHandle, _request: ReorderRequest) -> AppResult<()> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

// SEARCH AND UTILITY OPERATIONS

pub async fn search_content_impl(_app: &AppHandle, _request: SearchRequest) -> AppResult<Vec<SearchResult>> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn create_database_backup_impl(_app: &AppHandle) -> AppResult<BackupMetadata> {
    // TODO: Implement with SQLx
    Err(AppError::database("Database operations not yet implemented"))
}

// MODULE STATUS OPERATIONS

pub async fn get_dirty_scenes_impl(_app: &AppHandle) -> AppResult<Vec<String>> {
    // TODO: Implement with SQLx
    // Query: SELECT scene_id FROM module_status 
    //        WHERE events_dirty = 1 OR plants_dirty = 1 OR state_dirty = 1 OR beats_dirty = 1
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn get_module_status_impl(_app: &AppHandle, _scene_id: String) -> AppResult<Option<ModuleStatus>> {
    // TODO: Implement with SQLx
    // Query: SELECT * FROM module_status WHERE scene_id = ?
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn mark_modules_dirty_impl(_app: &AppHandle, _scene_id: String, _modules: Vec<String>) -> AppResult<()> {
    // TODO: Implement with SQLx
    // Update specific module dirty flags to 1 for the given scene
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn update_module_status_impl(_app: &AppHandle, _request: UpdateModuleStatusRequest) -> AppResult<()> {
    // TODO: Implement with SQLx
    // Update the specific module version and dirty flag
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn get_scene_content_impl(_app: &AppHandle, _scene_id: String) -> AppResult<Option<String>> {
    // TODO: Implement with SQLx
    // Query: SELECT raw_text FROM scenes WHERE id = ?
    Err(AppError::database("Database operations not yet implemented"))
}

pub async fn clear_all_dirty_flags_impl(_app: &AppHandle) -> AppResult<()> {
    // TODO: Implement with SQLx
    // Update: UPDATE module_status SET events_dirty = 0, plants_dirty = 0, state_dirty = 0, beats_dirty = 0
    Err(AppError::database("Database operations not yet implemented"))
}

// TAURI COMMAND WRAPPERS

#[tauri::command]
pub async fn get_all_manuscripts(app: AppHandle) -> Result<Vec<Manuscript>, String> {
    get_all_manuscripts_impl(&app).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_manuscript(app: AppHandle, id: String) -> Result<Option<Manuscript>, String> {
    get_manuscript_impl(&app, id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_manuscript(app: AppHandle, manuscript: Manuscript) -> Result<String, String> {
    create_manuscript_impl(&app, manuscript).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_manuscript(app: AppHandle, manuscript: Manuscript) -> Result<(), String> {
    update_manuscript_impl(&app, manuscript).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_manuscript(app: AppHandle, id: String) -> Result<(), String> {
    delete_manuscript_impl(&app, id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_manuscript_scenes(app: AppHandle, manuscript_id: String) -> Result<Vec<Scene>, String> {
    get_manuscript_scenes_impl(&app, manuscript_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scene(app: AppHandle, id: String) -> Result<Option<Scene>, String> {
    get_scene_impl(&app, id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_scene(app: AppHandle, scene: Scene) -> Result<String, String> {
    create_scene_impl(&app, scene).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_scene(app: AppHandle, scene: Scene) -> Result<(), String> {
    update_scene_impl(&app, scene).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_scene(app: AppHandle, id: String) -> Result<(), String> {
    delete_scene_impl(&app, id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn rename_scene(app: AppHandle, request: RenameRequest) -> Result<(), String> {
    rename_scene_impl(&app, request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn reorder_scenes(app: AppHandle, request: ReorderRequest) -> Result<(), String> {
    reorder_scenes_impl(&app, request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_content(app: AppHandle, request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    search_content_impl(&app, request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_database_backup(app: AppHandle) -> Result<BackupMetadata, String> {
    create_database_backup_impl(&app).await
        .map_err(|e| e.to_string())
}

// MODULE STATUS TAURI COMMANDS

#[tauri::command]
pub async fn get_dirty_scenes(app: AppHandle) -> Result<Vec<String>, String> {
    get_dirty_scenes_impl(&app).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_module_status(app: AppHandle, scene_id: String) -> Result<Option<ModuleStatus>, String> {
    get_module_status_impl(&app, scene_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mark_modules_dirty(app: AppHandle, scene_id: String, modules: Vec<String>) -> Result<(), String> {
    mark_modules_dirty_impl(&app, scene_id, modules).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_module_status(app: AppHandle, request: UpdateModuleStatusRequest) -> Result<(), String> {
    update_module_status_impl(&app, request).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scene_content(app: AppHandle, scene_id: String) -> Result<Option<String>, String> {
    get_scene_content_impl(&app, scene_id).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn clear_all_dirty_flags(app: AppHandle) -> Result<(), String> {
    clear_all_dirty_flags_impl(&app).await
        .map_err(|e| e.to_string())
}