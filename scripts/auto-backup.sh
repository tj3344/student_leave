#!/bin/bash
# 自动备份脚本

# 配置
BACKUP_DIR="/home/admin/code_data/student_leave/backups"
DATA_DIR="/home/admin/code_data/student_leave/data"
APP_DIR="/home/admin/code_data/student_leave"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d-%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

echo "[$(date)] 开始备份..."

# 1. 备份数据文件
tar -czf "$BACKUP_DIR/backup-$DATE.tar.gz" -C "$DATA_DIR" . 2>/dev/null

if [ $? -eq 0 ]; then
    echo "[$(date)] 备份完成: backup-$DATE.tar.gz"
else
    echo "[$(date)] 备份失败!"
    exit 1
fi

# 2. 清理旧备份
find "$BACKUP_DIR" -name "backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] 已清理 $RETENTION_DAYS 天前的备份"
