use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use docx_rs::*;
use pulldown_cmark::{Parser, html};
use html2md::parse_html;
use regex::Regex;
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileImportResult {
    pub filename: String,
    pub content: String,
    pub word_count: u32,
    pub format: String,
    pub chapters: Vec<ChapterInfo>,
    pub metadata: FileMetadata,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub title: String,
    pub content: String,
    pub word_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub author: Option<String>,
    pub title: Option<String>,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub has_formatting: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
}

#[tauri::command]
pub async fn import_manuscript_file(app: AppHandle, file_path: String) -> Result<FileImportResult, String> {
    let path = Path::new(&file_path);
    
    // Validate file exists
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    // Get file extension
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    // Read file content based on format
    let (content, metadata) = match extension.as_str() {
        "txt" => {
            let content = read_text_file(&app, &file_path).await?;
            let metadata = FileMetadata {
                author: None,
                title: None,
                created: None,
                modified: None,
                has_formatting: false,
            };
            (content, metadata)
        }
        "md" | "markdown" => {
            let content = read_markdown_file(&app, &file_path).await?;
            let metadata = FileMetadata {
                author: None,
                title: None,
                created: None,
                modified: None,
                has_formatting: true,
            };
            (content, metadata)
        }
        "docx" => {
            let content = read_docx_file(&app, &file_path).await?;
            let metadata = extract_docx_metadata(&file_path).await?;
            (content, metadata)
        }
        "doc" => {
            let content = read_doc_file(&app, &file_path).await?;
            let metadata = FileMetadata {
                author: None,
                title: None,
                created: None,
                modified: None,
                has_formatting: false,
            };
            (content, metadata)
        }
        "rtf" => {
            let content = read_rtf_file(&app, &file_path).await?;
            let metadata = FileMetadata {
                author: None,
                title: None,
                created: None,
                modified: None,
                has_formatting: true,
            };
            (content, metadata)
        }
        _ => return Err("Unsupported file format. Supported formats: .txt, .md, .docx, .doc, .rtf".to_string()),
    };

    // Count words
    let word_count = count_words(&content);

    // Get filename
    let filename = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Detect chapters
    let chapters = detect_chapters(&content);

    Ok(FileImportResult {
        filename,
        content,
        word_count,
        format: extension,
        chapters,
        metadata,
    })
}

async fn read_text_file(_app: &AppHandle, file_path: &str) -> Result<String, String> {
    tokio::fs::read_to_string(file_path)
        .await
        .map_err(|e| format!("Failed to read text file: {}", e))
}

async fn read_docx_file(_app: &AppHandle, file_path: &str) -> Result<String, String> {
    let file_bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| format!("Failed to read DOCX file: {}", e))?;

    let docx = read_docx(&file_bytes)
        .map_err(|e| format!("Failed to parse DOCX: {}", e))?;

    let mut content = String::new();

    for document_child in docx.document.children {
        if let DocumentChild::Paragraph(paragraph) = document_child {
            let mut para_text = String::new();

            for child in paragraph.children {
                if let ParagraphChild::Run(run) = child {
                    for run_child in run.children {
                        match run_child {
                            RunChild::Text(text) => para_text.push_str(&text.text),
                            RunChild::Tab(_) => para_text.push('\t'),
                            RunChild::Break(_) => para_text.push('\n'),
                            _ => {}
                        }
                    }
                }
            }

            if !para_text.trim().is_empty() {
                content.push_str(&format!("<p>{}</p>\n\n", para_text.trim()));
            }
        }
    }

    Ok(content)
}

async fn read_doc_file(app: &AppHandle, file_path: &str) -> Result<String, String> {
    // Placeholder for .doc file reading
    Err("DOC import not yet implemented - use a .txt file for now".to_string())
}

async fn read_rtf_file(app: &AppHandle, file_path: &str) -> Result<String, String> {
    let rtf_content = tokio::fs::read_to_string(file_path)
        .await
        .map_err(|e| format!("Failed to read RTF file: {}", e))?;

    // Simple RTF parser - extract text content
    let cleaned_text = extract_rtf_text_simple(&rtf_content);
    Ok(format_as_html_paragraphs(&cleaned_text))
}

