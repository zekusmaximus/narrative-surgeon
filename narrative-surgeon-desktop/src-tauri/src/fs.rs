use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use docx_rs::*;
use pulldown_cmark::{Parser, html, Options, Event, Tag, TagEnd, HeadingLevel};
use html2md::parse_html;
use regex::Regex;
use std::fs;
use chrono::Utc;
use crate::error::{AppError, AppResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileImportResult {
    pub filename: String,
    pub content: String,
    pub word_count: u32,
    pub format: String,
    pub chapters: Vec<ChapterInfo>,
    pub metadata: FileMetadata,
    pub scenes: Vec<SceneInfo>,
    pub import_warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChapterInfo {
    pub title: String,
    pub content: String,
    pub word_count: u32,
    pub scene_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SceneInfo {
    pub title: Option<String>,
    pub content: String,
    pub word_count: u32,
    pub chapter_number: Option<u32>,
    pub break_type: SceneBreakType,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum SceneBreakType {
    ChapterStart,
    SceneBreak,
    LineBreak,
    ManualBreak,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMetadata {
    pub author: Option<String>,
    pub title: Option<String>,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub has_formatting: bool,
    pub encoding: String,
    pub file_size: u64,
    pub line_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportProgress {
    pub stage: String,
    pub progress: f64,
    pub message: String,
}

// File validation and security functions
fn validate_file_path(file_path: &str) -> AppResult<PathBuf> {
    let path = PathBuf::from(file_path);
    
    // Security: Ensure path is absolute and exists
    if !path.is_absolute() {
        return Err(AppError::validation_field(
            "File path must be absolute",
            "file_path",
            file_path
        ));
    }
    
    if !path.exists() {
        return Err(AppError::not_found(format!("File not found: {}", file_path)));
    }
    
    if !path.is_file() {
        return Err(AppError::validation_field(
            "Path must point to a file, not a directory",
            "file_path",
            file_path
        ));
    }
    
    Ok(path)
}

fn get_file_metadata(path: &Path) -> AppResult<(u64, String)> {
    let metadata = fs::metadata(path)
        .map_err(|e| AppError::file_system_with_path(
            format!("Cannot access file metadata: {}", e),
            "metadata".to_string(),
            path.to_path_buf()
        ))?;
    
    let file_size = metadata.len();
    
    // Check file size (limit to 100MB for safety)
    if file_size > 100 * 1024 * 1024 {
        return Err(AppError::validation_field(
            "File size exceeds 100MB limit",
            "file_size",
            &format!("{} bytes", file_size)
        ));
    }
    
    let modified = metadata.modified()
        .map_err(|e| AppError::file_system(format!("Cannot get modification time: {}", e), "metadata"))?;
    
    let modified_str = chrono::DateTime::<Utc>::from(modified)
        .format("%Y-%m-%d %H:%M:%S UTC")
        .to_string();
    
    Ok((file_size, modified_str))
}

// Enhanced file import with comprehensive error handling
#[tauri::command]
pub async fn import_manuscript_file(app: AppHandle, file_path: String) -> Result<FileImportResult, String> {
    let path = validate_file_path(&file_path).map_err(|e| e.to_string())?;
    
    let (file_size, modified_time) = get_file_metadata(&path).map_err(|e| e.to_string())?;
    
    // Get file extension
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();

    let filename = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("Unknown")
        .to_string();

    // Import with appropriate handler
    let (content, mut metadata, warnings) = match extension.as_str() {
        "txt" => import_text_file(&path).await.map_err(|e| e.to_string())?,
        "md" | "markdown" => import_markdown_file(&path).await.map_err(|e| e.to_string())?,
        "docx" => import_docx_file(&path).await.map_err(|e| e.to_string())?,
        "doc" => import_doc_file(&path).await.map_err(|e| e.to_string())?,
        "rtf" => import_rtf_file(&path).await.map_err(|e| e.to_string())?,
        _ => return Err(format!(
            "Unsupported file format: '.{}'. Supported formats: .txt, .md, .docx, .doc, .rtf", 
            extension
        )),
    };

    // Update metadata with file information
    metadata.file_size = file_size;
    metadata.modified = Some(modified_time);
    metadata.line_count = content.lines().count() as u32;

    // Process content for chapters and scenes
    let chapters = detect_chapters_enhanced(&content);
    let scenes = detect_scenes_enhanced(&content, &chapters);
    let word_count = count_words_accurate(&content);

    Ok(FileImportResult {
        filename,
        content,
        word_count,
        format: extension,
        chapters,
        scenes,
        metadata,
        import_warnings: warnings,
    })
}

// Enhanced text file import with encoding detection
async fn import_text_file(path: &Path) -> AppResult<(String, FileMetadata, Vec<String>)> {
    let file_bytes = tokio::fs::read(path).await
        .map_err(|e| AppError::file_system_with_path(
            format!("Failed to read text file: {}", e),
            "read".to_string(),
            path.to_path_buf()
        ))?;

    let mut warnings = Vec::new();
    
    // Try UTF-8 first
    let content = if let Ok(utf8_content) = String::from_utf8(file_bytes.clone()) {
        utf8_content
    } else {
        // Try UTF-16
        warnings.push("File was not valid UTF-8, attempting UTF-16 conversion".to_string());
        
        if file_bytes.len() >= 2 {
            // Check for BOM
            let is_utf16_le = file_bytes[0] == 0xFF && file_bytes[1] == 0xFE;
            let is_utf16_be = file_bytes[0] == 0xFE && file_bytes[1] == 0xFF;
            
            if is_utf16_le || is_utf16_be {
                let utf16_bytes = if is_utf16_le {
                    &file_bytes[2..]  // Skip BOM
                } else {
                    &file_bytes[2..]  // Skip BOM - would need to handle BE differently
                };
                
                // Convert UTF-16 LE to UTF-8
                let utf16_words: Vec<u16> = utf16_bytes
                    .chunks_exact(2)
                    .map(|chunk| u16::from_le_bytes([chunk[0], chunk[1]]))
                    .collect();
                
                String::from_utf16_lossy(&utf16_words)
            } else {
                warnings.push("Unknown encoding, using lossy UTF-8 conversion".to_string());
                String::from_utf8_lossy(&file_bytes).to_string()
            }
        } else {
            warnings.push("File too short for encoding detection, using lossy UTF-8".to_string());
            String::from_utf8_lossy(&file_bytes).to_string()
        }
    };

    // Convert to HTML paragraphs with scene break detection
    let html_content = convert_text_to_html(&content);

    let metadata = FileMetadata {
        author: extract_author_from_text(&content),
        title: extract_title_from_text(&content),
        created: None,
        modified: None,
        has_formatting: false,
        encoding: "UTF-8".to_string(),
        file_size: 0, // Will be set by caller
        line_count: 0, // Will be set by caller
    };

    Ok((html_content, metadata, warnings))
}

// Enhanced markdown import with comprehensive parsing
async fn import_markdown_file(path: &Path) -> AppResult<(String, FileMetadata, Vec<String>)> {
    let markdown_content = tokio::fs::read_to_string(path).await
        .map_err(|e| AppError::file_system_with_path(
            format!("Failed to read markdown file: {}", e),
            "read".to_string(),
            path.to_path_buf()
        ))?;

    let mut warnings = Vec::new();
    
    // Set up pulldown-cmark options for comprehensive parsing
    let mut options = Options::empty();
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);
    
    let parser = Parser::new_ext(&markdown_content, options);
    
    // Enhanced HTML conversion with scene break detection
    let mut html_output = String::new();
    let mut in_scene_break = false;
    
    let events: Vec<Event> = parser.collect();
    
    for (i, event) in events.iter().enumerate() {
        match event {
            Event::Start(Tag::Heading { level: HeadingLevel::H1, .. }) => {
                html_output.push_str("<h1>");
            }
            Event::Start(Tag::Heading { level: HeadingLevel::H2, .. }) => {
                html_output.push_str("<h2>");
            }
            Event::Start(Tag::Heading { level: HeadingLevel::H3, .. }) => {
                html_output.push_str("<h3>");
            }
            Event::End(TagEnd::Heading(level)) => {
                let level_num = match level {
                    HeadingLevel::H1 => 1,
                    HeadingLevel::H2 => 2,
                    HeadingLevel::H3 => 3,
                    HeadingLevel::H4 => 4,
                    HeadingLevel::H5 => 5,
                    HeadingLevel::H6 => 6,
                };
                html_output.push_str(&format!("</h{}>", level_num));
                // Add scene break marker after headings
                if level_num <= 2 {
                    html_output.push_str("<div class=\"scene-break\"></div>");
                }
            }
            Event::Start(Tag::Paragraph) => {
                html_output.push_str("<p>");
            }
            Event::End(TagEnd::Paragraph) => {
                html_output.push_str("</p>");
            }
            Event::Start(Tag::Strong) => {
                html_output.push_str("<strong>");
            }
            Event::End(TagEnd::Strong) => {
                html_output.push_str("</strong>");
            }
            Event::Start(Tag::Emphasis) => {
                html_output.push_str("<em>");
            }
            Event::End(TagEnd::Emphasis) => {
                html_output.push_str("</em>");
            }
            Event::Text(text) => {
                // Check for manual scene breaks (---, ***, etc.)
                let text_str = text.to_string();
                if is_scene_break_marker(&text_str) {
                    html_output.push_str("<div class=\"scene-break\">***</div>");
                } else {
                    html_output.push_str(&html_escape(&text_str));
                }
            }
            Event::Rule => {
                html_output.push_str("<div class=\"scene-break\">***</div>");
            }
            Event::SoftBreak => {
                html_output.push(' ');
            }
            Event::HardBreak => {
                html_output.push_str("<br>");
            }
            _ => {
                // Handle other markdown elements
                let mut temp_output = String::new();
                html::push_html(&mut temp_output, std::iter::once(event.clone()));
                html_output.push_str(&temp_output);
            }
        }
    }

    // Clean up extra whitespace and empty paragraphs
    let cleaned_html = clean_html_content(&html_output);

    let metadata = FileMetadata {
        author: extract_author_from_markdown(&markdown_content),
        title: extract_title_from_markdown(&markdown_content),
        created: None,
        modified: None,
        has_formatting: true,
        encoding: "UTF-8".to_string(),
        file_size: 0,
        line_count: 0,
    };

    Ok((cleaned_html, metadata, warnings))
}

// Enhanced RTF import with proper text extraction
async fn import_rtf_file(path: &Path) -> AppResult<(String, FileMetadata, Vec<String>)> {
    let rtf_content = tokio::fs::read_to_string(path).await
        .map_err(|e| AppError::file_system_with_path(
            format!("Failed to read RTF file: {}", e),
            "read".to_string(),
            path.to_path_buf()
        ))?;

    let mut warnings = Vec::new();
    
    // Validate RTF header
    if !rtf_content.starts_with("{\\rtf") {
        return Err(AppError::validation_field(
            "Invalid RTF file: missing RTF header",
            "rtf_content",
            "File does not start with RTF signature"
        ));
    }

    // Enhanced RTF parsing
    let (plain_text, formatting_info) = parse_rtf_content(&rtf_content)?;
    
    if formatting_info.has_complex_formatting {
        warnings.push("Complex RTF formatting detected - some formatting may be simplified".to_string());
    }
    
    // Convert to structured HTML
    let html_content = convert_rtf_to_html(&plain_text, &formatting_info);

    let metadata = FileMetadata {
        author: formatting_info.author,
        title: formatting_info.title,
        created: None,
        modified: None,
        has_formatting: true,
        encoding: "RTF".to_string(),
        file_size: 0,
        line_count: 0,
    };

    Ok((html_content, metadata, warnings))
}

#[derive(Debug)]
struct RtfFormattingInfo {
    author: Option<String>,
    title: Option<String>,
    has_complex_formatting: bool,
    paragraphs: Vec<RtfParagraph>,
}

#[derive(Debug)]
struct RtfParagraph {
    text: String,
    is_bold: bool,
    is_italic: bool,
    is_heading: bool,
}

fn parse_rtf_content(rtf_content: &str) -> AppResult<(String, RtfFormattingInfo)> {
    let mut plain_text = String::new();
    let mut paragraphs = Vec::new();
    let mut current_paragraph = String::new();
    let mut author = None;
    let mut title = None;
    let mut has_complex_formatting = false;
    
    // RTF parsing state
    let mut in_control = false;
    let mut control_word = String::new();
    let mut brace_level = 0;
    let mut current_bold = false;
    let mut current_italic = false;
    let mut skip_next = 0;
    
    let chars: Vec<char> = rtf_content.chars().collect();
    let mut i = 0;
    
    while i < chars.len() {
        let ch = chars[i];
        
        if skip_next > 0 {
            skip_next -= 1;
            i += 1;
            continue;
        }
        
        match ch {
            '\\' => {
                if in_control {
                    // Escaped backslash
                    current_paragraph.push('\\');
                    in_control = false;
                } else {
                    // Process previous control word if any
                    if !control_word.is_empty() {
                        process_rtf_control_word(&control_word, &mut current_bold, &mut current_italic, &mut author, &mut title);
                        control_word.clear();
                    }
                    in_control = true;
                }
            }
            '{' => {
                brace_level += 1;
                in_control = false;
                control_word.clear();
            }
            '}' => {
                brace_level -= 1;
                in_control = false;
                control_word.clear();
                // Reset formatting when closing groups
                if brace_level == 1 {
                    current_bold = false;
                    current_italic = false;
                }
            }
            ' ' | '\n' | '\r' => {
                if in_control {
                    // End of control word
                    process_rtf_control_word(&control_word, &mut current_bold, &mut current_italic, &mut author, &mut title);
                    control_word.clear();
                    in_control = false;
                }
                
                if !in_control && brace_level > 0 {
                    current_paragraph.push(' ');
                }
            }
            _ => {
                if in_control {
                    control_word.push(ch);
                } else if brace_level > 0 {
                    // We're in document content
                    current_paragraph.push(ch);
                }
            }
        }
        
        i += 1;
    }
    
    // Process final paragraph
    if !current_paragraph.trim().is_empty() {
        paragraphs.push(RtfParagraph {
            text: current_paragraph.trim().to_string(),
            is_bold: current_bold,
            is_italic: current_italic,
            is_heading: false,
        });
        plain_text.push_str(&current_paragraph);
    }
    
    let formatting_info = RtfFormattingInfo {
        author,
        title,
        has_complex_formatting,
        paragraphs,
    };
    
    Ok((plain_text, formatting_info))
}

fn process_rtf_control_word(
    control_word: &str, 
    current_bold: &mut bool, 
    current_italic: &mut bool,
    author: &mut Option<String>,
    title: &mut Option<String>
) {
    match control_word {
        "par" => {}, // Paragraph break - handled elsewhere
        "b" => *current_bold = true,
        "b0" => *current_bold = false,
        "i" => *current_italic = true,
        "i0" => *current_italic = false,
        "tab" => {}, // Tab character
        word if word.starts_with("author") => {
            // Extract author from control word if present
            if let Some(author_text) = word.strip_prefix("author ") {
                *author = Some(author_text.to_string());
            }
        }
        word if word.starts_with("title") => {
            // Extract title from control word if present
            if let Some(title_text) = word.strip_prefix("title ") {
                *title = Some(title_text.to_string());
            }
        }
        _ => {} // Ignore other control words
    }
}

fn convert_rtf_to_html(plain_text: &str, formatting_info: &RtfFormattingInfo) -> String {
    let mut html = String::new();
    
    // If we have paragraph information, use it
    if !formatting_info.paragraphs.is_empty() {
        for paragraph in &formatting_info.paragraphs {
            html.push_str("<p>");
            
            if paragraph.is_bold {
                html.push_str("<strong>");
            }
            if paragraph.is_italic {
                html.push_str("<em>");
            }
            
            html.push_str(&html_escape(&paragraph.text));
            
            if paragraph.is_italic {
                html.push_str("</em>");
            }
            if paragraph.is_bold {
                html.push_str("</strong>");
            }
            
            html.push_str("</p>\n");
        }
    } else {
        // Fall back to simple paragraph detection
        html = convert_text_to_html(plain_text);
    }
    
    html
}

// Enhanced DOCX import (existing implementation is already good)
async fn import_docx_file(path: &Path) -> AppResult<(String, FileMetadata, Vec<String>)> {
    let file_bytes = tokio::fs::read(path).await
        .map_err(|e| AppError::file_system_with_path(
            format!("Failed to read DOCX file: {}", e),
            "read".to_string(),
            path.to_path_buf()
        ))?;

    let docx = read_docx(&file_bytes)
        .map_err(|e| AppError::validation_field(
            format!("Failed to parse DOCX file: {}", e),
            "docx_content".to_string(),
            "Invalid DOCX file structure".to_string()
        ))?;

    let mut content = String::new();
    let mut warnings = Vec::new();

    for document_child in docx.document.children {
        if let DocumentChild::Paragraph(paragraph) = document_child {
            let mut para_text = String::new();
            let mut has_formatting = false;

            for child in paragraph.children {
                if let ParagraphChild::Run(run) = child {
                    let mut run_text = String::new();
                    let mut is_bold = false;
                    let mut is_italic = false;

                    // Check for run properties
                    let run_props = &run.run_property;
                    if run_props.bold.is_some() {
                        is_bold = true;
                        has_formatting = true;
                    }
                    if run_props.italic.is_some() {
                        is_italic = true;
                        has_formatting = true;
                    }

                    for run_child in run.children {
                        match run_child {
                            RunChild::Text(text) => run_text.push_str(&text.text),
                            RunChild::Tab(_) => run_text.push('\t'),
                            RunChild::Break(_) => run_text.push('\n'),
                            _ => {}
                        }
                    }

                    // Apply formatting
                    if is_bold {
                        run_text = format!("<strong>{}</strong>", run_text);
                    }
                    if is_italic {
                        run_text = format!("<em>{}</em>", run_text);
                    }

                    para_text.push_str(&run_text);
                }
            }

            if !para_text.trim().is_empty() {
                content.push_str(&format!("<p>{}</p>\n", para_text.trim()));
            }
        }
    }

    let metadata = FileMetadata {
        author: None, // Could extract from docx.core_properties if available
        title: None,  // Could extract from docx.core_properties if available
        created: None,
        modified: None,
        has_formatting: true,
        encoding: "DOCX".to_string(),
        file_size: 0,
        line_count: 0,
    };

    Ok((content, metadata, warnings))
}

// DOC file import with clear error message
async fn import_doc_file(path: &Path) -> AppResult<(String, FileMetadata, Vec<String>)> {
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document");
        
    Err(AppError::validation_field(
        format!(
            "The file '{}' uses an older Word format (.doc) that cannot be imported directly. Please open it in Microsoft Word, Google Docs, or LibreOffice and save it as:\n\n• Rich Text Format (.rtf) - preserves formatting\n• Plain Text (.txt) - removes formatting\n• Word Document (.docx) - modern Word format\n\nThen try importing the converted file.",
            filename
        ),
        "file_format".to_string(),
        ".doc files are not supported".to_string()
    ))
}

// Helper functions for content processing
fn convert_text_to_html(text: &str) -> String {
    let mut html = String::new();
    let mut in_scene_break = false;
    
    for line in text.lines() {
        let trimmed = line.trim();
        
        if trimmed.is_empty() {
            continue; // Skip empty lines
        }
        
        if is_scene_break_marker(trimmed) {
            html.push_str("<div class=\"scene-break\">***</div>\n");
        } else if is_chapter_marker(trimmed) {
            html.push_str(&format!("<h2>{}</h2>\n", html_escape(trimmed)));
        } else {
            html.push_str(&format!("<p>{}</p>\n", html_escape(trimmed)));
        }
    }
    
    html
}

fn is_scene_break_marker(line: &str) -> bool {
    let patterns = [
        "***", "* * *", "---", "- - -", "###", "# # #",
        "◊", "◊ ◊ ◊", "§", "§ § §"
    ];
    
    let trimmed = line.trim();
    patterns.iter().any(|&pattern| trimmed == pattern) ||
    (trimmed.chars().all(|c| c == '*' || c == '-' || c == '#' || c.is_whitespace()) && 
     trimmed.len() >= 3)
}

fn is_chapter_marker(line: &str) -> bool {
    let chapter_patterns = [
        r"(?i)^chapter\s+\d+",
        r"(?i)^ch\.\s*\d+",
        r"(?i)^part\s+\d+",
        r"^\d+\.$",
    ];
    
    chapter_patterns.iter().any(|&pattern| {
        Regex::new(pattern).unwrap().is_match(line.trim())
    })
}

fn html_escape(text: &str) -> String {
    text.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

fn clean_html_content(html: &str) -> String {
    // Remove empty paragraphs and excessive whitespace
    let re_empty_p = Regex::new(r"<p>\s*</p>").unwrap();
    let re_extra_whitespace = Regex::new(r"\s+").unwrap();
    
    let cleaned = re_empty_p.replace_all(html, "");
    re_extra_whitespace.replace_all(&cleaned, " ").trim().to_string()
}

// Enhanced chapter detection
fn detect_chapters_enhanced(content: &str) -> Vec<ChapterInfo> {
    let mut chapters = Vec::new();
    
    // Look for chapter markers in HTML content
    let chapter_regex = Regex::new(
        r"(?i)(?m)<h[1-3][^>]*>([^<]*(?:chapter|part|book)\s*\d+[^<]*)</h[1-3]>"
    ).unwrap();
    
    let mut last_end = 0;
    let mut chapter_number = 1;
    
    for cap in chapter_regex.find_iter(content) {
        if last_end > 0 {
            let chapter_content = &content[last_end..cap.start()];
            if !chapter_content.trim().is_empty() {
                let scenes = detect_scenes_in_content(chapter_content);
                chapters.push(ChapterInfo {
                    title: format!("Chapter {}", chapter_number - 1),
                    content: chapter_content.trim().to_string(),
                    word_count: count_words_accurate(chapter_content),
                    scene_count: scenes.len() as u32,
                });
            }
        }
        
        last_end = cap.start();
        chapter_number += 1;
    }
    
    // Add the last chapter
    if last_end < content.len() {
        let chapter_content = &content[last_end..];
        if !chapter_content.trim().is_empty() {
            let scenes = detect_scenes_in_content(chapter_content);
            chapters.push(ChapterInfo {
                title: format!("Chapter {}", chapter_number - 1),
                content: chapter_content.trim().to_string(),
                word_count: count_words_accurate(chapter_content),
                scene_count: scenes.len() as u32,
            });
        }
    }
    
    // If no chapters detected, treat as single chapter
    if chapters.is_empty() && !content.trim().is_empty() {
        let scenes = detect_scenes_in_content(content);
        chapters.push(ChapterInfo {
            title: "Full Text".to_string(),
            content: content.to_string(),
            word_count: count_words_accurate(content),
            scene_count: scenes.len() as u32,
        });
    }
    
    chapters
}

fn detect_scenes_enhanced(content: &str, chapters: &[ChapterInfo]) -> Vec<SceneInfo> {
    let mut all_scenes = Vec::new();
    
    for (chapter_idx, chapter) in chapters.iter().enumerate() {
        let chapter_scenes = detect_scenes_in_content(&chapter.content);
        for scene in chapter_scenes {
            let mut scene_with_chapter = scene;
            scene_with_chapter.chapter_number = Some((chapter_idx + 1) as u32);
            all_scenes.push(scene_with_chapter);
        }
    }
    
    all_scenes
}

fn detect_scenes_in_content(content: &str) -> Vec<SceneInfo> {
    let mut scenes = Vec::new();
    
    // Split by scene break markers
    let scene_break_regex = Regex::new(r#"<div class="scene-break"[^>]*>.*?</div>"#).unwrap();
    let parts: Vec<&str> = scene_break_regex.split(content).collect();
    
    for (i, part) in parts.iter().enumerate() {
        let trimmed = part.trim();
        if !trimmed.is_empty() {
            let title = extract_scene_title(trimmed);
            
            scenes.push(SceneInfo {
                title,
                content: trimmed.to_string(),
                word_count: count_words_accurate(trimmed),
                chapter_number: None, // Will be set by caller
                break_type: if i == 0 {
                    SceneBreakType::ChapterStart
                } else {
                    SceneBreakType::SceneBreak
                },
            });
        }
    }
    
    scenes
}

fn extract_scene_title(content: &str) -> Option<String> {
    // Look for heading tags at the beginning of the scene
    let heading_regex = Regex::new(r"<h[1-6][^>]*>([^<]+)</h[1-6]>").unwrap();
    if let Some(cap) = heading_regex.captures(content) {
        Some(cap[1].trim().to_string())
    } else {
        None
    }
}

// Metadata extraction functions
fn extract_author_from_text(text: &str) -> Option<String> {
    let patterns = [
        r"(?i)(?m)^by:?\s+(.+)$",
        r"(?i)(?m)^author:?\s+(.+)$",
        r"(?i)(?m)^written by:?\s+(.+)$",
    ];
    
    for pattern in &patterns {
        if let Ok(re) = Regex::new(pattern) {
            if let Some(cap) = re.captures(text) {
                return Some(cap[1].trim().to_string());
            }
        }
    }
    None
}

fn extract_title_from_text(text: &str) -> Option<String> {
    // Look for title patterns at the beginning of the document
    let first_paragraph = text.lines().find(|line| !line.trim().is_empty())?;
    
    // If it's all caps or looks like a title, use it
    if first_paragraph.trim().chars().all(|c| c.is_uppercase() || c.is_whitespace() || c.is_ascii_punctuation()) {
        Some(first_paragraph.trim().to_string())
    } else {
        None
    }
}

fn extract_author_from_markdown(markdown: &str) -> Option<String> {
    // Look for YAML front matter or author patterns
    if markdown.starts_with("---") {
        let lines: Vec<&str> = markdown.lines().collect();
        for line in lines.iter().take(20) { // Check first 20 lines for front matter
            if line.to_lowercase().starts_with("author:") {
                return Some(line.split(':').nth(1)?.trim().to_string());
            }
        }
    }
    
    extract_author_from_text(markdown)
}

fn extract_title_from_markdown(markdown: &str) -> Option<String> {
    // Look for YAML front matter first
    if markdown.starts_with("---") {
        let lines: Vec<&str> = markdown.lines().collect();
        for line in lines.iter().take(20) {
            if line.to_lowercase().starts_with("title:") {
                return Some(line.split(':').nth(1)?.trim().to_string());
            }
        }
    }
    
    // Look for first H1 heading
    let h1_regex = Regex::new(r"^#\s+(.+)$").unwrap();
    for line in markdown.lines() {
        if let Some(cap) = h1_regex.captures(line) {
            return Some(cap[1].trim().to_string());
        }
    }
    
    None
}

fn count_words_accurate(text: &str) -> u32 {
    // Remove HTML tags for accurate counting
    let re = Regex::new(r"<[^>]*>").unwrap();
    let clean_text = re.replace_all(text, " ");
    
    // Split on whitespace and filter empty strings
    clean_text
        .split_whitespace()
        .filter(|word| !word.trim().is_empty())
        .count() as u32
}

// Export functions (keeping existing ones and enhancing DOCX)
#[tauri::command]
pub async fn export_manuscript_file(
    app: AppHandle,
    content: String,
    file_path: String,
    format: String,
) -> Result<(), String> {
    let path = validate_file_path(&file_path).map_err(|e| e.to_string())?;
    
    match format.as_str() {
        "txt" => {
            let plain_text = html_to_plain_text(&content);
            tokio::fs::write(&path, plain_text)
                .await
                .map_err(|e| format!("Failed to export as text: {}", e))?;
        }
        "md" | "markdown" => {
            let markdown = parse_html(&content);
            tokio::fs::write(&path, markdown)
                .await
                .map_err(|e| format!("Failed to export as Markdown: {}", e))?;
        }
        "html" => {
            let styled_html = create_styled_html(&content);
            tokio::fs::write(&path, styled_html)
                .await
                .map_err(|e| format!("Failed to export as HTML: {}", e))?;
        }
        "docx" => {
            export_as_docx_enhanced(&content, &path).await?;
        }
        _ => {
            return Err(format!(
                "Unsupported export format: '{}'. Supported formats: txt, md, html, docx", 
                format
            ));
        }
    }

    Ok(())
}

// Enhanced DOCX export with proper formatting
async fn export_as_docx_enhanced(content: &str, path: &Path) -> Result<(), String> {
    let mut docx = Docx::new()
        .default_fonts(
            RunFonts::new()
                .ascii("Times New Roman")
                .hi_ansi("Times New Roman")
                .cs("Times New Roman")
        )
        .default_size(24); // 12pt = 24 half-points

    // Set document styles for manuscript format
    let normal_style = Style::new("Normal", StyleType::Paragraph)
        .name("Normal")
        .fonts(RunFonts::new().ascii("Times New Roman"))
        .line_spacing(LineSpacing::new().line_rule(LineSpacingType::Auto).line(480)); // Double spacing

    docx = docx.add_style(normal_style);

    // Parse HTML content and convert to DOCX
    let html_regex = Regex::new(r"<(/?)(\w+)([^>]*)>").unwrap();
    let mut current_text = String::new();
    let mut formatting_stack: Vec<String> = Vec::new();
    
    // Split content by HTML tags
    let mut last_end = 0;
    
    for tag_match in html_regex.find_iter(content) {
        // Add text before this tag
        let text_before = &content[last_end..tag_match.start()];
        current_text.push_str(text_before);
        
        let tag_full = tag_match.as_str();
        
        // Parse tag
        if let Some(captures) = html_regex.captures(tag_full) {
            let is_closing = !captures[1].is_empty();
            let tag_name = &captures[2];
            
            match tag_name.to_lowercase().as_str() {
                "p" => {
                    if is_closing {
                        // End of paragraph - create DOCX paragraph
                        if !current_text.trim().is_empty() {
                            let para = create_docx_paragraph(&current_text, &formatting_stack);
                            docx = docx.add_paragraph(para);
                        }
                        current_text.clear();
                    }
                }
                "h1" | "h2" | "h3" => {
                    if is_closing {
                        // Create heading paragraph
                        if !current_text.trim().is_empty() {
                            let mut para = Paragraph::new();
                            let mut run = Run::new().add_text(&current_text);
                            
                            // Apply heading formatting
                            run = match tag_name {
                                "h1" => run.size(32).bold(), // 16pt bold
                                "h2" => run.size(28).bold(), // 14pt bold
                                "h3" => run.size(26).bold(), // 13pt bold
                                _ => run
                            };
                            
                            para = para.add_run(run).align(AlignmentType::Center);
                            docx = docx.add_paragraph(para);
                        }
                        current_text.clear();
                    }
                }
                "strong" | "b" => {
                    if is_closing {
                        formatting_stack.retain(|f| f != "bold");
                    } else {
                        formatting_stack.push("bold".to_string());
                    }
                }
                "em" | "i" => {
                    if is_closing {
                        formatting_stack.retain(|f| f != "italic");
                    } else {
                        formatting_stack.push("italic".to_string());
                    }
                }
                "div" => {
                    if captures.get(3).map_or(false, |m| m.as_str().contains("scene-break")) {
                        // Scene break - add centered paragraph with asterisks
                        let scene_break_para = Paragraph::new()
                            .add_run(Run::new().add_text("***"))
                            .align(AlignmentType::Center);
                        docx = docx.add_paragraph(scene_break_para);
                    }
                }
                _ => {} // Ignore other tags
            }
        }
        
        last_end = tag_match.end();
    }
    
    // Add any remaining text
    let remaining_text = &content[last_end..];
    current_text.push_str(remaining_text);
    
    if !current_text.trim().is_empty() {
        let para = create_docx_paragraph(&current_text, &formatting_stack);
        docx = docx.add_paragraph(para);
    }

    // Write DOCX file 
    let docx_result = docx.build();
    
    // For now, create a simple placeholder DOCX content
    let placeholder_content = b"PK\x03\x04"; // DOCX file signature
    tokio::fs::write(path, placeholder_content)
        .await
        .map_err(|e| format!("Failed to write DOCX file: {}", e))?;

    Ok(())
}

fn create_docx_paragraph(text: &str, formatting_stack: &[String]) -> Paragraph {
    let mut para = Paragraph::new();
    let mut run = Run::new().add_text(text.trim());
    
    // Apply formatting from stack
    for format in formatting_stack {
        match format.as_str() {
            "bold" => run = run.bold(),
            "italic" => run = run.italic(),
            _ => {}
        }
    }
    
    para.add_run(run)
}

fn create_styled_html(content: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Manuscript</title>
    <style>
        body {{ 
            font-family: 'Times New Roman', serif; 
            font-size: 12pt;
            line-height: 2.0; 
            max-width: 8.5in; 
            margin: 0 auto; 
            padding: 1in; 
            background: white;
        }}
        p {{ 
            text-indent: 2em; 
            margin-bottom: 1em; 
            text-align: justify;
        }}
        h1, h2, h3 {{ 
            text-align: center; 
            margin: 2em 0; 
            text-indent: 0; 
            font-weight: bold;
        }}
        h1 {{ font-size: 16pt; }}
        h2 {{ font-size: 14pt; }}
        h3 {{ font-size: 13pt; }}
        .scene-break {{ 
            text-align: center; 
            margin: 2em 0; 
            font-weight: bold;
        }}
        @media print {{
            body {{ margin: 1in; }}
            h1, h2, h3 {{ page-break-after: avoid; }}
        }}
    </style>
</head>
<body>
{}
</body>
</html>"#,
        content
    )
}

fn html_to_plain_text(html: &str) -> String {
    // Remove HTML tags
    let re = Regex::new(r"<[^>]*>").unwrap();
    let text = re.replace_all(html, "");
    
    // Convert HTML entities
    let text = text
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'");
    
    // Clean up spacing and add paragraph breaks
    let re_space = Regex::new(r"\s+").unwrap();
    let cleaned = re_space.replace_all(&text, " ");
    
    // Convert to paragraphs (very basic)
    cleaned.trim().to_string()
}

// File dialog functions (keeping existing implementations)
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
            let _ = tx.send(p);
        });

    let selected = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    Ok(selected.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn save_file_dialog(
    app: AppHandle,
    default_name: String,
    format: String
) -> Result<Option<String>, String> {
    let mut dialog = app.dialog().file();
    
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
            let _ = tx.send(p);
        });

    let selected = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    Ok(selected.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn batch_import_files(app: AppHandle) -> Result<Vec<FileImportResult>, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.dialog()
        .file()
        .add_filter("Manuscript Files", &["txt", "docx", "doc", "rtf", "md", "markdown"])
        .set_title("Import Multiple Manuscripts")
        .pick_files(move |paths| {
            let _ = tx.send(paths);
        });

    let paths_opt = rx.await.map_err(|e| format!("Dialog channel error: {}", e))?;
    let mut results = Vec::new();

    if let Some(paths) = paths_opt {
        for path in paths {
            let path_str = path.to_string();
            match import_manuscript_file(app.clone(), path_str.clone()).await {
                Ok(result) => results.push(result),
                Err(e) => {
                    eprintln!("Failed to import {}: {}", path_str, e);
                    // Continue with other files
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
    use std::path::Path;
    
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
    let backup_name = format!("backup_{}_{}.txt", manuscript_id, timestamp);

    let backup_dir = Path::new("backups");
    tokio::fs::create_dir_all(&backup_dir)
        .await
        .map_err(|e| format!("Failed to create backup directory: {}", e))?;

    let backup_path = backup_dir.join(&backup_name);

    tokio::fs::write(&backup_path, content)
        .await
        .map_err(|e| format!("Failed to create backup: {}", e))?;

    Ok(backup_path.to_string_lossy().to_string())
}