use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use chrono::{DateTime, Utc};
use anyhow::{Result, anyhow};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    StandardManuscript, // Industry standard formatting
    Epub,
    Mobi, 
    PDF,
    Docx,
    Markdown,
    LaTeX,
    Scrivener,
    FinalDraft,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub include_comments: bool,
    pub include_notes: bool,
    pub preserve_formatting: bool,
    pub chapter_breaks: bool,
    pub page_numbers: bool,
    pub header_footer: Option<HeaderFooterOptions>,
    pub font_settings: FontSettings,
    pub page_settings: PageSettings,
    pub output_path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderFooterOptions {
    pub header: Option<String>,
    pub footer: Option<String>,
    pub include_page_numbers: bool,
    pub include_title: bool,
    pub include_author: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FontSettings {
    pub font_family: String,
    pub font_size: u32,
    pub line_spacing: f32,
    pub paragraph_spacing: f32,
}

impl Default for FontSettings {
    fn default() -> Self {
        Self {
            font_family: "Times New Roman".to_string(),
            font_size: 12,
            line_spacing: 2.0,
            paragraph_spacing: 0.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageSettings {
    pub page_size: PageSize,
    pub margins: Margins,
    pub orientation: PageOrientation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PageSize {
    Letter,
    A4,
    Legal,
    Custom { width: f32, height: f32 },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Margins {
    pub top: f32,
    pub bottom: f32,
    pub left: f32,
    pub right: f32,
}

impl Default for Margins {
    fn default() -> Self {
        Self {
            top: 1.0,
            bottom: 1.0,
            left: 1.25,
            right: 1.25,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PageOrientation {
    Portrait,
    Landscape,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManuscriptContent {
    pub title: String,
    pub author: Option<String>,
    pub genre: Option<String>,
    pub scenes: Vec<SceneContent>,
    pub metadata: ManuscriptMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneContent {
    pub id: String,
    pub title: Option<String>,
    pub content: String,
    pub chapter_number: Option<u32>,
    pub scene_number: u32,
    pub is_chapter_start: bool,
    pub is_chapter_end: bool,
    pub word_count: usize,
    pub comments: Vec<CommentContent>,
    pub formatting: SceneFormatting,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommentContent {
    pub id: String,
    pub text: String,
    pub position: usize,
    pub author: Option<String>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SceneFormatting {
    pub indent_first_line: bool,
    pub alignment: TextAlignment,
    pub spacing_before: f32,
    pub spacing_after: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TextAlignment {
    Left,
    Center,
    Right,
    Justify,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManuscriptMetadata {
    pub word_count: usize,
    pub character_count: usize,
    pub page_count_estimate: usize,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub version: String,
    pub target_audience: Option<String>,
    pub comp_titles: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub output_path: Option<PathBuf>,
    pub file_size: Option<u64>,
    pub page_count: Option<usize>,
    pub word_count: usize,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

pub struct ExportService;

impl ExportService {
    pub fn new() -> Self {
        Self
    }

    pub async fn export_manuscript(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        match options.format {
            ExportFormat::StandardManuscript => self.export_standard_manuscript(content, options).await,
            ExportFormat::Epub => self.export_epub(content, options).await,
            ExportFormat::Mobi => self.export_mobi(content, options).await,
            ExportFormat::PDF => self.export_pdf(content, options).await,
            ExportFormat::Docx => self.export_docx(content, options).await,
            ExportFormat::Markdown => self.export_markdown(content, options).await,
            ExportFormat::LaTeX => self.export_latex(content, options).await,
            ExportFormat::Scrivener => self.export_scrivener(content, options).await,
            ExportFormat::FinalDraft => self.export_final_draft(content, options).await,
        }
    }

    async fn export_standard_manuscript(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        // Industry standard manuscript formatting
        let mut output = String::new();
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Header information
        if let Some(author) = &content.author {
            output.push_str(&format!("{}\n", author));
        }
        if let Some(ref header_footer) = options.header_footer {
            if header_footer.include_title {
                output.push_str(&format!("{}\n", content.title));
            }
        }
        output.push_str(&format!("Approximately {} words\n\n", content.metadata.word_count));

        // Title page
        output.push_str(&format!("{}\n", content.title.to_uppercase()));
        output.push_str("\n\n");
        if let Some(author) = &content.author {
            output.push_str(&format!("by\n\n{}\n", author));
        }
        output.push_str("\f"); // Form feed for new page

        // Content
        let mut current_chapter = 0;
        for scene in &content.scenes {
            // Chapter break handling
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num != current_chapter {
                    if current_chapter > 0 {
                        output.push_str("\f"); // New page for new chapter
                    }
                    current_chapter = chapter_num;
                    
                    if options.chapter_breaks {
                        output.push_str(&format!("CHAPTER {}\n\n", chapter_num));
                    }
                }
            }

            // Scene title if present
            if let Some(title) = &scene.title {
                output.push_str(&format!("{}\n\n", title));
            }

            // Scene content with proper formatting
            let formatted_content = self.format_standard_manuscript_text(&scene.content);
            output.push_str(&formatted_content);
            
            // Comments if requested
            if options.include_comments && !scene.comments.is_empty() {
                output.push_str("\n\n[COMMENTS]\n");
                for comment in &scene.comments {
                    output.push_str(&format!("• {}\n", comment.text));
                }
            }

            output.push_str("\n\n");
        }

        // Write to file
        let file_size = self.write_text_file(&options.output_path, &output).await?;
        
        // Calculate page count (standard: ~250 words per page)
        let page_count = (content.metadata.word_count + 249) / 250;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(page_count),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_docx(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Create DOCX content using docx-rs
        let docx_content = self.build_docx_content(&content, &options)?;
        
        // Write DOCX file
        let file_size = fs::write(&options.output_path, docx_content)
            .map_err(|e| anyhow!("Failed to write DOCX file: {}", e))?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size as u64),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_pdf(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // For PDF generation, we'd typically use a library like wkhtmltopdf or a Rust PDF library
        // For now, we'll create HTML and mention it needs conversion
        let html_content = self.build_html_content(&content, &options)?;
        
        warnings.push("PDF export requires additional PDF generation library".to_string());
        
        // Temporary: save as HTML with PDF extension noted
        let html_path = options.output_path.with_extension("html");
        let file_size = self.write_text_file(&html_path, &html_content).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(html_path),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_markdown(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let mut warnings = Vec::new();
        let errors = Vec::new();

        // Front matter
        output.push_str("---\n");
        output.push_str(&format!("title: \"{}\"\n", content.title));
        if let Some(author) = &content.author {
            output.push_str(&format!("author: \"{}\"\n", author));
        }
        if let Some(genre) = &content.genre {
            output.push_str(&format!("genre: \"{}\"\n", genre));
        }
        output.push_str(&format!("wordcount: {}\n", content.metadata.word_count));
        output.push_str("---\n\n");

        // Title
        output.push_str(&format!("# {}\n\n", content.title));
        if let Some(author) = &content.author {
            output.push_str(&format!("*by {}*\n\n", author));
        }

        // Content
        let mut current_chapter = 0;
        for scene in &content.scenes {
            // Chapter headers
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num != current_chapter {
                    current_chapter = chapter_num;
                    output.push_str(&format!("## Chapter {}\n\n", chapter_num));
                }
            }

            // Scene title
            if let Some(title) = &scene.title {
                output.push_str(&format!("### {}\n\n", title));
            }

            // Scene content
            output.push_str(&scene.content);
            output.push_str("\n\n");

            // Comments as blockquotes
            if options.include_comments && !scene.comments.is_empty() {
                for comment in &scene.comments {
                    output.push_str(&format!("> **Comment:** {}\n", comment.text));
                }
                output.push_str("\n");
            }
        }

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_latex(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let mut warnings = Vec::new();
        let errors = Vec::new();

        // Document preamble
        output.push_str("\\documentclass[12pt,letterpaper]{article}\n");
        output.push_str("\\usepackage[utf8]{inputenc}\n");
        output.push_str("\\usepackage{geometry}\n");
        output.push_str("\\usepackage{setspace}\n");
        output.push_str("\\usepackage{times}\n");
        
        // Page geometry
        let margins = &options.page_settings.margins;
        output.push_str(&format!(
            "\\geometry{{top={:.1}in,bottom={:.1}in,left={:.1}in,right={:.1}in}}\n",
            margins.top, margins.bottom, margins.left, margins.right
        ));
        
        // Line spacing
        output.push_str(&format!("\\setstretch{{{:.1}}}\n", options.font_settings.line_spacing));
        
        // Title and author
        output.push_str(&format!("\\title{{{}}}\n", self.escape_latex(&content.title)));
        if let Some(author) = &content.author {
            output.push_str(&format!("\\author{{{}}}\n", self.escape_latex(author)));
        }
        output.push_str("\\date{}\n\n");

        // Begin document
        output.push_str("\\begin{document}\n");
        output.push_str("\\maketitle\n");
        output.push_str("\\newpage\n\n");

        // Content
        let mut current_chapter = 0;
        for scene in &content.scenes {
            // Chapter sections
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num != current_chapter {
                    current_chapter = chapter_num;
                    output.push_str(&format!("\\section{{Chapter {}}}\n\n", chapter_num));
                }
            }

            // Scene subsection
            if let Some(title) = &scene.title {
                output.push_str(&format!("\\subsection{{{}}}\n\n", self.escape_latex(title)));
            }

            // Scene content
            let escaped_content = self.escape_latex(&scene.content);
            output.push_str(&escaped_content);
            output.push_str("\n\n");
        }

        output.push_str("\\end{document}\n");

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_epub(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut warnings = Vec::new();
        let errors = Vec::new();

        // EPUB requires complex ZIP structure - this is a simplified implementation
        warnings.push("EPUB export is simplified - full implementation requires ZIP library".to_string());
        
        // Create EPUB structure as HTML for now
        let html_content = self.build_epub_html(&content, &options)?;
        let temp_path = options.output_path.with_extension("html");
        let file_size = self.write_text_file(&temp_path, &html_content).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(temp_path),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_mobi(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        // MOBI format requires kindlegen or similar tool
        let mut warnings = vec!["MOBI export requires Amazon Kindle tools".to_string()];
        let errors = Vec::new();

        // Export as HTML first
        let html_content = self.build_html_content(&content, &options)?;
        let temp_path = options.output_path.with_extension("html");
        let file_size = self.write_text_file(&temp_path, &html_content).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(temp_path),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_scrivener(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut warnings = Vec::new();
        let errors = Vec::new();

        // Scrivener uses a complex project structure
        warnings.push("Scrivener export creates simplified format".to_string());
        
        // Create a structured text representation
        let mut output = String::new();
        
        // Metadata
        output.push_str(&format!("TITLE: {}\n", content.title));
        if let Some(author) = &content.author {
            output.push_str(&format!("AUTHOR: {}\n", author));
        }
        output.push_str(&format!("WORD COUNT: {}\n", content.metadata.word_count));
        output.push_str("---\n\n");

        // Scenes as separate documents
        for (index, scene) in content.scenes.iter().enumerate() {
            output.push_str(&format!("DOCUMENT: Scene_{:03}\n", index + 1));
            if let Some(title) = &scene.title {
                output.push_str(&format!("TITLE: {}\n", title));
            }
            if let Some(chapter) = scene.chapter_number {
                output.push_str(&format!("CHAPTER: {}\n", chapter));
            }
            output.push_str("CONTENT:\n");
            output.push_str(&scene.content);
            output.push_str("\n\n---\n\n");
        }

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_final_draft(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut warnings = Vec::new();
        let errors = Vec::new();

        warnings.push("Final Draft export creates simplified screenplay format".to_string());
        
        // Final Draft uses FDX (XML) format
        let mut output = String::new();
        output.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        output.push_str("<FinalDraft DocumentType=\"Script\" Template=\"Novel\" Version=\"1\">\n");
        
        // Title page
        output.push_str("  <TitlePage>\n");
        output.push_str(&format!("    <Content><Paragraph><Text>{}</Text></Paragraph></Content>\n", 
                               self.escape_xml(&content.title)));
        if let Some(author) = &content.author {
            output.push_str(&format!("    <Content><Paragraph><Text>by {}</Text></Paragraph></Content>\n", 
                                   self.escape_xml(author)));
        }
        output.push_str("  </TitlePage>\n");
        
        // Content
        output.push_str("  <Content>\n");
        for scene in &content.scenes {
            if let Some(title) = &scene.title {
                output.push_str(&format!("    <Paragraph Type=\"Scene Heading\"><Text>{}</Text></Paragraph>\n", 
                                       self.escape_xml(title)));
            }
            
            // Convert content to paragraphs
            for paragraph in scene.content.split("\n\n") {
                if !paragraph.trim().is_empty() {
                    output.push_str(&format!("    <Paragraph Type=\"Action\"><Text>{}</Text></Paragraph>\n", 
                                           self.escape_xml(paragraph.trim())));
                }
            }
        }
        output.push_str("  </Content>\n");
        output.push_str("</FinalDraft>\n");

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(self.estimate_page_count(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    // Helper methods
    fn format_standard_manuscript_text(&self, content: &str) -> String {
        content
            .split("\n\n")
            .map(|paragraph| {
                if paragraph.trim().is_empty() {
                    String::new()
                } else {
                    format!("    {}", paragraph.trim()) // Indent first line
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    fn build_docx_content(&self, content: &ManuscriptContent, options: &ExportOptions) -> Result<Vec<u8>> {
        // This would use docx-rs library to create proper DOCX format
        // For now, return placeholder
        Ok(b"DOCX content placeholder".to_vec())
    }

    fn build_html_content(&self, content: &ManuscriptContent, options: &ExportOptions) -> Result<String> {
        let mut html = String::new();
        html.push_str("<!DOCTYPE html>\n<html>\n<head>\n");
        html.push_str(&format!("  <title>{}</title>\n", self.escape_html(&content.title)));
        html.push_str("  <meta charset=\"UTF-8\">\n");
        html.push_str("  <style>\n");
        html.push_str(&format!("    body {{ font-family: '{}', serif; font-size: {}pt; line-height: {:.1}; }}\n", 
                             options.font_settings.font_family, 
                             options.font_settings.font_size,
                             options.font_settings.line_spacing));
        html.push_str("    .chapter { page-break-before: always; }\n");
        html.push_str("    .scene { margin-bottom: 2em; }\n");
        html.push_str("  </style>\n");
        html.push_str("</head>\n<body>\n");

        html.push_str(&format!("  <h1>{}</h1>\n", self.escape_html(&content.title)));
        if let Some(author) = &content.author {
            html.push_str(&format!("  <p><em>by {}</em></p>\n", self.escape_html(author)));
        }

        let mut current_chapter = 0;
        for scene in &content.scenes {
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num != current_chapter {
                    current_chapter = chapter_num;
                    html.push_str(&format!("  <h2 class=\"chapter\">Chapter {}</h2>\n", chapter_num));
                }
            }

            html.push_str("  <div class=\"scene\">\n");
            if let Some(title) = &scene.title {
                html.push_str(&format!("    <h3>{}</h3>\n", self.escape_html(title)));
            }

            for paragraph in scene.content.split("\n\n") {
                if !paragraph.trim().is_empty() {
                    html.push_str(&format!("    <p>{}</p>\n", self.escape_html(paragraph.trim())));
                }
            }
            html.push_str("  </div>\n");
        }

        html.push_str("</body>\n</html>");
        Ok(html)
    }

    fn build_epub_html(&self, content: &ManuscriptContent, options: &ExportOptions) -> Result<String> {
        // Simplified EPUB HTML
        self.build_html_content(content, options)
    }

    async fn write_text_file(&self, path: &PathBuf, content: &str) -> Result<u64> {
        fs::write(path, content.as_bytes())
            .map_err(|e| anyhow!("Failed to write file: {}", e))?;
        
        let metadata = fs::metadata(path)
            .map_err(|e| anyhow!("Failed to get file metadata: {}", e))?;
        
        Ok(metadata.len())
    }

    fn estimate_page_count(&self, content: &ManuscriptContent) -> usize {
        // Standard manuscript: ~250 words per page
        (content.metadata.word_count + 249) / 250
    }

    fn escape_html(&self, text: &str) -> String {
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }

    fn escape_xml(&self, text: &str) -> String {
        text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&apos;")
    }

    fn escape_latex(&self, text: &str) -> String {
        text.replace("\\", "\\textbackslash{}")
            .replace("{", "\\{")
            .replace("}", "\\}")
            .replace("$", "\\$")
            .replace("&", "\\&")
            .replace("%", "\\%")
            .replace("#", "\\#")
            .replace("^", "\\textasciicircum{}")
            .replace("_", "\\_")
            .replace("~", "\\textasciitilde{}")
    }
}

// Tauri commands
#[tauri::command]
pub async fn export_manuscript(
    content: ManuscriptContent,
    options: ExportOptions,
) -> Result<ExportResult, String> {
    let service = ExportService::new();
    service.export_manuscript(content, options)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_export_formats() -> Result<Vec<ExportFormat>, String> {
    Ok(vec![
        ExportFormat::StandardManuscript,
        ExportFormat::Docx,
        ExportFormat::PDF,
        ExportFormat::Markdown,
        ExportFormat::LaTeX,
        ExportFormat::Epub,
        ExportFormat::Mobi,
        ExportFormat::Scrivener,
        ExportFormat::FinalDraft,
    ])
}

#[tauri::command]
pub async fn validate_export_options(options: ExportOptions) -> Result<Vec<String>, String> {
    let mut warnings = Vec::new();
    
    // Validate output path
    if let Some(parent) = options.output_path.parent() {
        if !parent.exists() {
            warnings.push(format!("Output directory does not exist: {:?}", parent));
        }
    }

    // Format-specific validations
    match options.format {
        ExportFormat::PDF => {
            warnings.push("PDF export may require additional setup".to_string());
        },
        ExportFormat::Epub | ExportFormat::Mobi => {
            warnings.push("eBook formats may have limited formatting options".to_string());
        },
        ExportFormat::FinalDraft => {
            warnings.push("Final Draft format is optimized for screenplays".to_string());
        },
        _ => {}
    }

    Ok(warnings)
}