fn extract_rtf_text_simple(rtf_content: &str) -> String {
    // Remove RTF control codes and extract plain text
    let mut text = String::new();
    let mut in_control = false;
    let mut control_word = String::new();
    
    for ch in rtf_content.chars() {
        match ch {
            '\\' => {
                if !in_control {
                    in_control = true;
                    control_word.clear();
                }
            }
            ' ' | '\n' | '\r' => {
                if in_control {
                    in_control = false;
                    // Handle specific control words
                    if control_word == "par" {
                        text.push('\n');
                    } else if control_word == "tab" {
                        text.push('\t');
                    }
                    control_word.clear();
                } else {
                    text.push(ch);
                }
            }
            '{' | '}' => {
                in_control = false;
                control_word.clear();
                // Ignore RTF group markers
            }
            _ => {
                if in_control {
                    control_word.push(ch);
                } else {
                    text.push(ch);
                }
            }
        }
    }
    
    // Clean up the text
    clean_rtf_text(&text)
}

fn clean_rtf_text(text: &str) -> String {
    // Remove RTF control codes and clean up spacing
    let re = Regex::new(r"\{\*?\\[^{}]*\}").unwrap();
    let cleaned = re.replace_all(text, "");
    
    // Clean up excessive whitespace
    let re_whitespace = Regex::new(r"\s+").unwrap();
    re_whitespace.replace_all(&cleaned, " ").trim().to_string()
}

fn format_as_html_paragraphs(text: &str) -> String {
    text.split('\n')
        .filter(|line| !line.trim().is_empty())
        .map(|line| format!("<p>{}</p>", line.trim()))
        .collect::<Vec<_>>()
        .join("\n\n")
}

async fn read_markdown_file(app: &AppHandle, file_path: &str) -> Result<String, String> {
    let markdown_content = tokio::fs::read_to_string(file_path)
        .await
        .map_err(|e| format!("Failed to read Markdown file: {}", e))?;

    // Convert Markdown to HTML for consistent storage
    let parser = Parser::new(&markdown_content);
    let mut html_content = String::new();
    html::push_html(&mut html_content, parser);
    
    Ok(html_content)
}

async fn extract_docx_metadata(file_path: &str) -> Result<FileMetadata, String> {
    let file_bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| format!("Failed to read DOCX file for metadata: {}", e))?;

    let docx = read_docx(&file_bytes)
        .map_err(|e| format!("Failed to parse DOCX for metadata: {}", e))?;

    // Extract metadata from DOCX properties if available
    // This is a simplified implementation
    Ok(FileMetadata {
        author: None, // Would extract from docx.core_properties if available
        title: None,  // Would extract from docx.core_properties if available
        created: None,
        modified: None,
        has_formatting: true,
    })
}

fn detect_chapters(content: &str) -> Vec<ChapterInfo> {
    let mut chapters = Vec::new();
    
    // Look for chapter markers (headings, "Chapter", etc.)
    let chapter_regex = Regex::new(r"(?i)(?m)^(?:<h[1-3][^>]*>)?(chapter\s+\d+|part\s+\d+|\d+\.)(?:</h[1-3]>)?").unwrap();
    
    let mut last_end = 0;
    let mut chapter_number = 1;
    
    for cap in chapter_regex.find_iter(content) {
        // If this isn't the first chapter, save the previous one
        if last_end > 0 {
            let chapter_content = &content[last_end..cap.start()].trim();
            if !chapter_content.is_empty() {
                chapters.push(ChapterInfo {
                    title: format!("Chapter {}", chapter_number - 1),
                    content: chapter_content.to_string(),
                    word_count: count_words(chapter_content),
                });
            }
        }
        
        last_end = cap.start();
        chapter_number += 1;
    }
    
    // Add the last chapter
    if last_end < content.len() {
        let chapter_content = &content[last_end..].trim();
        if !chapter_content.is_empty() {
            chapters.push(ChapterInfo {
                title: format!("Chapter {}", chapter_number - 1),
                content: chapter_content.to_string(),
                word_count: count_words(chapter_content),
            });
        }
    }
    
    // If no chapters were detected, treat the whole content as one chapter
    if chapters.is_empty() && !content.trim().is_empty() {
        chapters.push(ChapterInfo {
            title: "Full Text".to_string(),
            content: content.to_string(),
            word_count: count_words(content),
        });
    }
    
    chapters
}

