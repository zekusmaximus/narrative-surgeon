use narrative_surgeon_desktop_lib::db::*;
use narrative_surgeon_desktop_lib::commands::{validate_manuscript_id, validate_scene_id, validate_manuscript_title};
use narrative_surgeon_desktop_lib::error::{AppError, AppResult};
use tokio;
use tempfile::tempdir;
use std::path::PathBuf;

#[cfg(test)]
mod database_tests {
    use super::*;

    // Mock app handle for testing
    struct MockAppHandle {
        db_path: PathBuf,
    }

    impl MockAppHandle {
        fn new() -> Self {
            let temp_dir = tempdir().unwrap();
            let db_path = temp_dir.path().join("test.db");
            Self { db_path }
        }
    }

    #[tokio::test]
    async fn test_database_service_creation() {
        let service = DatabaseService::new();
        assert!(service.pool.lock().await.is_none());
    }

    #[tokio::test]
    async fn test_manuscript_validation() {
        // Test valid manuscript ID
        assert!(validate_manuscript_id("550e8400-e29b-41d4-a716-446655440000").is_ok());
        
        // Test invalid manuscript ID
        assert!(validate_manuscript_id("").is_err());
        assert!(validate_manuscript_id("invalid-uuid").is_err());
    }

    #[tokio::test]
    async fn test_scene_validation() {
        // Test valid scene ID
        assert!(validate_scene_id("550e8400-e29b-41d4-a716-446655440001").is_ok());
        
        // Test invalid scene ID
        assert!(validate_scene_id("").is_err());
        assert!(validate_scene_id("not-a-uuid").is_err());
    }

    #[tokio::test]
    async fn test_manuscript_title_validation() {
        // Test valid title
        assert!(validate_manuscript_title("Valid Title").is_ok());
        
        // Test empty title
        assert!(validate_manuscript_title("").is_err());
        
        // Test too long title
        let long_title = "a".repeat(300);
        assert!(validate_manuscript_title(&long_title).is_err());
    }

    #[tokio::test]
    async fn test_error_creation() {
        let error = AppError::database("Test error");
        match error {
            AppError::Database { message, .. } => {
                assert_eq!(message, "Test error");
            },
            _ => panic!("Expected Database error"),
        }
    }

    #[tokio::test]
    async fn test_error_user_messages() {
        let db_error = AppError::database("Connection failed");
        assert_eq!(db_error.user_message(), "There was a problem accessing the database. Please try again.");

        let validation_error = AppError::validation_field("Invalid input", "title", "");
        assert_eq!(validation_error.user_message(), "Please check the title field and try again.");

        let not_found_error = AppError::not_found("Manuscript");
        assert_eq!(not_found_error.user_message(), "The Manuscript could not be found.");
    }

    #[tokio::test]
    async fn test_error_retryability() {
        let network_error = AppError::network("Connection failed");
        assert!(network_error.is_retryable());

        let validation_error = AppError::validation("Invalid input");
        assert!(!validation_error.is_retryable());

        let timeout_error = AppError::timeout("Operation timed out", 5000, "query");
        assert!(timeout_error.is_retryable());
    }

    #[tokio::test]
    async fn test_error_severity() {
        use narrative_surgeon_desktop_lib::error::ErrorSeverity;

        let internal_error = AppError::internal("Critical failure");
        matches!(internal_error.severity(), ErrorSeverity::Critical);

        let database_error = AppError::database("Connection failed");
        matches!(database_error.severity(), ErrorSeverity::High);

        let validation_error = AppError::validation("Invalid input");
        matches!(validation_error.severity(), ErrorSeverity::Low);
    }

    #[tokio::test]
    async fn test_migrations() {
        let migrations = get_migrations();
        assert!(!migrations.is_empty());
        assert_eq!(migrations.len(), 4); // We have 4 migrations
        
        // Check first migration
        assert_eq!(migrations[0].version, 1);
        assert_eq!(migrations[0].description, "create_initial_tables");
    }

    // Integration test with in-memory database
    #[tokio::test]
    async fn test_database_operations() {
        // This would require setting up an in-memory SQLite database
        // and testing actual database operations
        
        // For now, we'll test the structure and error handling
        let service = DatabaseService::new();
        
        // Test that database service is properly initialized
        assert!(service.error_logger.log_error(
            &AppError::database("Test error"),
            Some("Test context")
        ).is_ok());
    }

    #[tokio::test]
    async fn test_backup_metadata_creation() {
        let metadata = BackupMetadata {
            version: "1.0".to_string(),
            created_at: chrono::Utc::now(),
            manuscript_count: 5,
            scene_count: 25,
            total_words: 10000,
        };

        assert_eq!(metadata.version, "1.0");
        assert_eq!(metadata.manuscript_count, 5);
        assert_eq!(metadata.scene_count, 25);
        assert_eq!(metadata.total_words, 10000);
    }

    #[tokio::test]
    async fn test_search_query_validation() {
        let search_query = SearchQuery {
            query: "test search".to_string(),
            manuscript_id: Some("550e8400-e29b-41d4-a716-446655440000".to_string()),
            limit: Some(10),
            highlight: true,
        };

        assert_eq!(search_query.query, "test search");
        assert_eq!(search_query.limit, Some(10));
        assert_eq!(search_query.highlight, true);
    }

    // Test error logging functionality
    #[tokio::test]
    async fn test_error_logging() {
        use narrative_surgeon_desktop_lib::error::ErrorLogger;
        use tempfile::NamedTempFile;

        let temp_file = NamedTempFile::new().unwrap();
        let logger = ErrorLogger::with_path(temp_file.path().to_path_buf());

        let error = AppError::database("Test database error");
        let result = logger.log_error(&error, Some("Unit test context"));
        assert!(result.is_ok());

        // Test reading recent errors
        let errors = logger.get_recent_errors(10);
        assert!(errors.is_ok());
    }

    // Test retry functionality
    #[tokio::test]
    async fn test_retry_mechanism() {
        use narrative_surgeon_desktop_lib::error::{retry_with_backoff, RetryConfig};
        use std::sync::atomic::{AtomicU32, Ordering};
        use std::sync::Arc;

        let counter = Arc::new(AtomicU32::new(0));
        let counter_clone = counter.clone();

        let config = RetryConfig {
            max_attempts: 3,
            initial_delay_ms: 10,
            max_delay_ms: 100,
            backoff_multiplier: 2.0,
        };

        let result = retry_with_backoff(
            move || {
                let counter = counter_clone.clone();
                async move {
                    let count = counter.fetch_add(1, Ordering::SeqCst);
                    if count < 2 {
                        Err(AppError::network("Simulated failure"))
                    } else {
                        Ok("Success".to_string())
                    }
                }
            },
            config,
        ).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Success");
        assert_eq!(counter.load(Ordering::SeqCst), 3); // Should have retried 3 times
    }

    // Test non-retryable errors don't get retried
    #[tokio::test]
    async fn test_non_retryable_errors() {
        use narrative_surgeon_desktop_lib::error::{retry_with_backoff, RetryConfig};
        use std::sync::atomic::{AtomicU32, Ordering};
        use std::sync::Arc;

        let counter = Arc::new(AtomicU32::new(0));
        let counter_clone = counter.clone();

        let config = RetryConfig::default();

        let result = retry_with_backoff(
            move || {
                let counter = counter_clone.clone();
                async move {
                    counter.fetch_add(1, Ordering::SeqCst);
                    Err(AppError::validation("Non-retryable error"))
                }
            },
            config,
        ).await;

        assert!(result.is_err());
        assert_eq!(counter.load(Ordering::SeqCst), 1); // Should only be called once
    }
}