#!/bin/bash
# ─── RMASC FACTORY — Backup Script ────────────────────────────────────────
# Usage: sudo bash scripts/backup.sh
# Creates a full backup of MongoDB + uploads to /home/sarlrmasc/backups/
# Recommended: run daily via cron:
#   0 2 * * * sudo bash /home/sarlrmasc/rmasc-erp/scripts/backup.sh

set -e

BACKUP_DIR="/home/sarlrmasc/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "========================================"
echo "  RMASC BACKUP — $DATE"
echo "========================================"

# ── Create backup directory ──
mkdir -p "$BACKUP_DIR/$DATE"
echo "  ✅ Backup directory created"

# ── 1. Backup MongoDB ──
echo "  → Dumping MongoDB..."
mongodump --uri="mongodb://127.0.0.1:27017/rmasc-erp" \
  --out="$BACKUP_DIR/$DATE/mongodb" \
  --quiet
echo "  ✅ MongoDB dumped"

# ── 2. Backup uploads ──
echo "  → Copying uploads..."
if [ -d "/home/sarlrmasc/rmasc-erp/uploads" ]; then
  cp -r /home/sarlrmasc/rmasc-erp/uploads "$BACKUP_DIR/$DATE/uploads"
  echo "  ✅ Uploads copied"
else
  echo "  ⚠️  No uploads directory"
fi

# ── 3. Compress backup ──
echo "  → Compressing..."
cd "$BACKUP_DIR"
tar -czf "$DATE.tar.gz" "$DATE" 2>/dev/null
rm -rf "$DATE"
echo "  ✅ Compressed: $BACKUP_DIR/$DATE.tar.gz"

# ── 4. Clean old backups (older than RETENTION_DAYS) ──
echo "  → Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "  ✅ Old backups cleaned"

# ── 5. Show result ──
SIZE=$(du -sh "$BACKUP_DIR/$DATE.tar.gz" 2>/dev/null | cut -f1)
echo ""
echo "  📦 Backup complete: $SIZE"
echo "  📁 $BACKUP_DIR/$DATE.tar.gz"
echo "========================================"
