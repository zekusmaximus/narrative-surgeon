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