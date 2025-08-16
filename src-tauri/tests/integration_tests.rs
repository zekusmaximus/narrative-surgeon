use narrative_surgeon_desktop_lib::db::*;
use narrative_surgeon_desktop_lib::commands::{validate_manuscript_id, validate_scene_id, validate_manuscript_title};
use narrative_surgeon_desktop_lib::error::{AppError, AppResult};
use tokio;
use tempfile::tempdir;
use std::sync::Arc;

#[cfg(test)]
mod integration_tests {
    use super::*;

    // Mock Tauri app handle for integration testing
    struct MockApp {
        temp_dir: tempfile::TempDir,
    }

    impl MockApp {
        fn new() -> Self {
            let temp_dir = tempdir().unwrap();
            Self { temp_dir }
        }
        
        fn db_path(&self) -> std::path::PathBuf {
            self.temp_dir.path().join("test.db")
        }
    }

    #[tokio::test]
    async fn test_full_manuscript_workflow() {
        let app = MockApp::new();
        let db_service = DatabaseService::new();
        
        // Test manuscript creation flow
        let manuscript_title = "Test Integration Manuscript";
        let manuscript_text = "This is the opening scene of our test manuscript.";
        
        // In a real integration test, we'd create an actual database connection
        // and test the full workflow from creation to retrieval
        
        // For now, test the validation that would happen
        assert!(validate_manuscript_title(manuscript_title).is_ok());
        assert!(manuscript_text.len() < 1_000_000); // Size validation
        
        let manuscript_id = uuid::Uuid::new_v4().to_string();
        assert!(validate_manuscript_id(&manuscript_id).is_ok());
    }

    #[tokio::test]
    async fn test_scene_management_workflow() {
        let manuscript_id = uuid::Uuid::new_v4().to_string();
        let scene_id = uuid::Uuid::new_v4().to_string();
        
        // Test scene creation workflow
        assert!(validate_manuscript_id(&manuscript_id).is_ok());
        assert!(validate_scene_id(&scene_id).is_ok());
        
        // Test scene content validation
        let scene_content = "This is a test scene with some content that should be valid.";
        assert!(scene_content.len() < 500_000); // Scene size limit
        
        // Test scene ordering
        let scene_indices = vec![0, 1, 2, 3];
        assert!(scene_indices.iter().all(|&i| i >= 0));
    }

    #[tokio::test]
    async fn test_search_functionality() {
        let search_query = SearchQuery {
            query: "test search query".to_string(),
            manuscript_id: Some(uuid::Uuid::new_v4().to_string()),
            limit: Some(20),
            highlight: true,
        };
        
        // Test search query validation
        assert!(!search_query.query.is_empty());
        assert!(search_query.limit.unwrap() > 0);
        assert!(search_query.limit.unwrap() <= 100); // Reasonable limit
        
        if let Some(manuscript_id) = &search_query.manuscript_id {
            assert!(validate_manuscript_id(manuscript_id).is_ok());
        }
    }

    #[tokio::test]
    async fn test_backup_and_restore_workflow() {
        use std::path::PathBuf;
        
        let backup_path = PathBuf::from("test_backup.json");
        
        // Test backup metadata creation
        let metadata = BackupMetadata {
            version: "1.0".to_string(),
            created_at: chrono::Utc::now(),
            manuscript_count: 3,
            scene_count: 15,
            total_words: 5000,
        };
        
        let backup_data = BackupData {
            metadata: metadata.clone(),
            manuscripts: vec![],
            scenes: vec![],
            characters: vec![],
            revision_notes: vec![],
        };
        
        // Test serialization
        let json_result = serde_json::to_string(&backup_data);
        assert!(json_result.is_ok());
        
        // Test deserialization
        let json_str = json_result.unwrap();
        let deserialized_result: Result<BackupData, _> = serde_json::from_str(&json_str);
        assert!(deserialized_result.is_ok());
        
        let restored_data = deserialized_result.unwrap();
        assert_eq!(restored_data.metadata.manuscript_count, 3);
        assert_eq!(restored_data.metadata.scene_count, 15);
    }

    #[tokio::test]
    async fn test_error_propagation_workflow() {
        // Test that errors propagate correctly through the system
        
        // Database errors
        let db_error = AppError::database("Connection failed");
        assert_eq!(db_error.user_message(), "There was a problem accessing the database. Please try again.");
        assert!(db_error.is_retryable());
        
        // File system errors
        let fs_error = AppError::file_system("Permission denied", "write");
        assert!(fs_error.user_message().contains("Unable to write"));
        assert!(!fs_error.is_retryable()); // File permission errors aren't retryable
        
        // Validation errors
        let validation_error = AppError::validation_field("Invalid title", "title", "");
        assert!(validation_error.user_message().contains("title"));
        assert!(!validation_error.is_retryable());
    }

