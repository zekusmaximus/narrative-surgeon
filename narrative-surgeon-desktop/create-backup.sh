#!/bin/bash

# NARRATIVE SURGEON - COMPREHENSIVE BACKUP SYSTEM
# Creates complete backup with rollback capability

set -e  # Exit on any error

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/refactor_${TIMESTAMP}"
PROJECT_ROOT=$(pwd)
BACKUP_LOG="${BACKUP_DIR}/backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
    echo "[$(date '+%H:%M:%S')] $1" >> "${BACKUP_LOG}" 2>/dev/null || true
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    echo "[ERROR] $1" >> "${BACKUP_LOG}" 2>/dev/null || true
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    echo "[SUCCESS] $1" >> "${BACKUP_LOG}" 2>/dev/null || true
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    echo "[WARNING] $1" >> "${BACKUP_LOG}" 2>/dev/null || true
}

# Verify we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "next.config.js" ]; then
    error "Not in narrative-surgeon-desktop directory. Please cd to the correct location."
    exit 1
fi

log "Starting comprehensive backup process..."

# Create backup directory structure
mkdir -p "${BACKUP_DIR}"
mkdir -p "${BACKUP_DIR}/snapshots"
mkdir -p "${BACKUP_DIR}/metadata"

# Initialize backup log
echo "=== NARRATIVE SURGEON BACKUP LOG ===" > "${BACKUP_LOG}"
echo "Backup started at: $(date)" >> "${BACKUP_LOG}"
echo "Project root: ${PROJECT_ROOT}" >> "${BACKUP_LOG}"
echo "Backup location: ${BACKUP_DIR}" >> "${BACKUP_LOG}"
echo "" >> "${BACKUP_LOG}"

# 1. Git repository backup
log "Creating git repository backup..."
if [ -d ".git" ]; then
    # Create git commit if there are changes
    if ! git diff-index --quiet HEAD --; then
        log "Uncommitted changes detected, creating backup commit..."
        git add .
        git commit -m "Backup commit before refactoring - ${TIMESTAMP}" || warning "Git commit failed, continuing..."
    fi
    
    # Create backup tag
    git tag "backup-${TIMESTAMP}" || warning "Git tag creation failed, continuing..."
    
    # Clone entire repository
    git clone . "${BACKUP_DIR}/snapshots/git_backup" --quiet
    success "Git repository backed up"
else
    warning "No git repository found, skipping git backup"
fi

# 2. File system snapshot
log "Creating complete file system snapshot..."
rsync -av --exclude=node_modules \
          --exclude=.next \
          --exclude=target \
          --exclude=backups \
          --exclude=.git \
          . "${BACKUP_DIR}/snapshots/filesystem/" > /dev/null

success "File system snapshot created"

# 3. Critical files backup with checksums
log "Creating checksums for critical files..."
CRITICAL_FILES=(
    "package.json"
    "package-lock.json"
    "next.config.js"
    "tailwind.config.js"
    "tsconfig.json"
    "jest.config.ts"
    "src-tauri/Cargo.toml"
    "src-tauri/Cargo.lock"
    "src-tauri/tauri.conf.json"
)

MANIFEST_FILE="${BACKUP_DIR}/metadata/file_manifest.txt"
echo "=== CRITICAL FILES MANIFEST ===" > "${MANIFEST_FILE}"
echo "Generated at: $(date)" >> "${MANIFEST_FILE}"
echo "" >> "${MANIFEST_FILE}"

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Create checksum
        if command -v sha256sum &> /dev/null; then
            checksum=$(sha256sum "$file" | cut -d' ' -f1)
        elif command -v shasum &> /dev/null; then
            checksum=$(shasum -a 256 "$file" | cut -d' ' -f1)
        else
            checksum="checksum_unavailable"
        fi
        
        echo "${file}:${checksum}" >> "${MANIFEST_FILE}"
        
        # Copy to backup with timestamp
        cp "$file" "${BACKUP_DIR}/snapshots/${file}.backup"
        log "  ✓ Backed up: $file"
    else
        warning "Critical file not found: $file"
        echo "${file}:FILE_NOT_FOUND" >> "${MANIFEST_FILE}"
    fi
