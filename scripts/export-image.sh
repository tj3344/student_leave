#!/bin/bash
#
# 学生请假管理系统 - Docker 镜像导出脚本
#
# 使用方法：
#   chmod +x scripts/export-image.sh
#   ./scripts/export-image.sh
#
# 此脚本会：
# 1. 构建 student-leave-app 镜像
# 2. 导出应用镜像为压缩 tar 文件
# 3. 拉取并导出 PostgreSQL 镜像
# 4. 生成部署配置文件包
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# 进入项目目录
cd "$PROJECT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  学生请假管理系统${NC}"
echo -e "${BLUE}  Docker 镜像导出${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 显示当前架构信息
CURRENT_ARCH=$(uname -m)
echo -e "${YELLOW}当前电脑架构:${NC} $CURRENT_ARCH"
if [ "$CURRENT_ARCH" = "arm64" ] || [ "$CURRENT_ARCH" = "aarch64" ]; then
    echo -e "  ${YELLOW}⚠${NC}  如果目标电脑是 Intel/AMD PC，请选择架构 1"
elif [ "$CURRENT_ARCH" = "x86_64" ]; then
    echo -e "  ${GREEN}✓${NC}  大多数 PC 使用相同架构"
fi
echo ""

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行！${NC}"
    echo -e "${YELLOW}请先启动 Docker Desktop 或 Docker 服务${NC}\n"
    exit 1
fi

# 检查 dist 目录是否存在
if [ ! -d "dist/project_data/student_leave" ]; then
    echo -e "${RED}错误: dist/project_data/student_leave 目录不存在！${NC}"
    echo -e "${YELLOW}请先运行 'npm run build' 构建项目${NC}\n"
    exit 1
fi

# 检查关键文件是否存在
REQUIRED_FILES=(
    "Dockerfile.simple"
    "docker-compose.yml"
    ".env.docker.example"
)

echo "检查关键文件..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}错误: 缺少必需文件 $file${NC}\n"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} $file"
done
echo ""

# 生成时间戳
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="deploy-images-${TIMESTAMP}"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"
echo -e "${BLUE}创建输出目录: ${OUTPUT_DIR}${NC}\n"

# 步骤 1: 构建应用镜像
echo -e "${YELLOW}[1/5] 选择目标电脑架构...${NC}"
echo ""
echo "请选择目标电脑的 CPU 架构:"
echo "  1) AMD64/Intel (大多数 Windows/Linux PC)"
echo "  2) ARM64 (Apple Mac/树莓派等)"
echo ""
read -p "请输入选择 [1-2，默认 1]: " ARCH_CHOICE
ARCH_CHOICE=${ARCH_CHOICE:-1}

if [ "$ARCH_CHOICE" = "2" ]; then
    TARGET_PLATFORM="linux/arm64"
    TARGET_ARCH="arm64"
else
    TARGET_PLATFORM="linux/amd64"
    TARGET_ARCH="amd64"
fi

echo -e "目标架构: ${GREEN}${TARGET_ARCH}${NC}"
echo ""

echo -e "${YELLOW}构建应用镜像...${NC}"

# 创建并使用 buildx 构建器
BUILDER_NAME="student-leave-builder"
if ! docker buildx inspect "$BUILDER_NAME" &>/dev/null 2>&1; then
    docker buildx create --name "$BUILDER_NAME" --driver docker-container --use 2>/dev/null
    docker buildx use "$BUILDER_NAME" 2>/dev/null
fi

# 为目标架构构建镜像（使用 --no-cache 确保正确的架构）
if ! docker buildx build \
    --platform "$TARGET_PLATFORM" \
    -f Dockerfile.simple \
    -t student-leave-app:latest \
    --load \
    --no-cache \
    . 2>/dev/null; then
    # 如果 buildx 失败，回退到普通 build（带平台和 no-cache）
    docker build --platform "$TARGET_PLATFORM" --no-cache -f Dockerfile.simple -t student-leave-app:latest .
fi

echo -e "${GREEN}✓ 应用镜像构建完成${NC}\n"

# 步骤 2: 导出应用镜像
echo -e "${YELLOW}[2/5] 导出应用镜像...${NC}"
docker save student-leave-app:latest | gzip > "${OUTPUT_DIR}/student-leave-app-image.tar.gz"
APP_SIZE=$(du -h "${OUTPUT_DIR}/student-leave-app-image.tar.gz" | cut -f1)
echo -e "${GREEN}✓ 应用镜像已导出: student-leave-app-image.tar.gz (${APP_SIZE})${NC}\n"

# PostgreSQL 镜像将在目标电脑上自动从网络拉取（不导出）
echo -e "${YELLOW}[3/4] 跳过 PostgreSQL 导出...${NC}"
echo -e "${GREEN}✓ PostgreSQL 将在目标电脑上自动从 Docker Hub 拉取${NC}\n"

