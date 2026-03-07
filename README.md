# 学生请假管理系统

一套完整的学生请假管理系统，实现教师申请请假、管理员审核、自动统计请假天数和退费金额等功能。

## 功能特性

### 角色功能
- **超级管理员/管理员**: 用户管理、基础设置、请假审核、数据导入导出、系统备份
- **教师**: 学生请假申请、查看自己的请假记录
- **班主任**: 查看本班学生信息、查看本班请假记录

### 核心功能
- ✅ 用户认证与权限管理
- ✅ 学生档案管理（批量导入/导出）
- ✅ 请假申请与审核流程
- ✅ 自动计算退费金额
- ✅ 营养餐学生管理
- ✅ 学期/年级/班级管理
- ✅ 通知系统（批量发送、聚合显示、自动已读）
- ✅ 多数据库连接管理
- ✅ 数据备份与恢复
- ✅ 操作日志记录
- ✅ 统计报表

### 安全特性（生产级）
- 🔐 HMAC-SHA256 签名的 CSRF Token 验证
- 🔐 路径遍历攻击防护
- 🔐 内容安全策略（CSP）优化
- 🔐 多场景速率限制
- 🔐 结构化日志（敏感信息脱敏）
- 🔐 AES-256-GCM 数据库字段加密

### 性能优化
- ⚡ 数据库查询优化（消除 N+1 问题）
- ⚡ 30+ 个性能索引
- ⚡ 代码分割与动态导入
- ⚡ 多层缓存系统
- ⚡ 优雅关闭机制

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **编程语言**: TypeScript 5
- **UI 组件**: shadcn/ui + Tailwind CSS v4
- **数据库**: PostgreSQL + Drizzle ORM
- **测试**: Vitest
- **安全**: Crypto (HMAC-SHA256, AES-256-GCM)

## 快速开始

### 环境要求
- Node.js >= 18
- PostgreSQL >= 12
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
```bash
cp .env.local.example .env.local
```

#### 必需环境变量

| 变量名 | 说明 | 生成方法 |
|--------|------|----------|
| `POSTGRES_URL` | PostgreSQL 连接字符串 | - |
| `DB_ENCRYPTION_KEY` | 数据库字段加密密钥（64位十六进制） | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `CSRF_SECRET` | CSRF Token 签名密钥（64位十六进制） | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SESSION_SECRET` | 会话密钥（Base64 编码） | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `NODE_ENV` | 运行环境 | `development` 或 `production` |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | 如 `http://localhost:3000` |

#### 可选环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `LOG_DIR` | `logs/` | 日志文件目录 |
| `LOG_MAX_SIZE` | `10485760` | 单个日志文件最大大小（字节） |
| `LOG_MAX_FILES` | `5` | 保留的日志文件数量 |
| `BACKUP_DIR` | `backups/` | 备份文件目录 |
| `ENABLE_FILE_LOG` | - | 是否启用文件日志 |

### 初始化数据库
```bash
npm run db:migrate      # 执行数据库迁移
npm run db:init-admin   # 创建默认管理员用户（admin/admin123）
npm run db:seed         # 填充初始数据（可选）
```

### 添加性能索引（生产环境推荐）
```bash
npm run run-script add-performance-indexes
```

### 启动开发服务器
```bash
npm run dev
```

访问 http://localhost:3000，默认账号:
- 用户名: `admin`
- 密码: `admin123`

⚠️ **重要**: 生产环境请立即修改默认密码！

## 生产部署

### 1Panel 平台部署（推荐新手）