done

# 4. Node modules snapshot (package-lock for restoration)
if [ -f "package-lock.json" ]; then
    cp "package-lock.json" "${BACKUP_DIR}/snapshots/package-lock.json.original"
    success "Package lock file preserved"
fi

# 5. Database backup (if exists)
log "Checking for database files..."
DB_FILES=(
    "src-tauri/narrative_surgeon.db"
    "src-tauri/narrative_surgeon.db-wal"
    "src-tauri/narrative_surgeon.db-shm"
)

for db_file in "${DB_FILES[@]}"; do
    if [ -f "$db_file" ]; then
        cp "$db_file" "${BACKUP_DIR}/snapshots/$(basename $db_file).backup"
        log "  ✓ Database file backed up: $db_file"
    fi
done

# 6. Environment and config backup
log "Backing up environment configuration..."
ENV_FILES=(
    ".env"
    ".env.local"
    ".env.development"
    ".cursorrules"
    ".vscode/settings.json"
)

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        mkdir -p "${BACKUP_DIR}/snapshots/$(dirname $env_file)"
        cp "$env_file" "${BACKUP_DIR}/snapshots/$env_file.backup"
        log "  ✓ Config backed up: $env_file"
    fi
done

# 7. Generate system information
log "Collecting system information..."
SYSTEM_INFO="${BACKUP_DIR}/metadata/system_info.txt"
{
    echo "=== SYSTEM INFORMATION ==="
    echo "Date: $(date)"
    echo "User: $(whoami)"
    echo "PWD: $(pwd)"
    echo "Node version: $(node --version 2>/dev/null || echo 'Not found')"
    echo "NPM version: $(npm --version 2>/dev/null || echo 'Not found')"
    echo "Git version: $(git --version 2>/dev/null || echo 'Not found')"
    echo ""
    echo "=== DISK USAGE ==="
    du -sh . 2>/dev/null || echo "Disk usage calculation failed"
    echo ""
    echo "=== PACKAGE.JSON DEPENDENCIES COUNT ==="
    if [ -f "package.json" ]; then
        echo "Dependencies: $(jq '.dependencies | length' package.json 2>/dev/null || echo 'Unknown')"
        echo "DevDependencies: $(jq '.devDependencies | length' package.json 2>/dev/null || echo 'Unknown')"
    fi
} > "${SYSTEM_INFO}"

# 8. Create restoration script
log "Generating restoration script..."
RESTORE_SCRIPT="${BACKUP_DIR}/restore-backup.sh"
cat > "${RESTORE_SCRIPT}" << 'EOF'
#!/bin/bash

# NARRATIVE SURGEON - BACKUP RESTORATION SCRIPT
# This script restores the project to its pre-refactoring state

set -e

BACKUP_DIR=$(dirname "$0")
PROJECT_ROOT="../.."
TIMESTAMP=$(basename "$BACKUP_DIR" | sed 's/refactor_//')

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

echo "=== NARRATIVE SURGEON BACKUP RESTORATION ==="
echo "Backup timestamp: ${TIMESTAMP}"
echo "Restore location: $(realpath ${PROJECT_ROOT})"
echo ""

# Confirm restoration
read -p "This will overwrite current files. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Restoration cancelled"
    exit 0
fi

cd "${PROJECT_ROOT}"

