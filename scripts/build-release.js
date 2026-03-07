#!/usr/bin/env node

/**
 * Next.js 生产构建打包脚本
 * 将 standalone 输出打包到 dist/ 目录，包含完整的部署材料
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  step: (num, total, msg) => console.log(`${colors.bright}[${num}/${total}]${colors.reset} ${msg}`),
};

// 项目根目录
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

// 递归复制目录
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    log.warn(`源目录不存在: ${src}`);
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 递归删除目录
function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// 主流程
async function main() {
  const steps = 8;
  log.info('开始构建生产部署包...');

  try {
    // Step 1: 清理旧构建
    log.step(1, steps, '清理旧的构建产物');
    removeDir(DIST);
    removeDir(path.join(ROOT, '.next'));
    log.success('已清理 dist/ 和 .next/');

    // Step 2: 执行 Next.js 构建
    log.step(2, steps, '执行 Next.js 构建 (standalone 模式)');
    execSync('npm run build', { cwd: ROOT, stdio: 'inherit' });
    log.success('Next.js 构建完成');

    // Step 3: 复制 standalone 输出
    log.step(3, steps, '复制 standalone 运行时到 dist/');
    const standalonePath = path.join(ROOT, '.next', 'standalone');
    if (!fs.existsSync(standalonePath)) {
      throw new Error('standalone 输出不存在，请检查 next.config.ts 中的 output 配置');
    }
    // standalone 输出通常在 project_data/student_leave/ 子目录下
    const standaloneProjectPath = path.join(standalonePath, 'project_data', 'student_leave');
    if (fs.existsSync(standaloneProjectPath)) {
      // 复制子目录内容到 dist 根目录
      copyDir(standaloneProjectPath, DIST);
    } else {
      // 如果没有子目录，直接复制
      copyDir(standalonePath, DIST);
    }
    // 删除自动复制的 .env 文件（包含敏感信息）
    const distEnv = path.join(DIST, '.env');
    if (fs.existsSync(distEnv)) {
      fs.unlinkSync(distEnv);
    }
    log.success('已复制 standalone 运行时');

    // 修正 dist/package.json 的启动脚本为 standalone 模式
    const distPackageJson = path.join(DIST, 'package.json');
    if (fs.existsSync(distPackageJson)) {
      const pkg = JSON.parse(fs.readFileSync(distPackageJson, 'utf-8'));
      pkg.scripts.start = 'node server.js';
      fs.writeFileSync(distPackageJson, JSON.stringify(pkg, null, 2));
      log.success('已修正启动脚本为: node server.js');
    }

    // Step 4: 复制静态资源
    log.step(4, steps, '复制静态资源');
    const staticSource = path.join(ROOT, '.next', 'static');
    const staticDest = path.join(DIST, '.next', 'static');
    copyDir(staticSource, staticDest);

    const publicSource = path.join(ROOT, 'public');
    const publicDest = path.join(DIST, 'public');
    copyDir(publicSource, publicDest);
    log.success('已复制静态资源');

    // Step 5: 复制数据库层
    log.step(5, steps, '复制数据库层 (lib/db/)');
    const dbSource = path.join(ROOT, 'lib', 'db');
    const dbDest = path.join(DIST, 'lib', 'db');
    copyDir(dbSource, dbDest);
    log.success('已复制数据库层');

    // Step 5.5: 复制初始化脚本
    log.step(5.5, steps, '复制数据库初始化脚本');
    const scriptsDest = path.join(DIST, 'scripts');
    fs.mkdirSync(scriptsDest, { recursive: true });
    // 复制初始化脚本
    const initScriptSource = path.join(ROOT, 'scripts', 'init-database.js');
    fs.copyFileSync(initScriptSource, path.join(scriptsDest, 'init-database.js'));
    log.success('已复制初始化脚本');

    // Step 5.6: 复制 1Panel 部署文档
    log.step(5.6, steps, '复制 1Panel 部署文档');
    const deploymentDocSource = path.join(ROOT, 'docs', '1PANEL_DEPLOYMENT.md');
    if (fs.existsSync(deploymentDocSource)) {
      fs.copyFileSync(deploymentDocSource, path.join(DIST, '.1panel-deployment.md'));
      log.success('已复制 1Panel 部署文档');
    } else {
      log.warn('1Panel 部署文档不存在，跳过复制');
    }

    // Step 6: 创建部署文件
    log.step(6, steps, '创建部署文件');

    // start.sh (Linux/Mac)
    const startSh = `#!/bin/bash
set -e

# 加载环境变量
if [ -f .env ]; then
  export \$(cat .env | grep -v '^#' | xargs)
fi

# 设置默认值
export NODE_ENV=\${NODE_ENV:-production}
export PORT=\${PORT:-3000}

echo "启动学生请假管理系统..."
echo "环境: \$NODE_ENV"
echo "端口: \$PORT"

# 启动服务器
node server.js
`;
    fs.writeFileSync(path.join(DIST, 'start.sh'), startSh, { mode: 0o755 });

    // start.bat (Windows)
    const startBat = `@echo off
setlocal enabledelayedexpansion

REM 加载环境变量
if exist .env (
  for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#"') do set %%a
)

REM 设置默认值
if not defined NODE_ENV set NODE_ENV=production
if not defined PORT set PORT=3000

echo 启动学生请假管理系统...
echo 环境: %NODE_ENV%
echo 端口: %PORT%

REM 启动服务器
node server.js
`;
    fs.writeFileSync(path.join(DIST, 'start.bat'), startBat);

    // .env.example
    const envExample = `# ============================================
# 学生请假管理系统 - 环境变量配置
# ============================================

# Node 运行环境（必填）
NODE_ENV=production

# 服务端口（可选，默认 3000）
PORT=3000

# ============================================
# 数据库配置（必填）
# ============================================
# PostgreSQL 数据库连接字符串
# 格式：postgresql://用户名:密码@主机:端口/数据库名
# 示例：postgresql://postgres:password@localhost:5432/student_leave
POSTGRES_URL=postgresql://postgres:password@localhost:5432/student_leave

# ============================================
# 安全密钥（必填）
# ============================================
# 数据库加密密钥（64位十六进制）
# 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DB_ENCRYPTION_KEY=your-64-character-hex-key-here

# CSRF 保护密钥（64位十六进制）
# 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CSRF_SECRET=your-64-character-hex-key-here

# 会话密钥
# 生成方法：node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
SESSION_SECRET=your-secret-key-change-this-in-production

# ============================================
# 应用配置（必填）
# ============================================
# 应用公开访问 URL
# 本地开发: http://localhost:3000
# 生产环境: http://your-server-ip:port 或 https://your-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ============================================
# 可选配置
# ============================================
# 日志目录（可选）
# LOG_DIR=/path/to/logs

# 备份目录（可选）
# BACKUP_DIR=/path/to/backups
`;
    fs.writeFileSync(path.join(DIST, '.env.example'), envExample);

    // README.md
    const readme = `# 学生请假管理系统 - 生产部署包

本部署包支持多种部署方式：

## 部署方式

### 方式一：1Panel 容器化部署（推荐）

1. 参考 \`.1panel-deployment.md\` 获取完整部署指南
2. 使用 1Panel 运行环境功能，一键部署 Node.js 应用
3. 配置环境变量、端口映射和卷挂载

**启动命令**: \`node server.js\`

### 方式二：传统部署

#### Linux / macOS

\`\`\`bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 配置
vim .env

# 3. 启动服务
./start.sh
\`\`\`

#### Windows

\`\`\`batch
REM 1. 复制环境变量模板
copy .env.example .env

REM 2. 编辑 .env 配置
notepad .env

REM 3. 启动服务
start.bat
\`\`\`

#### 手动启动

\`\`\`bash
export NODE_ENV=production
node server.js
\`\`\`

## 目录结构

\`\`\`
dist/
├── server.js               # Next.js 服务器入口
├── package.json            # 运行时依赖
├── node_modules/           # 依赖包（已包含）
├── .next/                  # Next.js 构建产物
│   └── static/             # 静态资源
├── lib/db/                 # 数据库层和迁移文件
├── public/                 # 公共静态资源
├── start.sh                # Linux/Mac 启动脚本
├── start.bat               # Windows 启动脚本
├── .env.example            # 通用环境变量模板
├── .1panel-deployment.md   # 1Panel 部署指南
└── README.md               # 本文件
\`\`\`

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| \`NODE_ENV\` | 运行环境 | production |
| \`PORT\` | 服务端口 | 3000 |
| \`POSTGRES_URL\` | PostgreSQL 数据库连接 | - |
| \`DB_ENCRYPTION_KEY\` | 数据库加密密钥（64位十六进制） | - |
| \`CSRF_SECRET\` | CSRF 密钥（64位十六进制） | - |
| \`SESSION_SECRET\` | 会话密钥 | - |
| \`NEXT_PUBLIC_APP_URL\` | 应用 URL | http://localhost:3000 |

## 注意事项

1. **Node.js 版本**: 需要 Node.js >= 18
2. **数据库**: 需要预先配置好 PostgreSQL 数据库
3. **端口**: 确保配置的端口未被占用
4. **权限**: Linux/Mac 确保 \`start.sh\` 有执行权限

## 数据库初始化

首次部署后，需要执行数据库迁移创建表结构：

\`\`\`bash
# 进入应用目录
cd /path/to/dist

# 执行数据库迁移
npm run db:migrate
\`\`\`

## 健康检查

启动后访问 http://localhost:3000 检查服务是否正常运行。

## 故障排查

### 端口被占用
\`\`\`bash
# 查找占用进程
lsof -i :3000
\`\`\`

### 数据库连接错误
请检查：
1. PostgreSQL 服务是否正在运行
2. \`POSTGRES_URL\` 配置是否正确
3. 数据库是否已创建

### 日志查看
服务器日志会直接输出到终端，包含启动信息和错误提示。

## 更多文档

- 1Panel 部署指南: 请查看 \`.1panel-deployment.md\`
`;
    fs.writeFileSync(path.join(DIST, 'README.md'), readme);


    log.success('已创建部署文件 (start.sh, start.bat, .env.example, README.md)');

    // Step 7: 显示构建结果
    log.step(7, steps, '构建完成！');
    console.log('');

    const getDirSize = (dir) => {
      let size = 0;
      const files = fs.readdirSync(dir, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          size += getDirSize(filePath);
        } else {
          size += fs.statSync(filePath).size;
        }
      }
      return size;
    };

    const distSize = getDirSize(DIST);
    const distSizeMB = (distSize / 1024 / 1024).toFixed(2);

    console.log(`${colors.bright}构建产物大小:${colors.reset} ${distSizeMB} MB`);
    console.log(`${colors.bright}输出目录:${colors.reset} ${DIST}`);
    console.log('');
    log.success('部署包已准备就绪！');
    console.log('');
    console.log(`${colors.blue}部署步骤:${colors.reset}`);
    console.log(`  1. cd dist`);
    console.log(`  2. cp .env.example .env`);
    console.log(`  3. # 编辑 .env 配置（可选）`);
    console.log(`  4. ./start.sh      # Linux/Mac`);
    console.log(`  5. start.bat       # Windows`);
    console.log('');

  } catch (error) {
    log.error(error.message);
    process.exit(1);
  }
}

main();
