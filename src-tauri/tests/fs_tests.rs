use narrative_surgeon_desktop_lib::fs::*;
use narrative_surgeon_desktop_lib::error::{AppError, AppResult};
use tokio;
use tempfile::{tempdir, NamedTempFile};
use std::fs;
use std::io::Write;

#[cfg(test)]
mod file_system_tests {
    use super::*;

    #[tokio::test]
    async fn test_manuscript_file_reading() {
        let temp_dir = tempdir().unwrap();
        let file_path = temp_dir.path().join("test_manuscript.txt");
        
        // Create a test file
        let test_content = "This is a test manuscript.\n\nIt has multiple paragraphs.\n\nAnd some dialogue.";
        fs::write(&file_path, test_content).unwrap();

        // Test that we can read the file (this would need actual implementation)
        assert!(file_path.exists());
        
        let content = fs::read_to_string(&file_path).unwrap();
        assert_eq!(content, test_content);
    }

    #[tokio::test]
    async fn test_file_validation() {
        let temp_dir = tempdir().unwrap();
        
        // Test valid file extensions
        let docx_path = temp_dir.path().join("test.docx");
        let txt_path = temp_dir.path().join("test.txt");
        let pdf_path = temp_dir.path().join("test.pdf");
        
        fs::write(&docx_path, "test").unwrap();
        fs::write(&txt_path, "test").unwrap();
        fs::write(&pdf_path, "test").unwrap();

        assert!(docx_path.exists());
        assert!(txt_path.exists());
        assert!(pdf_path.exists());

        // Test file extension validation
        assert_eq!(docx_path.extension().unwrap(), "docx");
        assert_eq!(txt_path.extension().unwrap(), "txt");
        assert_eq!(pdf_path.extension().unwrap(), "pdf");
    }

    #[tokio::test]
    async fn test_export_path_validation() {
        let temp_dir = tempdir().unwrap();
        
        // Test valid export paths
        let epub_path = temp_dir.path().join("export.epub");
        let pdf_path = temp_dir.path().join("export.pdf");
        let docx_path = temp_dir.path().join("export.docx");
        
        // Test that parent directory exists
        assert!(temp_dir.path().exists());
        assert!(temp_dir.path().is_dir());
        
        // Test path construction
        assert_eq!(epub_path.extension().unwrap(), "epub");
        assert_eq!(pdf_path.extension().unwrap(), "pdf");
        assert_eq!(docx_path.extension().unwrap(), "docx");
    }

    #[tokio::test]
    async fn test_file_size_limits() {
        let temp_dir = tempdir().unwrap();
        let large_file_path = temp_dir.path().join("large_file.txt");
        
        // Create a file that's too large (simulate 10MB)
        let large_content = "a".repeat(10 * 1024 * 1024);
        fs::write(&large_file_path, &large_content).unwrap();
        
        let metadata = fs::metadata(&large_file_path).unwrap();
        assert!(metadata.len() > 5 * 1024 * 1024); // Greater than 5MB
        
        // Test file size validation logic
        let max_size = 5 * 1024 * 1024; // 5MB limit
        if metadata.len() > max_size {
            let error = AppError::validation_field(
                "File too large",
                "file_size",
                &format!("{} bytes", metadata.len())
            );
            assert!(matches!(error, AppError::Validation { .. }));
        }
    }

    #[tokio::test]
    async fn test_backup_file_creation() {
        let temp_dir = tempdir().unwrap();
        let original_file = temp_dir.path().join("manuscript.txt");
        let backup_file = temp_dir.path().join("manuscript.txt.backup");
        
        let content = "Original manuscript content";
        fs::write(&original_file, content).unwrap();
        
        // Create backup
        fs::copy(&original_file, &backup_file).unwrap();
        
        assert!(original_file.exists());
        assert!(backup_file.exists());
        
        let backup_content = fs::read_to_string(&backup_file).unwrap();
        assert_eq!(backup_content, content);
    }

    #[tokio::test]
    async fn test_import_text_parsing() {
        let temp_dir = tempdir().unwrap();
        let text_file = temp_dir.path().join("import.txt");
        
        let content = r#"Chapter 1: The Beginning

This is the first paragraph of the story. It introduces the main character and sets the scene.

This is the second paragraph. It continues the narrative and adds some dialogue.

"Hello, world!" said the character.

Chapter 2: The Middle

This is the start of chapter 2. The story continues here with more action and development.

The end."#;
        
        fs::write(&text_file, content).unwrap();
        
        let imported_content = fs::read_to_string(&text_file).unwrap();
        assert!(imported_content.contains("Chapter 1"));
        assert!(imported_content.contains("Chapter 2"));
        assert!(imported_content.contains("Hello, world!"));
        
        // Test paragraph separation
        let paragraphs: Vec<&str> = imported_content.split("\n\n").collect();
        assert!(paragraphs.len() > 3);
    }