# 步骤 5: 复制配置文件和脚本
echo -e "${YELLOW}[5/5] 准备部署文件...${NC}"

# 复制并修改 Docker Compose 配置（使用已导入的镜像而非重新构建）
cat > "${OUTPUT_DIR}/docker-compose.yml" << 'COMPOSEEOF'
services:
  # 学生请假管理系统
  student-leave:
    image: student-leave-app:latest
    container_name: student-leave-app
    restart: unless-stopped
    user: "1001:1001"
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URL=${POSTGRES_URL}
      - DB_ENCRYPTION_KEY=${DB_ENCRYPTION_KEY}
      - CSRF_SECRET=${CSRF_SECRET:-change-this-csrf-secret-in-production}
      - SESSION_SECRET=${SESSION_SECRET:-change-this-secret-key-in-production}
      - MAX_FILE_SIZE=10485760
      - NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-http://localhost:3000}
    volumes:
      - ./logs:/app/logs
    networks:
      - student-leave-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  # PostgreSQL 数据库
  postgres:
    image: postgres:alpine
    container_name: student-leave-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-student_leave}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB:-student_leave}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - student-leave-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-student_leave} -d ${POSTGRES_DB:-student_leave}"]
      interval: 10s
      timeout: 5s
      retries: 5
    profiles:
      - with-postgres

networks:
  student-leave-network:
    driver: bridge

volumes:
  postgres-data:
COMPOSEEOF
cp .env.docker.example "${OUTPUT_DIR}/"
echo -e "  ${GREEN}✓${NC} 创建 Docker Compose 配置文件"

# 复制脚本文件
mkdir -p "${OUTPUT_DIR}/scripts"
cp scripts/generate-secrets.js "${OUTPUT_DIR}/scripts/" 2>/dev/null || true
cp scripts/init-admin-docker.js "${OUTPUT_DIR}/scripts/" 2>/dev/null || true

# 创建一键部署脚本（新手友好）
cat > "${OUTPUT_DIR}/deploy.sh" << 'DEPLOYEOF'
#!/bin/bash
#
# 学生请假管理系统 - 一键部署脚本（新手友好）
#
# 使用方法：
#   chmod +x deploy.sh
#   ./deploy.sh
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  学生请假管理系统${NC}"
echo -e "${BLUE}  一键部署${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 检查 Docker 是否运行
if ! docker info &> /dev/null; then
    echo -e "${RED}错误: Docker 未运行！${NC}"
    echo -e "${YELLOW}请先启动 Docker Desktop 或 Docker 服务${NC}\n"
    exit 1
fi

# 检查应用镜像文件
if [ ! -f "student-leave-app-image.tar.gz" ]; then
    echo -e "${RED}错误: 找不到应用镜像文件！${NC}\n"
    exit 1
fi

# 1. 导入应用镜像
echo -e "${YELLOW}[1/3] 导入应用镜像...${NC}"
docker load < student-leave-app-image.tar.gz
echo -e "${GREEN}✓${NC} 应用镜像导入完成"

# 2. 配置环境变量
echo ""
echo -e "${YELLOW}[2/3] 配置环境变量...${NC}"
cat > .env << 'ENVEOF'
POSTGRES_USER=student_leave
POSTGRES_PASSWORD=student_leave_pass
POSTGRES_DB=student_leave
POSTGRES_URL=postgresql://student_leave:student_leave_pass@postgres:5432/student_leave
DB_ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
CSRF_SECRET=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
SESSION_SECRET=c29tZS1zZWNyZXQta2V5LWZvci1zZXNzaW9u
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000
MAX_FILE_SIZE=10485760
ENVEOF
echo -e "${GREEN}✓${NC} 环境变量配置完成"

# 3. 启动服务（PostgreSQL 会自动从网络拉取）
echo ""
echo -e "${YELLOW}[3/3] 启动服务...${NC}"
echo -e "${YELLOW}PostgreSQL 镜像将自动从网络拉取...${NC}"
docker compose --profile with-postgres up -d
echo -e "${GREEN}✓${NC} 服务启动中..."

# 4. 等待服务就绪
echo ""
echo -e "${YELLOW}等待服务启动...${NC}"
for i in {1..12}; do
    sleep 5
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} 服务已就绪！"
        break
    fi
    echo "  等待中... ($i/12)"
done

# 5. 初始化数据库
echo ""
echo -e "${YELLOW}[5/5] 初始化数据库...${NC}"
echo -e "${YELLOW}正在创建数据库表和管理员账户...${NC}"
docker exec student-leave-app sh -c 'NODE_PATH=/app/node_modules node /app/scripts/init-database.js'
echo -e "${GREEN}✓${NC} 数据库初始化完成"

# 获取本机 IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$LOCAL_IP" ] && LOCAL_IP="<本机IP>"

