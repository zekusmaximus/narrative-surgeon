use serde::{Deserialize, Serialize};
use std::fmt;
use thiserror::Error;
use chrono::{DateTime, Utc};
use std::fs::OpenOptions;
use std::io::Write;
use std::path::PathBuf;

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum AppError {
    #[error("Database error: {message}")]
    Database { 
        message: String, 
        code: Option<String>,
        query: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("File system error: {message}")]
    FileSystem { 
        message: String, 
        path: Option<PathBuf>,
        operation: String,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Network error: {message}")]
    Network { 
        message: String, 
        url: Option<String>,
        status_code: Option<u16>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Validation error: {message}")]
    Validation { 
        message: String, 
        field: Option<String>,
        value: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Export error: {message}")]
    Export { 
        message: String, 
        format: String,
        path: Option<PathBuf>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Window management error: {message}")]
    Window { 
        message: String, 
        window_label: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Permission error: {message}")]
    Permission { 
        message: String, 
        required_permission: String,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Configuration error: {message}")]
    Configuration { 
        message: String, 
        setting: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Resource not found: {resource}")]
    NotFound { 
        resource: String, 
        id: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Resource conflict: {message}")]
    Conflict { 
        message: String, 
        resource: String,
        existing_id: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Rate limit exceeded: {message}")]
    RateLimit { 
        message: String, 
        retry_after: Option<u64>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Timeout error: {message}")]
    Timeout { 
        message: String, 
        timeout_ms: u64,
        operation: String,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
    
    #[error("Internal error: {message}")]
    Internal { 
        message: String, 
        error_code: Option<String>,
        #[serde(with = "chrono::serde::ts_milliseconds")]
        timestamp: DateTime<Utc>,
    },
}

impl AppError {
    pub fn database<S: Into<String>>(message: S) -> Self {
        Self::Database {
            message: message.into(),
            code: None,
            query: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn database_with_query<S: Into<String>>(message: S, query: S) -> Self {
        Self::Database {
            message: message.into(),
            code: None,
            query: Some(query.into()),
            timestamp: Utc::now(),
        }
    }
    
    pub fn file_system<S: Into<String>>(message: S, operation: S) -> Self {
        Self::FileSystem {
            message: message.into(),
            path: None,
            operation: operation.into(),
            timestamp: Utc::now(),
        }
    }
    
    pub fn file_system_with_path<S: Into<String>>(message: S, operation: S, path: PathBuf) -> Self {
        Self::FileSystem {
            message: message.into(),
            path: Some(path),
            operation: operation.into(),
            timestamp: Utc::now(),
        }
    }
    
    pub fn network<S: Into<String>>(message: S) -> Self {
        Self::Network {
            message: message.into(),
            url: None,
            status_code: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn network_with_status<S: Into<String>>(message: S, status_code: u16) -> Self {
        Self::Network {
            message: message.into(),
            url: None,
            status_code: Some(status_code),
            timestamp: Utc::now(),
        }
    }
    
    pub fn validation<S: Into<String>>(message: S) -> Self {
        Self::Validation {
            message: message.into(),
            field: None,
            value: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn validation_field<S: Into<String>>(message: S, field: S, value: S) -> Self {
        Self::Validation {
            message: message.into(),
            field: Some(field.into()),
            value: Some(value.into()),
            timestamp: Utc::now(),
        }
    }
    
    pub fn export<S: Into<String>>(message: S, format: S) -> Self {
        Self::Export {
            message: message.into(),
            format: format.into(),
            path: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn not_found<S: Into<String>>(resource: S) -> Self {
        Self::NotFound {
            resource: resource.into(),
            id: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn not_found_with_id<S: Into<String>>(resource: S, id: S) -> Self {
        Self::NotFound {
            resource: resource.into(),
            id: Some(id.into()),
            timestamp: Utc::now(),
        }
    }
    
    pub fn internal<S: Into<String>>(message: S) -> Self {
        Self::Internal {
            message: message.into(),
            error_code: None,
            timestamp: Utc::now(),
        }
    }
    
    pub fn timeout<S: Into<String>>(message: S, timeout_ms: u64, operation: S) -> Self {
        Self::Timeout {
            message: message.into(),
            timeout_ms,
            operation: operation.into(),
            timestamp: Utc::now(),
        }
    }
    
    // Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        match self {
            AppError::Network { status_code, .. } => {
                if let Some(code) = status_code {
                    *code >= 500 || *code == 429 // Server errors and rate limits
                } else {
                    true // Network connectivity issues
                }
            },
            AppError::Database { .. } => true, // Database connection issues
            AppError::FileSystem { .. } => false, // File system errors rarely retryable
            AppError::Timeout { .. } => true,
            AppError::RateLimit { .. } => true,
            AppError::Internal { .. } => false,
            _ => false,
        }
    }
    
    // Get suggested retry delay in milliseconds
    pub fn retry_delay_ms(&self) -> Option<u64> {
        match self {
            AppError::RateLimit { retry_after, .. } => Some(retry_after.unwrap_or(1000)),
            AppError::Network { .. } => Some(1000),
            AppError::Database { .. } => Some(500),
            AppError::Timeout { .. } => Some(2000),
            _ => None,
        }
    }
    
    // Get user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            AppError::Database { .. } => {
                "There was a problem accessing the database. Please try again.".to_string()
            },
            AppError::FileSystem { operation, .. } => {
                format!("Unable to {} the file. Please check file permissions and try again.", operation)
            },
            AppError::Network { .. } => {
                "Network connection problem. Please check your internet connection.".to_string()
            },
            AppError::Validation { field, .. } => {
                if let Some(field_name) = field {
                    format!("Please check the {} field and try again.", field_name)
                } else {
                    "Please check your input and try again.".to_string()
                }
            },
            AppError::Export { format, .. } => {
                format!("Unable to export as {}. Please try a different format.", format)
            },
            AppError::NotFound { resource, .. } => {
                format!("The {} could not be found.", resource)
            },
            AppError::Permission { required_permission, .. } => {
                format!("Permission required: {}. Please check your access rights.", required_permission)
            },
            AppError::Timeout { operation, .. } => {
                format!("The {} operation timed out. Please try again.", operation)
            },
            AppError::RateLimit { .. } => {
                "Too many requests. Please wait a moment and try again.".to_string()
            },
            _ => "An unexpected error occurred. Please try again.".to_string(),
        }
    }
    
    // Get error severity level
    pub fn severity(&self) -> ErrorSeverity {
        match self {
            AppError::Internal { .. } => ErrorSeverity::Critical,
            AppError::Database { .. } => ErrorSeverity::High,
            AppError::FileSystem { .. } => ErrorSeverity::High,
            AppError::Permission { .. } => ErrorSeverity::High,
            AppError::Network { .. } => ErrorSeverity::Medium,
            AppError::Validation { .. } => ErrorSeverity::Low,
            AppError::NotFound { .. } => ErrorSeverity::Low,
            AppError::RateLimit { .. } => ErrorSeverity::Low,
            _ => ErrorSeverity::Medium,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ErrorSeverity {
    Low,
    Medium,
    High,
    Critical,
}

// Enhanced Result type with error context
pub type AppResult<T> = std::result::Result<T, AppError>;

// Error logger
pub struct ErrorLogger {
    log_path: PathBuf,
}

impl ErrorLogger {
    pub fn new() -> Self {
        let mut log_path = std::env::temp_dir();
        log_path.push("narrative_surgeon_errors.log");
        
        Self { log_path }
    }
    
    pub fn with_path(log_path: PathBuf) -> Self {
        Self { log_path }
    }
    
    pub fn log_error(&self, error: &AppError, context: Option<&str>) -> Result<(), std::io::Error> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)?;
            
        let log_entry = ErrorLogEntry {
            timestamp: Utc::now(),
            error: error.clone(),
            context: context.map(|s| s.to_string()),
            severity: error.severity(),
        };
        
        writeln!(file, "{}", serde_json::to_string(&log_entry).unwrap_or_else(|_| {
            format!("[{}] ERROR: {}", log_entry.timestamp.format("%Y-%m-%d %H:%M:%S"), error)
        }))?;
        
        Ok(())
    }
    
    pub fn get_recent_errors(&self, limit: usize) -> Result<Vec<ErrorLogEntry>, std::io::Error> {
        let content = std::fs::read_to_string(&self.log_path)?;
        let lines: Vec<&str> = content.lines().rev().take(limit).collect();
        
        let mut errors = Vec::new();
        for line in lines {
            if let Ok(entry) = serde_json::from_str::<ErrorLogEntry>(line) {
                errors.push(entry);
            }
        }
        
        errors.reverse();
        Ok(errors)
    }
    
    pub fn clear_logs(&self) -> Result<(), std::io::Error> {
        std::fs::write(&self.log_path, "")?;
        Ok(())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorLogEntry {
    #[serde(with = "chrono::serde::ts_milliseconds")]
    pub timestamp: DateTime<Utc>,
    pub error: AppError,
    pub context: Option<String>,
    pub severity: ErrorSeverity,
}

// Convert from common error types
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::file_system(error.to_string(), "file operation")
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        AppError::validation(format!("JSON parsing error: {}", error))
    }
}

impl From<tauri_plugin_sql::Error> for AppError {
    fn from(error: tauri_plugin_sql::Error) -> Self {
        AppError::database(error.to_string())
    }
}

// Retry utility
pub struct RetryConfig {
    pub max_attempts: u32,
    pub initial_delay_ms: u64,
    pub max_delay_ms: u64,
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_ms: 1000,
            max_delay_ms: 10000,
            backoff_multiplier: 2.0,
        }
    }
}

pub async fn retry_with_backoff<F, T, Fut>(
    operation: F,
    config: RetryConfig,
) -> AppResult<T>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = AppResult<T>>,
{
    let mut last_error = None;
    let mut delay_ms = config.initial_delay_ms;
    
    for attempt in 1..=config.max_attempts {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(error) => {
                last_error = Some(error.clone());
                
                if attempt < config.max_attempts && error.is_retryable() {
                    let actual_delay = error.retry_delay_ms().unwrap_or(delay_ms);
                    tokio::time::sleep(tokio::time::Duration::from_millis(actual_delay)).await;
                    delay_ms = (delay_ms as f64 * config.backoff_multiplier).min(config.max_delay_ms as f64) as u64;
                } else {
                    break;
                }
            }
        }
    }
    
    Err(last_error.unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_error_creation() {
        let error = AppError::database("Connection failed");
        assert!(matches!(error, AppError::Database { .. }));
        assert_eq!(error.user_message(), "There was a problem accessing the database. Please try again.");
    }
    
    #[test]
    fn test_error_retryable() {
        let network_error = AppError::network_with_status("Server error", 500);
        assert!(network_error.is_retryable());
        
        let validation_error = AppError::validation("Invalid input");
        assert!(!validation_error.is_retryable());
    }
    
    #[tokio::test]
    async fn test_retry_logic() {
        let mut attempts = 0;
        let result = retry_with_backoff(|| {
            attempts += 1;
            async move {
                if attempts < 3 {
                    Err(AppError::network("Connection failed"))
                } else {
                    Ok("Success".to_string())
                }
            }
        }, RetryConfig::default()).await;
        
        assert!(result.is_ok());
        assert_eq!(attempts, 3);
    }
}