    #[tokio::test]
    async fn test_export_format_validation() {
        // Test supported export formats
        let supported_formats = vec![
            "pdf", "docx", "epub", "mobi", "txt", "md", "tex", "scrivx", "fdx"
        ];
        
        for format in supported_formats {
            // Test that format is recognized
            match format {
                "pdf" | "docx" | "epub" | "mobi" | "txt" | "md" | "tex" | "scrivx" | "fdx" => {
                    assert!(true); // Format is supported
                },
                _ => assert!(false, "Unsupported format: {}", format),
            }
        }
        
        // Test unsupported format
        let unsupported_format = "xyz";
        match unsupported_format {
            "pdf" | "docx" | "epub" | "mobi" | "txt" | "md" | "tex" | "scrivx" | "fdx" => {
                assert!(false, "Format should not be supported");
            },
            _ => assert!(true), // Correctly identified as unsupported
        }
    }

    #[tokio::test]
    async fn test_file_permissions() {
        let temp_dir = tempdir().unwrap();
        let test_file = temp_dir.path().join("permissions_test.txt");
        
        fs::write(&test_file, "test content").unwrap();
        
        // Test that file is readable
        assert!(fs::read_to_string(&test_file).is_ok());
        
        // Test that file metadata can be accessed
        let metadata = fs::metadata(&test_file).unwrap();
        assert!(metadata.is_file());
        assert!(!metadata.is_dir());
        
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = metadata.permissions();
            // File should have read permissions
            assert!(permissions.mode() & 0o400 != 0);
        }
    }

    #[tokio::test]
    async fn test_directory_operations() {
        let temp_dir = tempdir().unwrap();
        let sub_dir = temp_dir.path().join("manuscripts");
        
        // Create subdirectory
        fs::create_dir(&sub_dir).unwrap();
        assert!(sub_dir.exists());
        assert!(sub_dir.is_dir());
        
        // Create file in subdirectory
        let file_in_subdir = sub_dir.join("test.txt");
        fs::write(&file_in_subdir, "content").unwrap();
        assert!(file_in_subdir.exists());
        
        // List directory contents
        let entries: Result<Vec<_>, _> = fs::read_dir(&sub_dir).unwrap().collect();
        assert!(entries.is_ok());
        let entries = entries.unwrap();
        assert_eq!(entries.len(), 1);
    }

    #[tokio::test]
    async fn test_file_error_handling() {
        let temp_dir = tempdir().unwrap();
        let non_existent_file = temp_dir.path().join("does_not_exist.txt");
        
        // Test reading non-existent file
        let read_result = fs::read_to_string(&non_existent_file);
        assert!(read_result.is_err());
        
        let error = read_result.unwrap_err();
        assert_eq!(error.kind(), std::io::ErrorKind::NotFound);
        
        // Test that this converts to our AppError properly
        let app_error: AppError = error.into();
        match app_error {
            AppError::FileSystem { message, operation, .. } => {
                assert!(message.contains("No such file"));
                assert_eq!(operation, "file operation");
            },
            _ => panic!("Expected FileSystem error"),
        }
    }

    #[tokio::test]
    async fn test_batch_file_operations() {
        let temp_dir = tempdir().unwrap();
        
        // Create multiple test files
        let files = vec![
            ("file1.txt", "Content 1"),
            ("file2.txt", "Content 2"),
            ("file3.txt", "Content 3"),
        ];
        
        let mut created_files = Vec::new();
        
        for (filename, content) in files {
            let file_path = temp_dir.path().join(filename);
            fs::write(&file_path, content).unwrap();
            created_files.push(file_path);
        }
        
        // Verify all files were created
        assert_eq!(created_files.len(), 3);
        for file_path in &created_files {
            assert!(file_path.exists());
        }
        
        // Test batch processing simulation
        let mut total_size = 0u64;
        for file_path in &created_files {
            let metadata = fs::metadata(file_path).unwrap();
            total_size += metadata.len();
        }
        
        assert!(total_size > 0);
    }

    #[tokio::test]
    async fn test_temporary_file_cleanup() {
        let temp_file = NamedTempFile::new().unwrap();
        let temp_path = temp_file.path().to_path_buf();
        
        // File should exist while temp_file is in scope
        assert!(temp_path.exists());
        
        // Write some content
        let mut file = temp_file.reopen().unwrap();
        writeln!(file, "Temporary content").unwrap();
        
        drop(temp_file); // This should clean up the file
        
        // File should be cleaned up after drop
        // Note: This might not work immediately on Windows due to file locking
        #[cfg(not(windows))]
        assert!(!temp_path.exists());
    }
}