fn count_words(text: &str) -> u32 {
    // Remove HTML tags for accurate word counting
    let re = Regex::new(r"<[^>]*>").unwrap();
    let clean_text = re.replace_all(text, "");
    clean_text.split_whitespace().count() as u32
}

#[tauri::command]
pub async fn export_manuscript(
    app: AppHandle,
    content: String,
    file_path: String,
    format: String,
) -> Result<(), String> {
    match format.as_str() {
        "txt" => {
            // Convert HTML to plain text
            let plain_text = html_to_plain_text(&content);
            tokio::fs::write(&file_path, plain_text)
                .await
                .map_err(|e| format!("Failed to export as text: {}", e))?;
        }
        "md" | "markdown" => {
            // Convert HTML to Markdown
            let markdown = parse_html(&content);
            tokio::fs::write(&file_path, markdown)
                .await
                .map_err(|e| format!("Failed to export as Markdown: {}", e))?;
        }
        "html" => {
            // Export as HTML with proper styling
            let styled_html = format!(
                r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Manuscript</title>
    <style>
        body {{ 
            font-family: 'Times New Roman', serif; 
            line-height: 2.0; 
            max-width: 8.5in; 
            margin: 0 auto; 
            padding: 1in; 
        }}
        p {{ text-indent: 2em; margin-bottom: 1em; }}
        h1, h2, h3 {{ text-align: center; margin: 2em 0; text-indent: 0; }}
        .scene-break {{ text-align: center; margin: 2em 0; }}
    </style>
</head>
<body>
{}
</body>
</html>"#,
                content
            );
            tokio::fs::write(&file_path, styled_html)
                .await
                .map_err(|e| format!("Failed to export as HTML: {}", e))?;
        }
        "docx" => {
            // Create a basic DOCX file
            export_as_docx(&content, &file_path).await?;
        }
        _ => {
            return Err("Unsupported export format. Supported: txt, md, html, docx".to_string());
        }
    }

    Ok(())
}

async fn export_as_docx(content: &str, file_path: &str) -> Result<(), String> {
    // Create a new DOCX document
    let mut docx = Docx::new();
    
    // Parse HTML content and convert to DOCX paragraphs
    let re = Regex::new(r"<(/?)(\w+)[^>]*>").unwrap();
    let mut current_text = String::new();
    let mut in_bold = false;
    let mut in_italic = false;
    let mut in_heading = false;
    
    // Split content by HTML tags and process
    let parts: Vec<&str> = re.split(content).collect();
    let mut tag_iter = re.find_iter(content);
    
    for (i, part) in parts.iter().enumerate() {
        if i > 0 {
            if let Some(tag_match) = tag_iter.next() {
                let tag = tag_match.as_str();
                
                // Process tag
                if tag.contains("<p") {
                    // Start of paragraph - add previous content if any
                    if !current_text.trim().is_empty() {
                        let mut para = Paragraph::new();
                        let mut run = Run::new();
                        run = run.add_text(&current_text);
                        if in_bold { run = run.bold(); }
                        if in_italic { run = run.italic(); }
                        para = para.add_run(run);
                        if in_heading { para = para.style("Heading1"); }
                        docx = docx.add_paragraph(para);
                    }
                    current_text.clear();
                } else if tag == "</p>" {
                    // End of paragraph
                    if !current_text.trim().is_empty() {
                        let mut para = Paragraph::new();
                        let mut run = Run::new();
                        run = run.add_text(&current_text);
                        if in_bold { run = run.bold(); }
                        if in_italic { run = run.italic(); }
                        para = para.add_run(run);
                        if in_heading { para = para.style("Heading1"); }
                        docx = docx.add_paragraph(para);
                    }
                    current_text.clear();
                } else if tag == "<strong>" {
                    in_bold = true;
                } else if tag == "</strong>" {
                    in_bold = false;
                } else if tag == "<em>" {
                    in_italic = true;
                } else if tag == "</em>" {
                    in_italic = false;
                } else if tag.starts_with("<h") {
                    in_heading = true;
                } else if tag.starts_with("</h") {
                    in_heading = false;
                }
            }
        }
        
        current_text.push_str(part);
    }
    
    // Add any remaining content
    if !current_text.trim().is_empty() {
        let mut para = Paragraph::new();
        let mut run = Run::new();
        run = run.add_text(&current_text);
        if in_bold { run = run.bold(); }
        if in_italic { run = run.italic(); }
        para = para.add_run(run);
        docx = docx.add_paragraph(para);
    }
    
    // Write to file
    let docx_bytes = docx.build();
    
    tokio::fs::write(file_path, &docx_bytes)
        .await
        .map_err(|e| format!("Failed to write DOCX file: {}", e))?;
    
    Ok(())
}