# 显示访问信息
echo ""
echo -e "${GREEN}==========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}==========================================${NC}"
echo ""
echo -e "${BLUE}访问地址:${NC}"
echo -e "  本机访问:  ${GREEN}http://localhost:3000${NC}"
echo -e "  局域网访问: ${GREEN}http://${LOCAL_IP}:3000${NC}"
echo ""
echo -e "${BLUE}默认登录:${NC}"
echo -e "  用户名: ${YELLOW}admin${NC}"
echo -e "  密码: ${YELLOW}admin123${NC}"
echo ""
echo -e "${YELLOW}首次登录后请立即修改密码！${NC}"
echo ""
echo -e "${BLUE}常用命令:${NC}"
echo "  docker compose ps     # 查看状态"
echo "  docker compose logs -f # 查看日志"
echo "  docker compose restart # 重启"
echo "  docker compose down    # 停止"
echo ""
DEPLOYEOF

chmod +x "${OUTPUT_DIR}/deploy.sh"
echo -e "  ${GREEN}✓${NC} 创建一键部署脚本 (deploy.sh)"

# 创建镜像导入脚本
cat > "${OUTPUT_DIR}/scripts/import-image.sh" << 'IMPORTEOF'
#!/bin/bash
#
# Docker 镜像导入脚本
#
# 使用方法：
#   chmod +x scripts/import-image.sh
#   ./scripts/import-image.sh <镜像文件路径>
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}错误: 请指定镜像文件路径${NC}"
    echo -e "${YELLOW}用法: $0 <镜像文件路径>${NC}"
    echo ""
    echo "示例:"
    echo "  $0 student-leave-app-image.tar.gz"
    echo "  $0 postgres-16-alpine-image.tar.gz"
    exit 1
fi

IMAGE_FILE="$1"

if [ ! -f "$IMAGE_FILE" ]; then
    echo -e "${RED}错误: 文件不存在: $IMAGE_FILE${NC}\n"
    exit 1
fi

echo "======================================"
echo "  Docker 镜像导入"
echo "======================================"
echo ""
echo "导入镜像: $IMAGE_FILE"
echo ""

# 检查是否是压缩文件
if [[ "$IMAGE_FILE" == *.gz ]]; then
    echo "检测到压缩文件，使用 gunzip 解压..."
    docker load < "$IMAGE_FILE"
else
    docker load -i "$IMAGE_FILE"
fi

echo ""
echo -e "${GREEN}✓ 镜像导入完成！${NC}"
echo ""

# 显示已导入的镜像
IMAGE_NAME=$(basename "$IMAGE_FILE" .tar.gz | sed 's/-image//')
echo "已导入的镜像:"
docker images | grep "$IMAGE_NAME" || echo "  (请使用 'docker images' 查看所有镜像)"
IMPORTEOF

chmod +x "${OUTPUT_DIR}/scripts/import-image.sh"
echo -e "  ${GREEN}✓${NC} 创建镜像导入脚本"

# 创建快速部署指南
cat > "${OUTPUT_DIR}/DEPLOY_GUIDE.md" << 'GUIDEEOF'
# 学生请假管理系统 - 快速部署指南（新手友好）

## 🚀 一键部署（推荐）

### 步骤 1: 复制到目标电脑
将整个目录复制到目标电脑（U 盘等）

### 步骤 2: 运行一键部署脚本
```bash
cd deploy-images-*
chmod +x deploy.sh
./deploy.sh
```

### 步骤 3: 访问应用
浏览器打开: `http://localhost:3000`

- 用户名: `admin`
- 密码: `admin123`

---

## 📋 部署包内容

| 文件 | 说明 |
|------|------|
| `deploy.sh` | **一键部署脚本**（推荐使用） |
| `student-leave-app-image.tar.gz` | 应用镜像 (~97MB) |
| `docker-compose.yml` | Docker 配置 |

**注意**: PostgreSQL 数据库镜像会自动从网络拉取，约 80MB

---

## 💡 常用命令

```bash
docker compose ps           # 查看状态
docker compose logs -f      # 查看日志
docker compose restart      # 重启服务
docker compose down         # 停止服务
```

---

## ❓ 遇到问题？

### Docker 未运行
启动 Docker Desktop 或 Docker 服务

### 端口被占用
```bash
lsof -i :3000
lsof -i :5432
```

### 查看详细日志
```bash
docker compose logs student-leave
```
GUIDEEOF

echo -e "  ${GREEN}✓${NC} 创建快速部署指南"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  镜像导出完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}输出目录:${NC} ${OUTPUT_DIR}/"
echo ""
echo -e "${BLUE}导出的文件:${NC}"
ls -lh "$OUTPUT_DIR/"
echo ""
echo -e "${BLUE}镜像文件大小:${NC}"
echo "  应用镜像:     ${APP_SIZE}"
echo "  PostgreSQL:   ${POSTGRES_SIZE}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 将 ${OUTPUT_DIR}/ 目录复制到目标电脑"
echo "  2. 在目标电脑上运行: ${GREEN}./deploy.sh${NC}"
echo ""