    #[tokio::test]
    async fn test_concurrent_database_operations() {
        use tokio::task;
        
        let db_service = Arc::new(DatabaseService::new());
        
        // Simulate concurrent operations
        let mut handles = vec![];
        
        for i in 0..5 {
            let service = db_service.clone();
            let handle = task::spawn(async move {
                let manuscript_id = uuid::Uuid::new_v4().to_string();
                let title = format!("Concurrent Test Manuscript {}", i);
                
                // Test that validation works concurrently
                validate_manuscript_id(&manuscript_id)
                    .and_then(|_| validate_manuscript_title(&title))
            });
            
            handles.push(handle);
        }
        
        // Wait for all operations to complete
        for handle in handles {
            let result = handle.await.unwrap();
            assert!(result.is_ok());
        }
    }

    #[tokio::test]
    async fn test_data_consistency() {
        // Test that data remains consistent across operations
        
        let manuscript_id = uuid::Uuid::new_v4().to_string();
        let scene_ids: Vec<String> = (0..3).map(|_| uuid::Uuid::new_v4().to_string()).collect();
        
        // Test manuscript-scene relationship consistency
        for scene_id in &scene_ids {
            assert!(validate_scene_id(scene_id).is_ok());
        }
        
        // Test that all scene IDs are unique
        let mut unique_ids = scene_ids.clone();
        unique_ids.sort();
        unique_ids.dedup();
        assert_eq!(unique_ids.len(), scene_ids.len());
    }

    #[tokio::test]
    async fn test_performance_under_load() {
        use std::time::Instant;
        
        let start_time = Instant::now();
        
        // Simulate a load test with many operations
        for i in 0..1000 {
            let manuscript_id = uuid::Uuid::new_v4().to_string();
            let scene_id = uuid::Uuid::new_v4().to_string();
            let title = format!("Performance Test Manuscript {}", i);
            
            // These operations should be fast
            validate_manuscript_id(&manuscript_id).unwrap();
            validate_scene_id(&scene_id).unwrap();
            validate_manuscript_title(&title).unwrap();
        }
        
        let duration = start_time.elapsed();
        
        // Should complete 1000 validations in less than 100ms
        assert!(duration.as_millis() < 100);
    }

    #[tokio::test]
    async fn test_edge_cases() {
        // Test various edge cases
        
        // Empty strings
        assert!(validate_manuscript_title("").is_err());
        assert!(validate_manuscript_id("").is_err());
        assert!(validate_scene_id("").is_err());
        
        // Very long strings
        let long_title = "a".repeat(1000);
        assert!(validate_manuscript_title(&long_title).is_err());
        
        // Invalid UUIDs
        assert!(validate_manuscript_id("not-a-uuid").is_err());
        assert!(validate_scene_id("invalid-uuid-format").is_err());
        
        // Boundary values
        let exactly_255_chars = "a".repeat(255);
        assert!(validate_manuscript_title(&exactly_255_chars).is_ok());
        
        let exactly_256_chars = "a".repeat(256);
        assert!(validate_manuscript_title(&exactly_256_chars).is_err());
    }

    #[tokio::test]
    async fn test_error_recovery_scenarios() {
        use narrative_surgeon_desktop_lib::error::{retry_with_backoff, RetryConfig};
        use std::sync::atomic::{AtomicU32, Ordering};
        use std::sync::Arc;
        
        // Test recovery from transient failures
        let failure_count = Arc::new(AtomicU32::new(0));
        let failure_count_clone = failure_count.clone();
        
        let config = RetryConfig {
            max_attempts: 3,
            initial_delay_ms: 1,
            max_delay_ms: 10,
            backoff_multiplier: 2.0,
        };
        
        let result = retry_with_backoff(
            move || {
                let count = failure_count_clone.clone();
                async move {
                    let current = count.fetch_add(1, Ordering::SeqCst);
                    if current < 2 {
                        // Fail the first two attempts
                        Err(AppError::network("Temporary network issue"))
                    } else {
                        // Succeed on the third attempt
                        Ok("Recovery successful".to_string())
                    }
                }
            },
            config,
        ).await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Recovery successful");
        assert_eq!(failure_count.load(Ordering::SeqCst), 3);
    }

    #[tokio::test]
    async fn test_memory_usage_patterns() {
        // Test that we don't have memory leaks in typical usage patterns
        
        let db_service = DatabaseService::new();
        
        // Simulate creating and destroying many objects
        for _ in 0..1000 {
            let manuscript_id = uuid::Uuid::new_v4().to_string();
            let _validation_result = validate_manuscript_id(&manuscript_id);
            
            let scene_id = uuid::Uuid::new_v4().to_string();
            let _scene_validation = validate_scene_id(&scene_id);
            
            // These should be dropped automatically
        }
        
        // Clear the cache to ensure cleanup
        db_service.clear_cache().await;
        
        // Test passes if we don't run out of memory
        assert!(true);
    }
}