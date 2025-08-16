# Narrative Surgeon

A professional desktop application for manuscript editing, analysis, and submission tracking built with Next.js, Tauri, and AI-powered writing assistance.

## Overview

Narrative Surgeon is a comprehensive writing tool designed specifically for fiction authors and literary professionals. It combines advanced text editing capabilities with AI-powered manuscript analysis, publishing workflow management, and industry-standard formatting tools.

## Key Features

### 📝 Advanced Text Editor
- **Tiptap-based Rich Text Editor** with professional manuscript formatting
- **Track Changes** and revision history management
- **Focus Mode** and **Typewriter Mode** for distraction-free writing
- **Scene Management** with chapter/scene organization and reordering
- **Comments and Annotations** system for editorial feedback

### 🤖 AI-Powered Analysis
- **Real-time Manuscript Analysis** for pacing, tension, and emotional arcs
- **Opening Analysis** to optimize first pages for agent submissions
- **Character Consistency Tracking** across scenes and chapters
- **Performance Analytics** and writing progress monitoring

### 📚 Publishing Workflow
- **Query Letter Generation** with AI optimization
- **Synopsis Creation** tools for different length requirements
- **Agent Database** integration for submission tracking
- **Submission Management** with response tracking and follow-up scheduling

### 🎯 Professional Export
- **Shunn Manuscript Format** compliance for industry submissions
- **DOCX and PDF Export** with customizable formatting
- **Batch Export** capabilities for multiple formats
- **Version Control** with automated backups

## Technology Stack

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Desktop**: Tauri v2 with Rust backend
- **Database**: SQLite with Tauri SQL plugin
- **UI Components**: Radix UI primitives with Tailwind CSS
- **State Management**: Zustand store
- **Rich Text**: Tiptap editor with custom extensions
- **Testing**: Jest (unit), Playwright (integration/E2E)
- **AI Integration**: Anthropic Claude and OpenAI APIs

## Prerequisites

- **Node.js** 18+ and npm
- **Rust** (latest stable) and Cargo
- **Git** for version control

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/narrative-surgeon.git
   cd narrative-surgeon
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Rust dependencies**
   ```bash
   cd src-tauri
   cargo build
   cd ..
   ```

## Development

### Running the Application

```bash
# Start Next.js development server only
npm run dev

# Run full Tauri desktop application
npm run tauri:dev
```

The web interface will be available at `http://localhost:3000`, and the Tauri app will open in a native desktop window.

### Available Scripts

```bash
# Development
npm run dev              # Next.js dev server
npm run tauri:dev        # Tauri desktop app
npm run build            # Build Next.js app
npm run tauri:build      # Build desktop installer

# Testing
npm run test             # Run unit tests
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:e2e         # Run end-to-end tests
npm run test:all         # Run all test suites

# Code Quality
npm run lint             # ESLint checks
npx tsc --noEmit         # TypeScript type checking

# Analysis
npm run analyze          # Bundle analysis
npm run profile:build    # Build profiling
npm run bundle:analyze   # Bundle size analysis
```

## Project Structure

```
narrative-surgeon/
├── src/                     # Next.js frontend source
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   │   ├── analysis/        # AI analysis components
│   │   ├── editor/          # Text editor components
│   │   ├── extensions/      # Custom Tiptap extensions
│   │   └── ui/              # Shared UI components
│   ├── lib/                 # Utilities and integrations
│   ├── store/               # Zustand state management
│   └── types/               # TypeScript definitions
├── src-tauri/               # Rust backend
│   ├── src/                 # Rust source code
│   ├── migrations/          # Database migrations
│   └── icons/               # App icons
├── playwright/              # Test suites
├── public/                  # Static assets
└── scripts/                 # Build and utility scripts
```

## Core Data Models

The application manages manuscripts through a hierarchical structure:

**Manuscript** → **Scenes** → **Characters** + **Analysis Data**

### Key Entities
- **Manuscript**: Top-level document with metadata (title, author, genre, word count)
- **Scene**: Individual scenes with content, POV character, and chapter organization
- **Character**: Character profiles with consistency tracking
- **Analysis Data**: AI-generated insights on pacing, emotion, and story structure
- **Publishing Tools**: Query letters, synopses, agent database, submission tracking

## Database Schema

The SQLite database uses the following key tables:
- `manuscripts` - Manuscript metadata and settings
- `scenes` - Scene content and organization
- `characters` - Character profiles and development arcs
- `scene_analysis` - AI analysis results per scene
- `opening_analysis` - Specialized first-page analysis
- `query_letters` - Generated query letter versions
- `submissions` - Agent submission tracking

See `src-tauri/migrations/` for complete schema definitions.

## AI Integration

### Supported Providers
- **Anthropic Claude** (recommended for analysis)
- **OpenAI GPT** (alternative for generation tasks)

### Features
- Real-time scene analysis during writing
- Manuscript opening optimization
- Query letter generation and refinement
- Character consistency checking
- Pacing and tension analysis

### Configuration
Set API keys in the application settings or environment variables:
```bash
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

## Testing

The project includes comprehensive testing:

### Unit Tests (Jest)
- Component testing with React Testing Library
- Utility function testing
- Store and state management testing

### Integration Tests (Playwright)
- Tauri command testing
- Database operation testing
- File import/export testing

### E2E Tests (Playwright)
- Complete manuscript workflow testing
- Export format validation
- Cross-platform compatibility testing

Run tests with:
```bash
npm run test:all
```

## Export Formats

### Manuscript Formats
- **Shunn Standard** - Industry-standard manuscript format
- **DOCX** - Microsoft Word compatible
- **PDF** - Print-ready format
- **Plain Text** - Simple text export

### Publishing Packages
- **Query Package** - Query letter + synopsis + first pages
- **Submission Package** - Complete manuscript + cover materials
- **Synopsis Only** - Various length synopsis formats

## Performance Optimization

The application includes several performance optimizations:
- **Virtual Scrolling** for large manuscripts
- **Lazy Loading** of scene content
- **Background Processing** for AI analysis
- **Efficient State Management** with Zustand
- **Bundle Optimization** with Next.js

Monitor performance with:
```bash
npm run test:performance
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test:all`)
5. Run linting (`npm run lint`)
6. Commit changes (`git commit -m 'Add amazing feature'`)
7. Push to branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure TypeScript type safety
- Test on multiple platforms when possible

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, feature requests, or bug reports:
- Open an issue on GitHub
- Check the [User Guide](docs/USER_GUIDE.md) for usage instructions
- Review [troubleshooting](docs/TROUBLESHOOTING.md) for common issues

## Roadmap

### Upcoming Features
- **Collaboration Tools** - Multi-author editing and review
- **Advanced Analytics** - Detailed writing metrics and insights
- **Plugin System** - Third-party extension support
- **Cloud Sync** - Cross-device manuscript synchronization
- **Advanced Export** - More format options and customization

### Platform Support
- **Windows** ✅ (Primary)
- **macOS** ✅ (Supported)
- **Linux** ✅ (Supported)
- **Web Version** 🚧 (Planned)

---

**Narrative Surgeon** - Professional manuscript editing and submission management for serious writers.