fn html_to_plain_text(html: &str) -> String {
    // Remove HTML tags and convert to plain text
    let re = Regex::new(r"<[^>]*>").unwrap();
    let text = re.replace_all(html, "");
    
    // Clean up spacing and line breaks
    let re_space = Regex::new(r"\s+").unwrap();
    let cleaned = re_space.replace_all(&text, " ");
    
    // Add proper paragraph breaks
    let re_para = Regex::new(r"</p>\s*<p>").unwrap();
    re_para.replace_all(&cleaned, "\n\n").trim().to_string()
}

#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Manuscript Files", &["txt", "docx", "doc", "rtf", "md", "markdown"])
        .add_filter("Text Files", &["txt"])
        .add_filter("Word Documents", &["docx", "doc"])
        .add_filter("Rich Text", &["rtf"])
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("All Files", &["*"])
        .set_title("Import Manuscript")
        .pick_file(move |p| {
            let _ = tx.send(p.map(|path| path.to_path_buf()));
        });

    let selected = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    Ok(selected.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    default_name: String,
    format: String
) -> Result<Option<String>, String> {
    let mut dialog = app.dialog().file();
    
    // Set appropriate filter based on format
    match format.as_str() {
        "txt" => { dialog = dialog.add_filter("Text Files", &["txt"]); }
        "docx" => { dialog = dialog.add_filter("Word Documents", &["docx"]); }
        "md" | "markdown" => { dialog = dialog.add_filter("Markdown Files", &["md"]); }
        "html" => { dialog = dialog.add_filter("HTML Files", &["html"]); }
        _ => { dialog = dialog.add_filter("All Files", &["*"]); }
    }

    let (tx, rx) = tokio::sync::oneshot::channel();

    dialog
        .set_title("Export Manuscript")
        .set_file_name(&default_name)
        .save_file(move |p| {
            let _ = tx.send(p.map(|path| path.to_path_buf()));
        });

    let selected = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    Ok(selected.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn batch_import_files(app: AppHandle) -> Result<Vec<FileImportResult>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .add_filter("Manuscript Files", &["txt", "docx", "doc", "rtf", "md", "markdown"])
        .set_title("Import Multiple Manuscripts")
        .pick_files(move |paths| {
            let _ = tx.send(paths.map(|v| v.into_iter().map(|p| p.to_path_buf()).collect::<Vec<_>>()));
        });

    let paths_opt = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    let mut results = Vec::new();

    if let Some(paths) = paths_opt {
        for path in paths {
            match import_manuscript_file(app.clone(), path.to_string_lossy().to_string()).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    eprintln!("Failed to import {}: {}", path.display(), e);
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn backup_manuscript(
    _app: AppHandle,
    manuscript_id: String,
    content: String,
) -> Result<String, String> {
    // Create a timestamped backup file
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("backup_{}_{}.txt", manuscript_id, timestamp);

    // Ensure backup directory exists and write file
    let backup_dir = "backups";
    tokio::fs::create_dir_all(backup_dir)
        .await
        .map_err(|e| format!("Failed to ensure backup directory: {}", e))?;

    let backup_path = format!("{}/{}", backup_dir, backup_name);

    tokio::fs::write(&backup_path, content)
        .await
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path)
}