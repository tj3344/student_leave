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

## 技术栈

- **前端框架**: Next.js 15 (App Router)
- **编程语言**: TypeScript 5
- **UI 组件**: shadcn/ui + Tailwind CSS v4
- **数据库**: PostgreSQL + Drizzle ORM
- **测试**: Vitest

## 快速开始

### 环境要求
- Node.js >= 18
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 配置环境变量
```bash
cp .env.local.example .env.local
# 编辑 .env.local，修改 SESSION_SECRET
```

### 初始化数据库
```bash
npm run db:migrate
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

## 项目结构

```
student_leave/
├── app/                    # Next.js App Router 页面
├── components/             # React 组件
├── lib/                    # 核心业务逻辑
│   ├── db/                # 数据库操作
│   ├── api/               # API 服务层
│   ├── cron/              # 定时任务
│   └── utils/             # 工具函数
├── types/                  # TypeScript 类型定义
├── public/                 # 静态资源
├── docs/                   # 文档
└── scripts/                # 脚本文件
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

# 代码质量
npm run lint         # ESLint 检查
```

## 用户手册

详细的使用说明请参考 [用户手册](./docs/USER_MANUAL.md)

## 开发文档

详细的开发文档请参考 [开发文档](./docs/开发文档.md)

## 安全注意事项

1. **修改默认密码**: 首次部署后立即修改 admin 账号密码
2. **SESSION_SECRET**: 生产环境必须设置为强随机字符串
3. **数据库备份**: 定期备份数据库文件
4. **HTTPS**: 生产环境建议使用 HTTPS
5. **防火墙**: 限制数据库文件访问权限

## 故障排除

### 端口被占用
```bash
# 查找占用 3000 端口的进程
lsof -i :3000

# 或使用 PM2 的其他端口
PORT=3001 npm start
```

### PostgreSQL 连接问题
```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 检查数据库连接
psql -h localhost -U postgres -d student_leave

# 查看表是否存在
psql -U postgres -d student_leave -c "\dt"
```

## 许可证

MIT

## 支持

如有问题，请联系技术支持或提交 Issue。
