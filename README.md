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
npm run db:migrate
npm run db:seed      # 填充初始数据（可选）
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
npm run db:migrate   # 数据库迁移
npm run db:seed      # 填充初始数据
npm run db:studio    # 打开 Drizzle Studio

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
