use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use chrono::{DateTime, Utc};
use anyhow::{Result, anyhow};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    // Industry standard formats
    #[serde(rename = "shunn_manuscript")]
    ShunnManuscript,        // Industry standard manuscript format
    #[serde(rename = "query_package")]
    QueryPackage,           // Query + synopsis + sample pages
    #[serde(rename = "synopsis_short")]
    SynopsisShort,          // 1-page synopsis
    #[serde(rename = "synopsis_long")]
    SynopsisLong,           // 2-5 page synopsis
    #[serde(rename = "pitch_sheet")]
    PitchSheet,             // One-page marketing sheet
    #[serde(rename = "book_proposal")]
    BookProposal,           // Non-fiction proposal format
    #[serde(rename = "screenplay_final")]
    ScreenplayFinal,        // Final draft screenplay format
    #[serde(rename = "stage_play_standard")]
    StagePlayStandard,      // Standard stage play format
    
    // Legacy formats
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
            // Industry standard formats
            ExportFormat::ShunnManuscript => self.export_shunn_manuscript(content, options).await,
            ExportFormat::QueryPackage => self.export_query_package(content, options).await,
            ExportFormat::SynopsisShort => self.export_synopsis(content, options, 1).await,
            ExportFormat::SynopsisLong => self.export_synopsis(content, options, 5).await,
            ExportFormat::PitchSheet => self.export_pitch_sheet(content, options).await,
            ExportFormat::BookProposal => self.export_book_proposal(content, options).await,
            ExportFormat::ScreenplayFinal => self.export_screenplay_final(content, options).await,
            ExportFormat::StagePlayStandard => self.export_stage_play(content, options).await,
            
            // Legacy formats
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
        fs::write(&options.output_path, &docx_content)
            .map_err(|e| anyhow!("Failed to write DOCX file: {}", e))?;
        let file_size = fs::metadata(&options.output_path)
            .map_err(|e| anyhow!("Failed to get file metadata: {}", e))?
            .len();

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

    // Industry standard publishing format implementations
    
    async fn export_shunn_manuscript(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Shunn manuscript format requirements
        // 1. Header with author info (upper left)
        if let Some(author) = &content.author {
            output.push_str(&format!("{}\n", author));
        }
        output.push_str(&format!("Approximately {} words\n\n", content.metadata.word_count));

        // 2. Title page centered
        output.push_str("\n\n\n\n\n\n\n\n");
        output.push_str(&format!("                        {}\n", content.title.to_uppercase()));
        output.push_str("\n\n");
        output.push_str("                            by\n\n");
        if let Some(author) = &content.author {
            output.push_str(&format!("                        {}\n", author));
        }
        output.push_str("\f"); // Form feed for new page

        // 3. Content with proper headers and formatting
        let mut page_count = 2; // Start after title page
        let mut current_chapter = 0;
        
        for scene in &content.scenes {
            // Chapter handling
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num != current_chapter {
                    if current_chapter > 0 {
                        output.push_str("\f"); // New page for new chapter
                        page_count += 1;
                    }
                    current_chapter = chapter_num;
                    
                    // Chapter header
                    output.push_str("\n\n\n");
                    output.push_str(&format!("                        CHAPTER {}\n", chapter_num));
                    output.push_str("\n\n");
                }
            }

            // Page header (every 25 lines approximately)
            let lines_in_scene = scene.content.lines().count();
            if lines_in_scene > 0 && (page_count % 2 == 0) { // Every other page for headers
                let author_last = content.author.as_ref()
                    .and_then(|a| a.split_whitespace().last())
                    .unwrap_or("");
                output.push_str(&format!("{} / {} / {}\n\n", 
                    author_last, content.title.to_uppercase(), page_count));
            }

            // Scene content with proper indentation
            let formatted_content = self.format_shunn_text(&scene.content);
            output.push_str(&formatted_content);
            output.push_str("\n\n");

            page_count += (lines_in_scene + 24) / 25; // Estimate pages
        }

        let file_size = self.write_text_file(&options.output_path, &output).await?;

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

    async fn export_query_package(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = Vec::new();
        let errors = Vec::new();

        // Query package header
        output.push_str("QUERY SUBMISSION PACKAGE\n");
        output.push_str("========================\n\n");
        
        output.push_str(&format!("Title: {}\n", content.title));
        if let Some(author) = &content.author {
            output.push_str(&format!("Author: {}\n", author));
        }
        if let Some(genre) = &content.genre {
            output.push_str(&format!("Genre: {}\n", genre));
        }
        output.push_str(&format!("Word Count: {}\n", content.metadata.word_count));
        output.push_str("\n");

        // Query letter section (placeholder)
        output.push_str("QUERY LETTER\n");
        output.push_str("============\n\n");
        output.push_str("[Query letter content would be inserted here]\n\n");

        // Synopsis section
        output.push_str("SYNOPSIS\n");
        output.push_str("========\n\n");
        let synopsis = self.generate_synopsis(&content, 250)?; // 1-page synopsis
        output.push_str(&synopsis);
        output.push_str("\n\n");

        // Sample pages (first 5 pages)
        output.push_str("SAMPLE PAGES (First 5 Pages)\n");
        output.push_str("=============================\n\n");
        let sample_pages = self.extract_sample_pages(&content, 5)?;
        output.push_str(&sample_pages);

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

    async fn export_synopsis(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
        max_pages: usize,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = Vec::new();
        let errors = Vec::new();

        // Synopsis header
        output.push_str(&format!("{}\n", content.title.to_uppercase()));
        if let Some(author) = &content.author {
            output.push_str(&format!("by {}\n", author));
        }
        output.push_str(&format!("({} words)\n\n", content.metadata.word_count));

        // Generate synopsis content
        let target_words = max_pages * 250;
        let synopsis = self.generate_synopsis(&content, target_words)?;
        output.push_str(&synopsis);

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(max_pages),
            word_count: synopsis.split_whitespace().count(),
            errors,
            warnings,
        })
    }

    async fn export_pitch_sheet(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = Vec::new();
        let errors = Vec::new();

        // One-page pitch sheet format
        output.push_str(&format!("{}\n", content.title.to_uppercase()));
        if let Some(genre) = &content.genre {
            if let Some(author) = &content.author {
                output.push_str(&format!("A {} novel by {}\n\n", genre, author));
            } else {
                output.push_str(&format!("A {} novel\n\n", genre));
            }
        }

        output.push_str(&format!("Word Count: {}\n", content.metadata.word_count));
        output.push_str(&format!("Page Count: ~{}\n\n", self.estimate_page_count(&content)));

        // Logline/hook (first compelling paragraph)
        if let Some(first_scene) = content.scenes.first() {
            let first_paragraph = first_scene.content.split("\n\n").next().unwrap_or("");
            if !first_paragraph.is_empty() {
                output.push_str("HOOK:\n");
                output.push_str(&format!("{}\n\n", first_paragraph.trim()));
            }
        }

        // Market positioning
        output.push_str("MARKET POSITIONING:\n");
        output.push_str("[Comparable titles and target audience]\n\n");

        // Author platform
        output.push_str("AUTHOR PLATFORM:\n");
        output.push_str("[Author credentials and platform details]\n");

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(1),
            word_count: output.split_whitespace().count(),
            errors,
            warnings,
        })
    }

    async fn export_book_proposal(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = Vec::new();
        let errors = Vec::new();

        // Book proposal format (primarily for non-fiction)
        output.push_str("BOOK PROPOSAL\n");
        output.push_str("=============\n\n");

        output.push_str(&format!("Title: {}\n", content.title));
        if let Some(author) = &content.author {
            output.push_str(&format!("Author: {}\n", author));
        }
        output.push_str(&format!("Word Count: {}\n", content.metadata.word_count));
        output.push_str("\n");

        // Overview
        output.push_str("OVERVIEW\n");
        output.push_str("--------\n");
        let overview = self.generate_synopsis(&content, 500)?;
        output.push_str(&overview);
        output.push_str("\n\n");

        // Market analysis
        output.push_str("MARKET ANALYSIS\n");
        output.push_str("---------------\n");
        if let Some(genre) = &content.genre {
            output.push_str(&format!("Genre: {}\n", genre));
        }
        output.push_str("Target Audience: [Define target readership]\n");
        output.push_str("Competitive Titles: [List 3-5 comparable books]\n\n");

        // Table of contents
        output.push_str("TABLE OF CONTENTS\n");
        output.push_str("-----------------\n");
        let mut chapter_count = 0;
        for scene in &content.scenes {
            if let Some(chapter_num) = scene.chapter_number {
                if chapter_num > chapter_count {
                    chapter_count = chapter_num;
                    output.push_str(&format!("Chapter {}: ", chapter_num));
                    if let Some(title) = &scene.title {
                        output.push_str(title);
                    } else {
                        output.push_str("[Chapter Title]");
                    }
                    output.push_str("\n");
                }
            }
        }
        output.push_str("\n");

        // Sample chapters
        output.push_str("SAMPLE CHAPTERS\n");
        output.push_str("===============\n\n");
        let sample = self.extract_sample_pages(&content, 20)?;
        output.push_str(&sample);

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

    async fn export_screenplay_final(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = vec!["Converting prose to screenplay format".to_string()];
        let errors = Vec::new();

        // Screenplay title page
        output.push_str("\n\n\n\n\n\n\n");
        output.push_str(&format!("                        {}\n", content.title.to_uppercase()));
        output.push_str("\n\n");
        output.push_str("                      Written by\n\n");
        if let Some(author) = &content.author {
            output.push_str(&format!("                        {}\n", author));
        }
        output.push_str("\f"); // New page

        // Screenplay content
        output.push_str("FADE IN:\n\n");

        for scene in &content.scenes {
            // Scene heading
            if let Some(title) = &scene.title {
                output.push_str(&format!("EXT./INT. {} - DAY\n\n", title.to_uppercase()));
            }

            // Convert prose to screenplay format
            let screenplay_content = self.convert_to_screenplay(&scene.content);
            output.push_str(&screenplay_content);
            output.push_str("\n\n");
        }

        output.push_str("FADE OUT.\n\nTHE END\n");

        let file_size = self.write_text_file(&options.output_path, &output).await?;

        Ok(ExportResult {
            success: true,
            output_path: Some(options.output_path.clone()),
            file_size: Some(file_size),
            page_count: Some(self.estimate_screenplay_pages(&content)),
            word_count: content.metadata.word_count,
            errors,
            warnings,
        })
    }

    async fn export_stage_play(
        &self,
        content: ManuscriptContent,
        options: ExportOptions,
    ) -> Result<ExportResult> {
        let mut output = String::new();
        let warnings = vec!["Converting prose to stage play format".to_string()];
        let errors = Vec::new();

        // Stage play format
        output.push_str(&format!("{}\n", content.title.to_uppercase()));
        if let Some(author) = &content.author {
            output.push_str(&format!("by {}\n", author));
        }
        output.push_str("\n\nCHARACTERS:\n");
        output.push_str("[Character list to be extracted from dialogue]\n\n");

        output.push_str("ACT I\n\n");
        output.push_str("SCENE 1\n\n");

        for scene in &content.scenes {
            // Stage directions and dialogue
            let stage_content = self.convert_to_stage_play(&scene.content);
            output.push_str(&stage_content);
            output.push_str("\n\n");
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

    // Helper methods for industry formats

    fn format_shunn_text(&self, content: &str) -> String {
        content.split("\n\n")
            .map(|paragraph| {
                if paragraph.trim().is_empty() {
                    String::new()
                } else {
                    // Proper paragraph indentation for Shunn format
                    format!("    {}", paragraph.trim())
                }
            })
            .collect::<Vec<_>>()
            .join("\n\n")
    }

    fn generate_synopsis(&self, content: &ManuscriptContent, target_words: usize) -> Result<String> {
        // Extract key story elements and create synopsis
        let mut synopsis = String::new();
        
        // Combine all scene content
        let full_text: String = content.scenes.iter()
            .map(|scene| scene.content.as_str())
            .collect::<Vec<_>>()
            .join(" ");
        
        // Extract approximately the right amount of content
        let words: Vec<&str> = full_text.split_whitespace().collect();
        let synopsis_words = if words.len() > target_words {
            // Take first portion and summarize
            let portion = words[..target_words].join(" ");
            format!("{}\n\n[Complete synopsis would continue with major plot points through to the conclusion.]", portion)
        } else {
            full_text
        };

        synopsis.push_str(&synopsis_words);
        Ok(synopsis)
    }

    fn extract_sample_pages(&self, content: &ManuscriptContent, page_count: usize) -> Result<String> {
        let words_per_page = 250;
        let target_words = page_count * words_per_page;
        
        let mut sample = String::new();
        let mut word_count = 0;
        
        for scene in &content.scenes {
            let scene_words: Vec<&str> = scene.content.split_whitespace().collect();
            
            if word_count + scene_words.len() > target_words {
                // Include partial scene
                let remaining_words = target_words - word_count;
                let partial_scene = scene_words[..remaining_words].join(" ");
                sample.push_str(&partial_scene);
                break;
            } else {
                // Include full scene
                if let Some(title) = &scene.title {
                    sample.push_str(&format!("\n{}\n\n", title));
                }
                sample.push_str(&scene.content);
                sample.push_str("\n\n");
                word_count += scene_words.len();
            }
        }
        
        Ok(sample)
    }

    fn convert_to_screenplay(&self, content: &str) -> String {
        let mut screenplay = String::new();
        
        for paragraph in content.split("\n\n") {
            if paragraph.trim().is_empty() {
                continue;
            }
            
            // Simple conversion - dialogue vs action
            if paragraph.contains('"') {
                // Extract dialogue
                screenplay.push_str("                    CHARACTER\n");
                let dialogue = paragraph.replace('"', "").trim().to_string();
                screenplay.push_str(&format!("          {}\n\n", dialogue));
            } else {
                // Action line
                screenplay.push_str(&format!("{}\n\n", paragraph.to_uppercase()));
            }
        }
        
        screenplay
    }

    fn convert_to_stage_play(&self, content: &str) -> String {
        let mut stage_play = String::new();
        
        for paragraph in content.split("\n\n") {
            if paragraph.trim().is_empty() {
                continue;
            }
            
            if paragraph.contains('"') {
                // Dialogue
                stage_play.push_str("CHARACTER: ");
                let dialogue = paragraph.replace('"', "");
                stage_play.push_str(&format!("{}\n\n", dialogue.trim()));
            } else {
                // Stage direction
                stage_play.push_str(&format!("({})\n\n", paragraph.trim()));
            }
        }
        
        stage_play
    }

    fn estimate_screenplay_pages(&self, content: &ManuscriptContent) -> usize {
        // Screenplay rule: 1 page per minute, roughly 1 page per 250 words
        content.metadata.word_count / 250
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
        // Industry standard publishing formats
        ExportFormat::ShunnManuscript,
        ExportFormat::QueryPackage,
        ExportFormat::SynopsisShort,
        ExportFormat::SynopsisLong,
        ExportFormat::PitchSheet,
        ExportFormat::BookProposal,
        ExportFormat::ScreenplayFinal,
        ExportFormat::StagePlayStandard,
        
        // General formats
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