# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Running
- `npm run dev` - Start Next.js development server on port 3000
- `npm run build` - Build Next.js application for production
- `npm run tauri dev` - Run the full Tauri desktop application in development mode
- `npm run tauri build` - Build production desktop application with installers

### Testing
- `npm run test` - Run Jest unit tests
- `npm run test:unit` - Run unit tests specifically (src/tests/unit)
- `npm run test:integration` - Run Playwright integration tests
- `npm run test:e2e` - Run Playwright end-to-end tests
- `npm run test:all` - Run all test suites sequentially

### Linting and Type Checking
- `npm run lint` - Run Next.js ESLint checks
- `npx tsc --noEmit` - Run TypeScript type checking (no tsc script in package.json)

## Project Architecture

### Technology Stack
- **Frontend**: Next.js 15 with TypeScript, React 19, Tailwind CSS
- **Desktop**: Tauri v2 (Rust backend)
- **Database**: SQLite with Tauri SQL plugin
- **UI Components**: Radix UI primitives with custom components
- **State Management**: Zustand store
- **Rich Text**: Tiptap editor with custom extensions
- **Testing**: Jest (unit), Playwright (integration/E2E)

### Directory Structure
```
narrative-surgeon-desktop/
├── src/                          # Next.js frontend
│   ├── app/                      # Next.js 14+ app router pages
│   ├── components/               # React components
│   │   ├── analysis/             # AI-powered manuscript analysis
│   │   ├── editor/               # Text editor components (Tiptap)
│   │   ├── extensions/           # Custom Tiptap extensions
│   │   ├── submissions/          # Publishing workflow tools
│   │   └── ui/                   # Shared UI components (Radix-based)
│   ├── store/                    # Zustand state management
│   ├── lib/                      # Utilities and integrations
│   └── types/                    # TypeScript type definitions
├── src-tauri/                    # Rust backend
│   ├── src/                      # Rust source code
│   └── migrations/               # Database migrations
└── playwright/                   # Test files
```

### Core Data Models
The application centers around manuscripts broken down into scenes:

**Manuscript** → **Scenes** → **Characters** + **Analysis Data**

Key entities (see `src/types/index.ts` and `src-tauri/migrations/001_initial.sql`):
- `Manuscript`: Top-level document with metadata (title, author, genre, word count)
- `Scene`: Individual scenes with text content, chapter/scene numbering, POV character
- `Character`: Character profiles linked to manuscripts  
- `SceneAnalysis`: AI analysis results (emotion, pacing, tension)
- `OpeningAnalysis`: Specialized analysis for manuscript openings
- Publishing tools: `QueryLetter`, `Synopsis`, `AgentDatabase`, `SubmissionTracking`

### State Management
- **Main Store**: `src/store/manuscriptStore.ts` (Zustand)
- Manages manuscripts, scenes, characters, revision notes
- All database operations go through Tauri commands via `invoke()`
- State is synchronized with SQLite database in Rust backend

### Tauri Integration
- **Frontend API**: `src/lib/tauri.ts` - wrapper around Tauri invoke calls
- **Backend Commands**: `src-tauri/src/commands.rs` - Rust command handlers
- **Database**: `src-tauri/src/db.rs` - SQLite operations
- **File Operations**: `src-tauri/src/fs.rs` - import/export functionality

### Editor Features
The app includes a sophisticated text editor built on Tiptap:
- **Core Editor**: `src/components/editor/TiptapEditor.tsx`
- **Extensions**: Track changes, comments, focus mode, typewriter mode
- **Scene Management**: Split/merge scenes, reorder chapters
- **Export Formats**: Shunn manuscript format, DOCX, PDF

### Testing Strategy
- **Unit Tests**: Jest with React Testing Library (`src/tests/unit/`)
- **Integration Tests**: Playwright testing Tauri commands (`playwright/integration/`)
- **E2E Tests**: Full application workflow tests (`playwright/e2e/`)
- **Mocks**: Component mocks in `src/tests/__mocks__/`

### AI Integration Features
- Real-time manuscript analysis during writing
- Opening analysis for agent submission readiness
- Query letter generation with optimization
- Agent matching based on manuscript characteristics
- Performance analytics and success prediction

### File Operations
- Import: Word docs, text files, batch imports
- Export: Industry-standard formats (Shunn, query packages, synopses)
- Backup: Automated manuscript backups
- Version control: Track changes and revision history

## Working with the Codebase

### When Adding New Features
1. Check if database schema changes are needed (`src-tauri/migrations/`)
2. Update TypeScript types (`src/types/index.ts`)
3. Add Tauri commands if backend operations needed (`src-tauri/src/commands.rs`)
4. Update Zustand store for state management (`src/store/manuscriptStore.ts`)
5. Create React components following existing UI patterns

### Testing New Code
- Always run `npm run test:all` before committing
- Write unit tests for utility functions and components
- Add integration tests for new Tauri commands
- Test export/import functionality with real files

### Database Changes
- Create new migration files in `src-tauri/migrations/`
- Update the migration list in `src-tauri/src/lib.rs`
- Ensure TypeScript types match database schema
- Test migration both up and down paths

### Common Patterns
- Use Tauri `invoke()` for all database operations
- Handle loading states and errors in components
- Follow existing component structure in `src/components/ui/`
- Use Zustand store methods rather than direct state mutation
- Implement proper TypeScript types for all new interfaces