[1Panel](https://1panel.cn/) 是一款现代化的 Linux 服务器运维管理面板，支持容器化部署，适合新手快速部署应用。

#### 快速开始

```bash
# 1. 构建生产部署包
npm run build:release

# 2. 将 dist/ 目录上传到服务器
# 3. 在 1Panel 中创建 Node.js 运行环境
# 4. 配置环境变量（参考 dist/.env.example）
# 5. 启动应用
```

#### 详细步骤

1. **构建部署包**
   ```bash
   npm run build:release
   ```
   构建完成后，`dist/` 目录包含所有部署文件。

2. **在 1Panel 中创建数据库**
   - 进入 1Panel → 数据库 → 创建数据库
   - 数据库类型: PostgreSQL
   - 数据库名: `student_leave`
   - 记录数据库连接信息

3. **上传部署文件**
   - 将 `dist/` 目录上传到服务器 `/opt/student_leave`
   - 或在 1Panel 文件管理中创建目录并上传

4. **创建运行环境**
   - 应用: Node.js
   - 版本: 18 或 20
   - 项目目录: `/opt/student_leave`
   - 启动命令: `node server.js`
   - 端口映射: 3000 → 主机端口

5. **配置环境变量**
   ```env
   NODE_ENV=production
   POSTGRES_URL=postgresql://用户名:密码@127.0.0.1:5432/student_leave
   DB_ENCRYPTION_KEY=生成的64位十六进制密钥
   CSRF_SECRET=生成的64位十六进制密钥
   SESSION_SECRET=生成的会话密钥
   NEXT_PUBLIC_APP_URL=http://服务器IP:端口
   ```

6. **初始化数据库**
   ```bash
   # 进入容器终端执行
   npm run db:migrate
   npm run db:init-admin
   ```

#### 重要提示

- ⚠️ **不要配置"安装命令"** - 部署包已包含所有依赖
- ⚠️ **不要配置"构建命令"** - 项目已经编译好
- ⚠️ **数据库主机使用 127.0.0.1**，而非 localhost（Docker 容器中 localhost 可能解析为 IPv6 地址）

详细部署文档请参考 [1Panel 部署指南](./docs/1PANEL_DEPLOYMENT.md)

### Docker 镜像打包部署（离线部署）

适用于无外网环境或需要快速部署的场景。

#### 打包流程（开发机）

```bash
# 1. 确保项目已构建
npm run build

# 2. 运行打包脚本（自动生成完整部署包）
chmod +x scripts/export-image.sh
./scripts/export-image.sh
```

脚本会自动完成：
- 创建带时间戳的部署包目录（如 `deploy-images-YYYYMMDD-HHMMSS/`）
- 构建 Docker 镜像（支持跨平台：ARM64 开发机可构建 AMD64 镜像）
- 导出镜像为 tarball
- 复制配置文件（docker-compose.yml、环境变量模板、部署脚本）
- 配置自动数据库初始化

**生成的部署包结构**：
```
deploy-images-YYYYMMDD-HHMMSS/
├── student-leave-app.tar      # Docker 镜像文件
├── docker-compose.yml         # 容器编排配置
├── deploy.sh                  # 一键部署脚本
├── .env.template              # 环境变量模板
└── logs/                      # 日志目录（运行后生成）
```

#### 部署步骤（目标机器）

```bash
# 1. 将部署包传输到目标机器（scp、U盘等）

# 2. 在目标机器上解压并加载镜像
cd deploy-images-YYYYMMDD-HHMMSS/
docker load < student-leave-app.tar

# 3. 配置环境变量
cp .env.template .env
vim .env  # 修改必需的环境变量

# 4. 运行部署脚本
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动：
- 加载 Docker 镜像
- 启动容器（含自动数据库初始化）
- 创建管理员账号（admin/admin123）
- 配置健康检查

#### 重要注意事项

**1. HTTP vs HTTPS 配置**

- **HTTP 部署**：设置 `NEXT_PUBLIC_APP_URL=http://your-host:3000`
- **HTTPS 部署**：设置 `NEXT_PUBLIC_APP_URL=https://your-domain`

应用会自动根据此配置调整：
- CSP 头部（是否强制 HTTPS 升级）
- Cookie 安全标志（`Secure` 属性）

**错误案例**：HTTP 环境下设置 HTTPS URL 会导致 `ERR_SSL_PROTOCOL_ERROR`

**2. Docker Compose 配置**

部署包使用 `image:` 而非 `build:` 指令：
```yaml
services:
  student-leave:
    image: student-leave-app:latest  # ✅ 正确：使用预构建镜像
    # build: .                       # ❌ 错误：部署包不包含 Dockerfile
```

**3. 健康检查配置**

使用 IPv4 地址避免 IPv6 解析问题：
```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://127.0.0.1:3000/api/health', ...)"]
  # ✅ 正确：127.0.0.1（IPv4）
  # ❌ 错误：localhost（可能解析为 ::1 IPv6 地址）
```

**4. 数据库初始化**

首次部署时会自动运行数据库初始化，创建以下表：
- users（用户表，含默认 admin 账号）
- semesters（学期）
- grades（年级）
- classes（班级）
- students（学生）
- leave_records（请假记录）
- notifications（通知）
- 系统配置、操作日志、备份记录等

如需重新初始化：
```bash
docker exec student-leave-app sh -c 'NODE_PATH=/app/node_modules node /app/scripts/init-database.js'
```

**5. Cookie 安全配置**

应用根据 `NEXT_PUBLIC_APP_URL` 自动设置 Cookie 安全标志：
- HTTPS：`secure: true`（浏览器只通过 HTTPS 传输）
- HTTP：`secure: false`（允许 HTTP 传输）

**错误案例**：HTTP 环境下设置 `secure: true` 会导致浏览器拒绝 Cookie，登录失败。

**6. 静态资源**

Next.js standalone 模式不会自动包含 `.next/static` 目录。打包脚本会自动处理：
```bash
# build-release.js Step 4: 复制静态资源
cp -r .next/static dist/project_data/student_leave/.next/static
```

**错误案例**：缺少静态资源会导致 CSS/JS 文件 404 错误。

**7. 必需的 npm 包**

Docker 镜像需包含以下运行时依赖：
```dockerfile
RUN npm install postgres bcryptjs
```

这些包用于数据库初始化脚本和密码验证。

**8. 默认账号**

- 用户名：`admin`
- 密码：`admin123`

⚠️ **生产环境请立即修改默认密码！**

**9. 资源限制**

默认资源配置：
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

可根据服务器配置调整。

**10. 故障排查**

```bash
# 查看容器状态
docker compose ps

# 查看应用日志
docker compose logs -f student-leave

# 进入容器调试
docker exec -it student-leave-app sh

# 手动运行健康检查
curl http://localhost:3000/api/health

# 查看数据库连接
docker exec -it student-leave-postgres psql -U student_leave -d student_leave
```

### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `ERR_SSL_PROTOCOL_ERROR` | CSP 强制 HTTPS 升级 | 设置 `NEXT_PUBLIC_APP_URL` 为 HTTP URL |
| CSS/JS 文件 404 | 缺少 `.next/static` | 重新构建镜像（确保包含静态资源） |
| `relation "users" does not exist` | 数据库未初始化 | 运行 `init-database.js` 脚本 |
| 登录无反应（Cookie 问题） | Cookie `Secure` 标志不匹配协议 | 检查 `NEXT_PUBLIC_APP_URL` 协议设置 |
| 健康检查失败 | IPv6/IPv4 解析问题 | 使用 `127.0.0.1` 替代 `localhost` |
| `Cannot find module 'postgres'` | 缺少运行时依赖 | 重新构建镜像（包含 postgres/bcryptjs） |

### 部署前检查清单

- [ ] 生成并设置所有必需的安全密钥（`DB_ENCRYPTION_KEY`, `CSRF_SECRET`, `SESSION_SECRET`）
- [ ] 配置 `POSTGRES_URL` 指向生产数据库
- [ ] 设置 `NODE_ENV=production`
- [ ] 设置 `NEXT_PUBLIC_APP_URL` 为生产域名
- [ ] 运行数据库迁移和性能索引脚本
- [ ] 启用文件日志（`ENABLE_FILE_LOG=true`）
- [ ] 配置 HTTPS 和反向代理
- [ ] 修改默认管理员密码

### 方式一：使用 PM2（推荐）
```bash
# 安装 PM2
npm install -g pm2

# 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### 方式二：使用 Docker
```bash
# 构建并启动
docker compose up -d

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

### 方式三：Systemd 服务
```bash
sudo cp scripts/student-leave.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable student-leave
sudo systemctl start student-leave
```

详细部署文档请参考 [部署文档](./docs/DEPLOYMENT.md)

## 生产环境健康检查

部署后可通过以下端点检查服务状态：

```bash
# 健康检查
curl https://your-domain.com/api/health
```

响应示例：
```json
{
  "status": "healthy",
  "timestamp": "2026-02-28T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "checks": {
    "database": { "status": "pass", "latency": 5 },
    "environment": { "status": "pass" },
    "memory": { "status": "pass", "pressure": 45.2 }
  }
}
```

## 安全最佳实践

### 应用层安全
1. **CSRF 防护**: 所有状态变更操作均使用 HMAC-SHA256 签名的 CSRF Token
2. **路径安全**: 文件操作进行路径验证，防止目录遍历攻击
3. **速率限制**: 所有 API 端点配置速率限制，防止暴力攻击
4. **内容安全策略**: 移除 `unsafe-eval`，收紧脚本执行策略
5. **敏感数据加密**: 数据库敏感字段使用 AES-256-GCM 加密存储

### 运维安全
1. **修改默认密码**: 首次部署后立即修改 admin 账号密码
2. **强密钥生成**: 所有安全密钥使用加密安全的随机数生成
3. **定期备份**: 配置自动备份并验证恢复流程
4. **HTTPS 部署**: 生产环境必须使用 HTTPS
5. **防火墙规则**: 限制数据库端口访问，仅允许应用服务器连接
6. **日志监控**: 启用文件日志并配置日志轮转

### 密钥管理
- 使用密钥管理服务（如 AWS KMS、HashiCorp Vault）存储生产密钥
- 定期轮换密钥（建议每年至少一次）
- 不同环境使用不同密钥

## 项目结构

```
student_leave/
├── app/                    # Next.js App Router 页面
│   ├── api/               # API 路由
│   ├── (dashboard)/       # 主应用页面
│   └── health/            # 健康检查端点
├── components/             # React 组件
│   ├── auth/              # 认证相关组件
│   ├── common/            # 通用组件（含 ErrorBoundary）
│   └── ui/                # shadcn/ui 组件
├── lib/                    # 核心业务逻辑
│   ├── db/                # 数据库操作和 Schema
│   ├── api/               # API 服务层
│   ├── cache/             # 多层缓存系统
│   ├── config/            # 环境验证配置
│   ├── cron/              # 定时任务
│   └── utils/             # 工具函数
│       ├── crypto.ts      # 加密工具
│       ├── csrf.ts        # CSRF 防护
│       ├── path-security.ts # 路径安全
│       ├── rate-limit.ts  # 速率限制
│       ├── structured-logger.ts # 结构化日志
│       ├── file-logger.ts # 文件日志
│       └── graceful-shutdown.ts # 优雅关闭
├── types/                  # TypeScript 类型定义
├── public/                 # 静态资源
├── docs/                   # 文档
└── scripts/                # 脚本文件
    └── add-performance-indexes.ts # 性能索引迁移
```

## 可用脚本

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm start            # 启动生产服务器

# 测试
npm run test         # 运行测试
npm run test:ui      # 测试 UI 界面
npm run test:coverage # 测试覆盖率

# 数据库
npm run db:migrate     # 数据库迁移
npm run db:init-admin  # 初始化管理员用户
npm run db:seed        # 填充初始数据
npm run db:studio      # 打开 Drizzle Studio

# 构建部署包
npm run build:release  # 构建生产部署包（用于 1Panel 等平台）

# 脚本
npm run run-script <name>  # 运行 scripts 目录下的脚本

# 代码质量
npm run lint         # ESLint 检查
```

## 用户手册

详细的使用说明请参考 [用户手册](./docs/USER_MANUAL.md)

## 开发文档

详细的开发文档请参考 [开发文档](./docs/开发文档.md)

## 故障排除

### 端口被占用
```bash
# 查找占用 3000 端口的进程
lsof -i :3000

# 或使用其他端口
PORT=3001 npm start
```

### PostgreSQL 连接问题
```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 测试数据库连接
psql -h localhost -U postgres -d student_leave

# 查看表是否存在
psql -U postgres -d student_leave -c "\dt"
```

### 环境变量验证失败
应用启动时会自动验证必需的环境变量。如果验证失败，请检查：

1. `.env.local` 文件是否存在且包含所有必需变量
2. `DB_ENCRYPTION_KEY` 和 `CSRF_SECRET` 是否为 64 位十六进制字符
3. `POSTGRES_URL` 格式是否正确（`postgresql://user:pass@host:port/db`）

### 内存不足
如果应用出现内存问题，健康检查会返回 `degraded` 状态：

```json
{
  "checks": {
    "memory": { "status": "warn", "pressure": 75.5 }
  }
}
```

建议增加服务器内存或重启应用。

## 性能监控

应用内置以下监控功能：

- **健康检查**: `/api/health` - 检查数据库、内存、环境配置
- **内存压力监控**: 自动检测内存使用率，超过 70% 警告，超过 90% 失败
- **缓存统计**: 跟踪缓存命中率和内存使用
- **优雅关闭**: 确保关闭时完成进行中的请求

## 更新日志

### v1.0.0 (2026-02)
- ✨ 完整的学生请假管理功能
- 🔐 生产级安全防护（CSRF、路径安全、速率限制）
- ⚡ 性能优化（数据库索引、代码分割、缓存）
- 📊 结构化日志与监控
- 🛡️ 优雅关闭机制

## 许可证

MIT

## 支持

如有问题，请联系技术支持或提交 Issue。
