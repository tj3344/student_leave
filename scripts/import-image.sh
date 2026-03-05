#!/bin/bash
#
# Docker 镜像导入脚本
#
# 使用方法：
#   chmod +x scripts/import-image.sh
#   ./scripts/import-image.sh <镜像文件路径>
#
# 此脚本用于在目标电脑上导入导出的 Docker 镜像
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo "======================================"
    echo "  Docker 镜像导入脚本"
    echo "======================================"
    echo ""
    echo "用法: $0 <镜像文件路径>"
    echo ""
    echo "示例:"
    echo "  $0 student-leave-app-image.tar.gz"
    echo "  $0 postgres-16-alpine-image.tar.gz"
    echo "  $0 /path/to/student-leave-app-image.tar.gz"
    echo ""
    echo "支持的镜像文件:"
    echo "  - student-leave-app-image.tar.gz"
    echo "  - postgres-16-alpine-image.tar.gz"
    echo ""
}

# 检查参数
if [ -z "$1" ]; then
    show_help
    echo -e "${RED}错误: 请指定镜像文件路径${NC}\n"
    exit 1
fi

IMAGE_FILE="$1"

# 检查文件是否存在
if [ ! -f "$IMAGE_FILE" ]; then
    echo -e "${RED}错误: 文件不存在: $IMAGE_FILE${NC}\n"
    exit 1
fi

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行！${NC}"
    echo -e "${YELLOW}请先启动 Docker Desktop 或 Docker 服务${NC}\n"
    exit 1
fi

# 获取文件信息
FILE_SIZE=$(du -h "$IMAGE_FILE" | cut -f1)
FILE_NAME=$(basename "$IMAGE_FILE")

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Docker 镜像导入${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo -e "镜像文件: ${YELLOW}${IMAGE_FILE}${NC}"
echo -e "文件大小: ${YELLOW}${FILE_SIZE}${NC}"
echo ""
echo -e "${YELLOW}正在导入镜像...${NC}"
echo ""

# 执行导入
IMPORT_START=$(date +%s)

# 检查是否是压缩文件
if [[ "$IMAGE_FILE" == *.gz ]]; then
    docker load < "$IMAGE_FILE"
else
    docker load -i "$IMAGE_FILE"
fi

IMPORT_END=$(date +%s)
IMPORT_TIME=$((IMPORT_END - IMPORT_START))

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  镜像导入完成！${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo -e "导入耗时: ${YELLOW}${IMPORT_TIME}${NC} 秒"
echo ""

# 尝试显示已导入的镜像
IMAGE_NAME=""
if [[ "$FILE_NAME" == *"student-leave-app"* ]]; then
    IMAGE_NAME="student-leave-app"
elif [[ "$FILE_NAME" == *"postgres"* ]]; then
    IMAGE_NAME="postgres"
fi

echo -e "${BLUE}已导入的镜像:${NC}"
if [ -n "$IMAGE_NAME" ]; then
    docker images | grep "$IMAGE_NAME" || docker images
else
    docker images
fi
echo ""

# 显示下一步操作
if [[ "$FILE_NAME" == *"student-leave-app"* ]]; then
    echo -e "${YELLOW}下一步操作:${NC}"
    echo "  1. 导入 PostgreSQL 镜像（如果还没导入）"
    echo "     ./scripts/import-image.sh postgres-16-alpine-image.tar.gz"
    echo ""
    echo "  2. 配置环境变量"
    echo "     cp .env.docker.example .env"
    echo "     vi .env"
    echo ""
    echo "  3. 启动服务"
    echo "     docker compose --profile with-postgres up -d"
    echo ""
fi
