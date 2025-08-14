#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Dependency analysis for Narrative Surgeon refactoring
function analyzeDependencies() {
    const packageJsonPath = './narrative-surgeon-desktop/package.json';
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    const analysis = {
        remove: [
            // Multi-manuscript management
            { name: "@dnd-kit/core", reason: "Used only for manuscript list reordering - single manuscript app" },
            { name: "@dnd-kit/sortable", reason: "Manuscript list drag-and-drop - not needed" },
            { name: "@dnd-kit/utilities", reason: "DnD utilities - not needed" },
            { name: "react-dnd", reason: "Alternative drag-drop - used for multi-manuscript features" },
            { name: "react-dnd-html5-backend", reason: "DnD backend - not needed" },
            
            // Submission tracking (over-engineered for single manuscript)
            { name: "@radix-ui/react-checkbox", reason: "Used in submission tracking UI - removing feature" },
            { name: "@radix-ui/react-dropdown-menu", reason: "Complex menus for multi-manuscript - simplifying" },
            
            // Complex UI components not needed for focused editor
            { name: "@radix-ui/react-context-menu", reason: "Complex context menus - simplifying to basic operations" },
            { name: "class-variance-authority", reason: "Over-engineered component variants - custom CSS instead" },
            { name: "clsx", reason: "Complex className management - simple string concatenation" },
            { name: "tailwind-merge", reason: "Complex Tailwind merging - not needed with simplified UI" },
            
            // Testing for removed features
            { name: "@playwright/test", reason: "E2E tests for multi-manuscript workflows - need simpler testing" },
            { name: "@testing-library/user-event", reason: "Complex user interaction testing - focus on unit tests" }
        ],
        
        keep: [
            // Core editor functionality
            { name: "@tiptap/react", location: "src/components/editor/TiptapEditor.tsx", purpose: "Core rich text editing" },
            { name: "@tiptap/starter-kit", location: "src/components/editor/", purpose: "Basic editor extensions" },
            { name: "@tiptap/extension-character-count", location: "src/components/WritingStats.tsx", purpose: "Word count tracking" },
            { name: "@tiptap/core", location: "src/components/extensions/", purpose: "Custom editor extensions" },
            
            // Desktop integration
            { name: "@tauri-apps/api", location: "src/lib/tauri.ts", purpose: "Desktop app integration" },
            { name: "@tauri-apps/plugin-sql", location: "src-tauri/src/db.rs", purpose: "SQLite database" },
            { name: "@tauri-apps/plugin-dialog", location: "src-tauri/src/fs.rs", purpose: "File operations" },
            
            // Core React/Next.js
            { name: "next", location: "src/app/", purpose: "Application framework" },
            { name: "react", location: "src/components/", purpose: "UI framework" },
            { name: "react-dom", location: "src/components/", purpose: "DOM rendering" },
            { name: "typescript", location: "all .ts/.tsx files", purpose: "Type safety" },
            
            // State management
            { name: "zustand", location: "src/store/manuscriptStore.ts", purpose: "State management" },
            
            // Styling
            { name: "tailwindcss", location: "all components", purpose: "Styling framework" },
            { name: "lucide-react", location: "src/components/ui/", purpose: "Icon library" },
            
            // Essential utilities
            { name: "uuid", location: "src/store/manuscriptStore.ts", purpose: "Unique ID generation" },
            { name: "diff", location: "src/lib/analysis/", purpose: "Text difference tracking" }
        ],
        
        add: [
            // Version control and diffing
            { name: "immer", purpose: "Immutable state updates for version control" },
            { name: "jsdiff", purpose: "Advanced text diffing for chapter consistency" },
            { name: "semver", purpose: "Version control for chapter arrangements" },
            
            // Performance optimization
            { name: "react-window", purpose: "Virtual scrolling for large manuscript text" },
            { name: "react-virtualized-auto-sizer", purpose: "Auto-sizing for virtual scrolling" },
            
            // Enhanced editor features
            { name: "@tiptap/extension-collaboration-cursor", purpose: "Multiple version editing indicators" },
            { name: "@tiptap/extension-gapcursor", purpose: "Better cursor positioning in complex layouts" },
            
            // Simplified testing
            { name: "vitest", purpose: "Fast unit testing replacing complex Jest setup" },
            { name: "@testing-library/react", purpose: "Component testing (keep this one)" }
        ]
    };
    
    return analysis;
}

function generateCleanupCommands(analysis) {
    const removeCmd = `npm uninstall ${analysis.remove.map(dep => dep.name).join(' ')}`;
    const addCmd = `npm install ${analysis.add.map(dep => dep.name).join(' ')}`;
    
    return {
        cleanup: [
            "# Backup current state",
            "git add . && git commit -m 'Backup before dependency cleanup'",
            "",
            "# Remove unused dependencies",
            removeCmd,
            "",
            "# Add new dependencies",
            addCmd,
            "",
            "# Verify TypeScript compilation",
            "cd narrative-surgeon-desktop && npx tsc --noEmit",
            "",
            "# Clean node_modules and reinstall",
            "rm -rf node_modules package-lock.json",
            "npm install"
        ].join('\n')
    };
}

// Execute analysis
const analysis = analyzeDependencies();
const commands = generateCleanupCommands(analysis);

console.log('=== DEPENDENCY ANALYSIS RESULTS ===\n');
console.log('REMOVE (' + analysis.remove.length + ' packages):');
analysis.remove.forEach(dep => {
    console.log(`  - ${dep.name}: ${dep.reason}`);
});

console.log('\nKEEP (' + analysis.keep.length + ' packages):');
analysis.keep.forEach(dep => {
    console.log(`  - ${dep.name}: ${dep.purpose} (${dep.location})`);
});

console.log('\nADD (' + analysis.add.length + ' packages):');
analysis.add.forEach(dep => {
    console.log(`  - ${dep.name}: ${dep.purpose}`);
});

console.log('\n=== CLEANUP COMMANDS ===\n');
console.log(commands.cleanup);

// Save detailed analysis to file
fs.writeFileSync('./dependency-analysis.json', JSON.stringify(analysis, null, 2));
console.log('\nDetailed analysis saved to dependency-analysis.json');