# 1. Restore critical files
log "Restoring critical files..."
CRITICAL_FILES=(
    "package.json"
    "package-lock.json" 
    "next.config.js"
    "tailwind.config.js"
    "tsconfig.json"
    "jest.config.ts"
    "src-tauri/Cargo.toml"
    "src-tauri/Cargo.lock"
    "src-tauri/tauri.conf.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    backup_file="${BACKUP_DIR}/snapshots/${file}.backup"
    if [ -f "$backup_file" ]; then
        cp "$backup_file" "$file"
        log "  ✓ Restored: $file"
    else
        warning "Backup not found for: $file"
    fi
done

# 2. Restore git state
if [ -d "${BACKUP_DIR}/snapshots/git_backup/.git" ]; then
    log "Restoring git repository state..."
    # Reset to backup tag
    if git tag | grep -q "backup-${TIMESTAMP}"; then
        git reset --hard "backup-${TIMESTAMP}"
        success "Git state restored to backup tag"
    else
        warning "Backup tag not found, manual git recovery may be needed"
    fi
fi

# 3. Restore node_modules if needed
if [ -f "${BACKUP_DIR}/snapshots/package-lock.json.original" ]; then
    log "Reinstalling dependencies from backup..."
    cp "${BACKUP_DIR}/snapshots/package-lock.json.original" "package-lock.json"
    npm ci --prefer-offline --no-audit
    success "Dependencies restored"
fi

# 4. Restore database files
log "Restoring database files..."
DB_FILES=(
    "narrative_surgeon.db"
    "narrative_surgeon.db-wal"
    "narrative_surgeon.db-shm"
)

for db_file in "${DB_FILES[@]}"; do
    backup_file="${BACKUP_DIR}/snapshots/${db_file}.backup"
    target_file="src-tauri/${db_file}"
    if [ -f "$backup_file" ]; then
        cp "$backup_file" "$target_file"
        log "  ✓ Database restored: $db_file"
    fi
done

# 5. Verify restoration
log "Verifying restoration..."
if [ -f "package.json" ] && [ -f "next.config.js" ]; then
    success "Critical files verified"
else
    error "Restoration verification failed"
    exit 1
fi

# 6. Test compilation
log "Testing TypeScript compilation..."
if npx tsc --noEmit --skipLibCheck; then
    success "TypeScript compilation successful"
else
    warning "TypeScript compilation has errors - may need manual review"
fi

success "Backup restoration completed!"
log "Check the application with: npm run dev"
EOF

chmod +x "${RESTORE_SCRIPT}"

# 9. Generate backup summary
SUMMARY_FILE="${BACKUP_DIR}/backup_summary.txt"
{
    echo "=== NARRATIVE SURGEON BACKUP SUMMARY ==="
    echo "Created: $(date)"
    echo "Backup ID: ${TIMESTAMP}"
    echo "Location: ${BACKUP_DIR}"
    echo ""
    echo "=== BACKED UP COMPONENTS ==="
    echo "✓ Git repository (if present)"
    echo "✓ Complete file system snapshot"
    echo "✓ Critical configuration files"
    echo "✓ Database files (if present)"
    echo "✓ Environment configuration"
    echo "✓ Package lock file for dependency restoration"
    echo ""
    echo "=== RESTORATION ==="
    echo "Run: ${RESTORE_SCRIPT}"
    echo "Or manually restore from: ${BACKUP_DIR}/snapshots/"
    echo ""
    echo "=== BACKUP SIZE ==="
    du -sh "${BACKUP_DIR}" 2>/dev/null || echo "Size calculation failed"
} > "${SUMMARY_FILE}"

# 10. Final verification
log "Verifying backup integrity..."
if [ -d "${BACKUP_DIR}/snapshots" ] && [ -f "${MANIFEST_FILE}" ] && [ -f "${RESTORE_SCRIPT}" ]; then
    success "Backup created successfully!"
    success "Backup location: ${BACKUP_DIR}"
    success "Restoration script: ${RESTORE_SCRIPT}"
    
    echo ""
    echo -e "${GREEN}=== BACKUP COMPLETE ===${NC}"
    echo "Backup ID: ${TIMESTAMP}"
    echo "Location: ${BACKUP_DIR}"
    echo "Summary: ${SUMMARY_FILE}"
    echo ""
    echo "To restore this backup:"
    echo "  cd ${BACKUP_DIR}"
    echo "  ./restore-backup.sh"
    
else
    error "Backup verification failed!"
    exit 1
fi