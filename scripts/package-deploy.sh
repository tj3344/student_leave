#!/bin/bash
#
# 学生请假管理系统 - Docker 部署打包脚本
#
# 使用方法：
#   chmod +x scripts/package-deploy.sh
#   ./scripts/package-deploy.sh
#
# 此脚本会创建一个可在其他电脑上 Docker 部署的压缩包
#

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  学生请假管理系统 - Docker 部署打包${NC}"
echo -e "${GREEN}========================================${NC}\n"

# 检查 dist 目录是否存在
if [ ! -d "dist/project_data/student_leave" ]; then
    echo -e "${RED}错误: dist/project_data/student_leave 目录不存在！${NC}"
    echo -e "${YELLOW}请先运行 'npm run build' 构建项目${NC}\n"
    exit 1
fi

# 检查关键文件是否存在
REQUIRED_FILES=(
    "docker-compose.yml"
    "Dockerfile.simple"
    ".dockerignore"
    ".env.docker.example"
    "scripts/generate-secrets.js"
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

# 获取版本信息（如果有）
VERSION=$(node -e "console.log(require('./package.json').version || '1.0.0')" 2>/dev/null || echo "1.0.0")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="student-leave-docker-deploy-${VERSION}-${TIMESTAMP}.tar.gz"

echo "打包信息:"
echo "  版本: ${VERSION}"
echo "  时间戳: ${TIMESTAMP}"
echo "  输出文件: ${OUTPUT_FILE}"
echo ""

# 创建临时目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf ${TEMP_DIR}" EXIT

# 复制必要文件
echo "复制文件到临时目录..."

# Docker 配置文件
cp docker-compose.yml "${TEMP_DIR}/"
cp Dockerfile.simple "${TEMP_DIR}/"
cp .dockerignore "${TEMP_DIR}/"
cp .env.docker.example "${TEMP_DIR}/"

# 构建产物（必需）
echo -e "  ${GREEN}✓${NC} 复制 Docker 配置文件"
mkdir -p "${TEMP_DIR}/dist/project_data/student_leave"
cp -r dist/project_data/student_leave/* "${TEMP_DIR}/dist/project_data/student_leave/"
echo -e "  ${GREEN}✓${NC} 复制构建产物 (dist/)"

# 脚本文件（推荐）
mkdir -p "${TEMP_DIR}/scripts"
cp scripts/generate-secrets.js "${TEMP_DIR}/scripts/" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} 复制工具脚本"

# 数据库迁移文件（可选）
if [ -d "lib/db/migrations" ]; then
    mkdir -p "${TEMP_DIR}/lib/db/migrations"
    cp -r lib/db/migrations/* "${TEMP_DIR}/lib/db/migrations/" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} 复制数据库迁移文件"
fi

# Drizzle 配置（可选）
if [ -f "drizzle.config.ts" ]; then
    cp drizzle.config.ts "${TEMP_DIR}/" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} 复制 Drizzle 配置"
fi

# 创建 Docker 专用的管理员初始化脚本
cat > "${TEMP_DIR}/scripts/init-admin-docker.js" << 'EOF'
const postgres = require('postgres');
const bcrypt = require('bcryptjs');

// 从环境变量读取数据库连接
const sql = postgres(process.env.POSTGRES_URL || 'postgresql://student_leave:student_leave_pass@postgres:5432/student_leave');

async function initAdmin() {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const now = new Date();

  await sql`
    INSERT INTO users (username, password_hash, real_name, role, is_active, created_at, updated_at)
    VALUES ('admin', ${passwordHash}, '系统管理员', 'admin', true, ${now}, ${now})
    ON CONFLICT (username) DO NOTHING
  `;

  console.log('=================================');
  console.log('管理员用户创建成功！');
  console.log('=================================');
  console.log('用户名: admin');
  console.log('密码: admin123');
  console.log('');
  console.log('重要提示：请登录后立即修改默认密码！');
  console.log('=================================');

  await sql.end();
}

initAdmin().catch(console.error);
EOF
echo -e "  ${GREEN}✓${NC} 创建 Docker 专用管理员初始化脚本"

# 创建快速部署指南
cat > "${TEMP_DIR}/DEPLOY_QUICKSTART.md" << 'EOF'
# 学生请假管理系统 - Docker 快速部署指南

## 快速开始

### 1. 解压文件
```bash
# 创建部署目录
sudo mkdir -p /opt/student-leave
cd /opt

# 解压文件
sudo tar -xzf student-leave-docker-deploy-*.tar.gz
sudo mv student_leave/* student-leave/
sudo rmdir student_leave
cd student-leave

# 设置权限
sudo chown -R $USER:$USER /opt/student-leave
```

### 2. 生成并配置环境变量
```bash
# 复制环境变量模板
cp .env.docker.example .env

# 生成密钥
node scripts/generate-secrets.js

# 将生成的密钥复制到 .env 文件
vi .env
```

### 3. 设置应用 URL
编辑 `.env` 文件，修改以下内容：
```bash
NEXT_PUBLIC_APP_URL=http://<你的电脑IP>:3000
```

### 4. 启动服务
```bash
# 启动应用和数据库
docker compose --profile with-postgres up -d --build

# 查看日志
docker compose logs -f student-leave
```

### 5. 验证部署
```bash
# 健康检查
curl http://localhost:3000/api/health

# 访问应用
# 浏览器打开: http://<你的电脑IP>:3000
```

### 6. 创建管理员账户
```bash
# 进入容器
docker exec -it student-leave-app sh

# 运行初始化脚本
node scripts/init-admin-docker.js

# 退出容器
exit
```

默认管理员凭据：
- 用户名: `admin`
- 密码: `admin123`

**重要：首次登录后请立即修改密码！**

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f student-leave

# 重启服务
docker compose restart

# 停止服务
docker compose down

# 备份数据库
docker exec student-leave-postgres pg_dump -U student_leave student_leave > backup.sql
```

## 故障排查

### 容器无法启动
```bash
# 检查日志
docker compose logs student-leave

# 检查端口占用
lsof -i :3000
lsof -i :5432
```

### 数据库连接失败
```bash
# 检查 PostgreSQL 容器
docker compose ps postgres

# 测试连接
docker exec student-leave-app sh -c "nc -zv postgres 5432"
```

## 更多信息

完整的部署文档请参考项目中的 `docs/DEPLOYMENT.md`。
EOF
echo -e "  ${GREEN}✓${NC} 创建快速部署指南"

echo ""
echo "创建压缩包..."
cd "${TEMP_DIR}"
tar -czf "${OLDPWD}/${OUTPUT_FILE}" .
cd "${OLDPWD}"

# 计算文件大小
FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "输出文件: ${GREEN}${OUTPUT_FILE}${NC}"
echo -e "文件大小: ${FILE_SIZE}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 将 ${OUTPUT_FILE} 传输到目标电脑"
echo "  2. 在目标电脑上解压并运行"
echo "  3. 参考 DEPLOY_QUICKSTART.md 完成部署"
echo ""
echo -e "${YELLOW}传输方式:${NC}"
echo "  - U 盘复制"
echo "  - 网络共享 (SMB/AFP)"
echo "  - scp 命令: scp ${OUTPUT_FILE} user@target:/tmp/"
echo ""
