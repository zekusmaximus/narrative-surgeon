#!/bin/bash

# DEPENDENCY CLEANUP ROLLBACK SCRIPT
# Restores original package.json and package-lock.json

set -e

echo "Rolling back dependency cleanup..."

# Restore original files
if [ -f "package.json_backup_1755186882257" ]; then
    cp "package.json_backup_1755186882257" "package.json"
    echo "✓ package.json restored"
else
    echo "✗ package.json backup not found"
    exit 1
fi

if [ -f "package-lock.json_backup_1755186882257" ]; then
    cp "package-lock.json_backup_1755186882257" "package-lock.json"
    echo "✓ package-lock.json restored"
fi

# Clean reinstall
echo "Reinstalling original dependencies..."
rm -rf node_modules
npm install

echo "✓ Rollback completed successfully"
echo "Test with: npm run dev"
