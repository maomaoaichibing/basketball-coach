#!/bin/bash

# Database Backup Script for Basketball Coach System
# This script creates automated backups of the SQLite database

set -e

# Configuration
BACKUP_DIR="/var/www/basketball-coach/backups"
DB_PATH="/var/www/basketball-coach/prisma/dev.db"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Create backup directory if it doesn't exist
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Check if database exists
check_database() {
    if [ ! -f "$DB_PATH" ]; then
        error "Database file not found: $DB_PATH"
        exit 1
    fi
    log "Database found: $DB_PATH"
}

# Create backup
create_backup() {
    local backup_filename="db_backup_${TIMESTAMP}.db"
    local backup_path="${BACKUP_DIR}/${backup_filename}"
    
    log "Creating backup: $backup_filename"
    
    # Copy database file
    cp "$DB_PATH" "$backup_path"
    
    # Verify backup
    if [ -f "$backup_path" ]; then
        local original_size=$(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null)
        local backup_size=$(stat -c%s "$backup_path" 2>/dev/null || stat -f%z "$backup_path" 2>/dev/null)
        
        if [ "$original_size" -eq "$backup_size" ]; then
            log "✅ Backup created successfully: $backup_filename (${backup_size} bytes)"
        else
            warn "Backup size mismatch: original=${original_size}, backup=${backup_size}"
        fi
    else
        error "Failed to create backup"
        exit 1
    fi
}

# Clean old backups
cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days"
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        if [ -f "$file" ]; then
            log "Deleting old backup: $(basename "$file")"
            rm -f "$file"
            ((deleted_count++))
        fi
    done < <(find "$BACKUP_DIR" -name "db_backup_*.db" -type f -mtime +$RETENTION_DAYS -print0)
    
    if [ $deleted_count -eq 0 ]; then
        log "No old backups to clean up"
    else
        log "Deleted $deleted_count old backup(s)"
    fi
}

# Create backup info file
create_backup_info() {
    local info_file="${BACKUP_DIR}/backup_info_${TIMESTAMP}.json"
    local backup_count=$(find "$BACKUP_DIR" -name "db_backup_*.db" -type f | wc -l)
    local total_size=$(find "$BACKUP_DIR" -name "db_backup_*.db" -type f -exec stat -c%s {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || \
                 find "$BACKUP_DIR" -name "db_backup_*.db" -type f -exec stat -f%z {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}')
    
    cat > "$info_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "backup_filename": "db_backup_${TIMESTAMP}.db",
    "original_db_path": "$DB_PATH",
    "original_db_size": $(stat -c%s "$DB_PATH" 2>/dev/null || stat -f%z "$DB_PATH" 2>/dev/null),
    "total_backups": $backup_count,
    "total_backup_size": ${total_size:-0},
    "retention_days": $RETENTION_DAYS
}
EOF
    
    log "Backup info saved: $(basename "$info_file")"
}

# List all backups
list_backups() {
    log "Current backups:"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/db_backup_*.db 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}' || echo "  No backups found"
    else
        echo "  Backup directory does not exist"
    fi
}

# Main function
main() {
    log "Starting database backup process"
    
    create_backup_dir
    check_database
    create_backup
    cleanup_old_backups
    create_backup_info
    list_backups
    
    log "Database backup completed successfully!"
}

# Handle command line arguments
case "${1:-backup}" in
    backup)
        main
        ;;
    list)
        list_backups
        ;;
    cleanup)
        create_backup_dir
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {backup|list|cleanup}"
        echo "  backup  - Create a new backup (default)"
        echo "  list    - List all backups"
        echo "  cleanup - Clean up old backups"
        exit 1
        ;;
esac