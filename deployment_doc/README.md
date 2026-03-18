# 学生请假管理系统 - 生产部署包

本部署包支持多种部署方式：

## 部署方式

### 方式一：1Panel 容器化部署（推荐）

1. 参考 `.1panel-deployment.md` 获取完整部署指南
2. 使用 1Panel 运行环境功能，一键部署 Node.js 应用
3. 配置环境变量、端口映射和卷挂载

**启动命令**: `node server.js`

### 方式二：传统部署

#### Linux / macOS

```bash
# 1. 复制环境变量模板
cp .env.example .env

# 2. 编辑 .env 配置
vim .env

# 3. 启动服务
./start.sh
```

#### Windows

```batch
REM 1. 复制环境变量模板
copy .env.example .env

REM 2. 编辑 .env 配置
notepad .env

REM 3. 启动服务
start.bat
```

#### 手动启动

```bash
export NODE_ENV=production
node server.js
```

## 目录结构

```
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
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | production |
| `PORT` | 服务端口 | 3000 |
| `POSTGRES_URL` | PostgreSQL 数据库连接 | - |
| `DB_ENCRYPTION_KEY` | 数据库加密密钥（64位十六进制） | - |
| `CSRF_SECRET` | CSRF 密钥（64位十六进制） | - |
| `SESSION_SECRET` | 会话密钥 | - |
| `NEXT_PUBLIC_APP_URL` | 应用 URL | http://localhost:3000 |

## 注意事项

1. **Node.js 版本**: 需要 Node.js >= 18
2. **数据库**: 需要预先配置好 PostgreSQL 数据库
3. **端口**: 确保配置的端口未被占用
4. **权限**: Linux/Mac 确保 `start.sh` 有执行权限

## 数据库初始化

首次部署后，需要执行数据库迁移创建表结构：

```bash
# 进入应用目录
cd /path/to/dist

# 执行数据库迁移
npm run db:migrate
```

## 健康检查

启动后访问 http://localhost:3000 检查服务是否正常运行。

## 故障排查

### 端口被占用
```bash
# 查找占用进程
lsof -i :3000
```

### 数据库连接错误
请检查：
1. PostgreSQL 服务是否正在运行
2. `POSTGRES_URL` 配置是否正确
3. 数据库是否已创建

### 日志查看
服务器日志会直接输出到终端，包含启动信息和错误提示。

## 更多文档

- 1Panel 部署指南: 请查看 `.1panel-deployment.md`
