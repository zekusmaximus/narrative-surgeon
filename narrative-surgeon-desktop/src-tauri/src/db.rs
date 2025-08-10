use anyhow::Result;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_sql::{Migration, MigrationKind};
use uuid::Uuid;

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

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../migrations/001_initial.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[tauri::command]
pub async fn get_manuscripts(app: AppHandle) -> Result<Vec<Manuscript>, String> {
    let db = tauri_plugin_sql::Builder::default()
        .build()
        .initialize(&app)
        .await
        .map_err(|e| e.to_string())?;

    let manuscripts = db
        .execute("SELECT * FROM manuscripts ORDER BY updated_at DESC")
        .await
        .map_err(|e| e.to_string())?;

    // Convert the raw result to our Manuscript struct
    // This is a simplified conversion - you'll need to implement proper parsing
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