# 学生请假管理系统 - 部署文档

## 目录
- [环境要求](#环境要求)
- [部署方式](#部署方式)
- [Docker 部署](#docker-部署)
- [Docker + PM2 组合部署](#docker--pm2-组合部署)
- [传统 Node.js 部署](#传统-nodejs-部署)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [HTTPS 配置](#https-配置)
- [备份策略](#备份策略)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

## 环境要求

### 硬件要求
- **CPU**: 1 核心以上
- **内存**: 512MB 以上（推荐 1GB）
- **磁盘**: 500MB 以上可用空间

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+) 或 Windows Server
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **PostgreSQL**: >= 14.0（推荐使用 Docker 或独立安装）

### 网络要求
- 开放端口: 3000 (应用端口) 或 80/443 (使用 Nginx)
- 建议配置防火墙规则

## 部署方式

本项目支持四种部署方式：

1. **Docker 容器化部署**（推荐，易于管理和迁移）
2. **Docker + PM2 组合部署**（容器内进程管理，增强稳定性）
3. **PM2 进程管理**（传统 Node.js 部署）
4. **Systemd 系统服务**（Linux 原生服务管理）

## Docker 部署

### 1. 安装 Docker 和 Docker Compose

#### Ubuntu/Debian
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get install docker-compose-plugin

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

#### CentOS/RHEL
```bash
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. 准备配置文件

```bash
# 克隆项目或上传代码
cd /opt/student-leave

# 复制环境变量文件
cp .env.local.example .env.local

# 编辑环境变量
vi .env.local
```

**重要配置项**:
```bash
# 生成随机密钥
SESSION_SECRET=$(openssl rand -base64 32)
echo "SESSION_SECRET=$SESSION_SECRET"

# 设置应用 URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. 启动服务

```bash
# 构建并启动（后台运行）
docker compose up -d

# 查看日志
docker compose logs -f student-leave

# 查看状态
docker compose ps
```

### 4. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 5. 数据备份

Docker 部署的数据存储在 `./data` 目录，直接备份即可：

```bash
# 停止服务
docker compose stop

# 备份数据目录
tar -czf backup-$(date +%Y%m%d).tar.gz data/

# 启动服务
docker compose start
```

## Docker + PM2 组合部署

此方案在 Docker 容器内部使用 PM2 管理 Next.js 应用进程，结合了 Docker 的隔离性和 PM2 的进程管理能力。

### 优势

- **进程自愈**: PM2 在容器内监控应用进程，崩溃自动重启
- **日志管理**: PM2 统一管理应用日志，便于排查问题
- **资源监控**: 可通过 `pm2 monit` 实时查看资源使用情况
- **优雅关闭**: PM2 支持优雅关闭机制，确保请求处理完成后再退出
- **扩展性**: 为未来迁移到集群模式预留空间

### 配置说明

项目已配置好 Docker + PM2 组合部署，相关文件：

| 文件 | 说明 |
|------|------|
| [Dockerfile](Dockerfile:79-100) | 安装 PM2 并使用 `pm2-runtime` 启动 |
| [ecosystem.config.cjs](ecosystem.config.cjs) | PM2 配置（容器环境路径 `/app`） |
| [docker-compose.yml](docker-compose.yml) | Docker Compose 编排配置 |

**关键配置**:
- `pm2-runtime`: Docker 内必须使用 runtime，不能后台运行
- `--no-daemon`: 保持 PM2 前台运行，防止容器退出
- `instances: 1`: SQLite 不支持多实例并发写入
- `cwd: '/app'`: 容器内工作目录

### 部署步骤

```bash
# 进入项目目录
cd /home/admin/code_data/student_leave

# 停止现有容器
sudo docker compose down

# 重新构建镜像
sudo docker compose build

# 启动服务
sudo docker compose up -d

# 查看日志
sudo docker compose logs -f student-leave
```

### 验证部署

```bash
# 1. 检查容器状态
sudo docker compose ps

# 2. 进入容器检查 PM2
sudo docker exec -it student-leave-app sh
pm2 status
pm2 logs
exit

# 3. 健康检查
curl http://localhost:3000/api/health
```

### 常用操作命令

```bash
# 重启容器
sudo docker compose restart

# 查看 PM2 日志（不进容器）
sudo docker exec student-leave-app pm2 logs

# 监控资源使用
sudo docker exec student-leave-app pm2 monit

# 查看 PM2 进程状态
sudo docker exec student-leave-app pm2 status

# 重启应用（不重建容器）
sudo docker exec student-leave-app pm2 restart student-leave
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并启动
sudo docker compose up -d --build

# 清理旧镜像
sudo docker image prune -f
```

### 注意事项

1. **SQLite 限制**: 由于 SQLite 不支持多实例并发写入，PM2 配置中 `instances` 必须保持为 1
2. **内存限制**: PM2 的 `max_memory_restart` 设置为 1G，可根据服务器实际情况调整
3. **日志轮转**: PM2 日志会持续增长，建议定期清理或配置日志轮转

## 传统 Node.js 部署

### 1. 安装 Node.js

#### 使用 NVM（推荐）
```bash
# 安装 NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载 shell
source ~/.bashrc

# 安装 Node.js 18
nvm install 18
nvm use 18
nvm alias default 18
```

#### 或使用包管理器
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. 部署应用

#### 方式一：使用自动化部署脚本
```bash
# 克隆项目
git clone <repository-url> /opt/student-leave
cd /opt/student-leave

# 运行部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

#### 方式二：手动部署
```bash
# 1. 安装依赖
npm install

# 2. 运行测试（可选）
npm run test -- --run

# 3. 构建项目
npm run build

# 4. 配置环境变量
cp .env.local.example .env.local
vi .env.local

# 5. 初始化数据库
npm run db:migrate

# 6. 启动应用（选择以下方式之一）
```

### 3. 使用 PM2 管理进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start ecosystem.config.cjs

# 设置开机自启
pm2 startup
pm2 save

# 常用命令
pm2 status           # 查看状态
pm2 logs student-leave  # 查看日志
pm2 restart student-leave  # 重启应用
pm2 stop student-leave     # 停止应用
pm2 delete student-leave   # 删除应用
```

### 4. 使用 Systemd 服务

```bash
# 复制服务文件
sudo cp scripts/student-leave.service /etc/systemd/system/

# 修改服务文件中的路径
sudo vi /etc/systemd/system/student-leave.service

# 重载 systemd
sudo systemctl daemon-reload

# 启用并启动服务
sudo systemctl enable student-leave
sudo systemctl start student-leave

# 查看状态
sudo systemctl status student-leave

# 查看日志
sudo journalctl -u student-leave -f
```

## Nginx 反向代理配置

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt-get install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置反向代理

创建配置文件 `/etc/nginx/sites-available/student-leave`:

```nginx
upstream student_leave_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # 日志
    access_log /var/log/nginx/student-leave-access.log;
    error_log /var/log/nginx/student-leave-error.log;

    # 最大上传大小
    client_max_body_size 10M;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://student_leave_backend;
        proxy_http_version 1.1;

        # 传递真实 IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 静态文件缓存
    location /static {
        proxy_pass http://student_leave_backend;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查端点
    location /api/health {
        proxy_pass http://student_leave_backend;
        access_log off;
    }
}
```

启用配置:
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/student-leave /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

## HTTPS 配置

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

Certbot 会自动修改 Nginx 配置，添加 HTTPS 支持。

## 备份策略

### 1. 数据库备份

#### 手动备份
```bash
# 方式一：使用系统备份页面
# 访问: http://your-domain.com/admin/backup

# 方式二：使用 pg_dump 命令行工具
pg_dump -h localhost -U postgres -d student_leave > backups/student-leave-$(date +%Y%m%d-%H%M%S).sql

# 方式三：使用 pg_dump 自定义格式（支持压缩和并行）
pg_dump -h localhost -U postgres -d student_leave -F c -f backups/student-leave-$(date +%Y%m%d-%H%M%S).dump
```

#### 数据库恢复
```bash
# 方式一：使用系统恢复页面
# 访问: http://your-domain.com/admin/backup

# 方式二：使用 psql 恢复 SQL 文件
psql -h localhost -U postgres -d student_leave < backups/student-leave-20250101-120000.sql

# 方式三：使用 pg_restore 恢复自定义格式
pg_restore -h localhost -U postgres -d student_leave backups/student-leave-20250101-120000.dump
```

#### 自动备份
系统支持定时自动备份，在"系统设置 > 备份配置"中设置：
- 备份频率：每天/每周/每月
- 备份时间：建议选择低峰期
- 保留天数：建议 30 天

### 2. 文件系统备份

```bash
# 创建 PostgreSQL 备份脚本
cat > /opt/backup-student-leave.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/student-leave"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# 备份 PostgreSQL 数据库（使用 pg_dump）
pg_dump -h localhost -U postgres -d student_leave -F c -f $BACKUP_DIR/student-leave-$DATE.dump

# 保留最近 30 天的备份
find $BACKUP_DIR -name "student-leave-*.dump" -mtime +30 -delete

echo "Backup completed: student-leave-$DATE.dump"
EOF

chmod +x /opt/backup-student-leave.sh

# 添加到 crontab（每天凌晨 2 点备份）
crontab -e
# 添加: 0 2 * * * /opt/backup-student-leave.sh >> /var/log/student-leave-backup.log 2>&1
```

## 监控与日志

### 1. 应用日志

```bash
# PM2 部署
pm2 logs student-leave

# Docker 部署
docker compose logs -f student-leave

# Systemd 部署
sudo journalctl -u student-leave -f
```

### 2. Nginx 日志

```bash
# 访问日志
sudo tail -f /var/log/nginx/student-leave-access.log

# 错误日志
sudo tail -f /var/log/nginx/student-leave-error.log
```

### 3. 监控指标

建议监控以下指标：
- CPU 使用率
- 内存使用率
- 磁盘空间
- 响应时间
- 错误率

可以使用以下工具：
- **PM2 Plus**: https://pm2.io/
- **Grafana + Prometheus**: 开源监控方案
- **Uptime Kuma**: 简单的监控工具

## 故障排查

### 问题 1: 应用无法启动

```bash
# 检查端口占用
lsof -i :3000

# 检查日志
tail -f logs/pm2-error.log

# 检查数据库权限
ls -la data/student_leave.db
```

### 问题 2: 数据库锁定

```bash
# 停止应用
pm2 stop student-leave

# 删除 WAL 文件
rm data/student_leave.db-wal data/student_leave.db-shm

# 重启应用
pm2 start student-leave
```

### 问题 3: 内存不足

```bash
# 检查内存使用
free -h

# 重启应用释放内存
pm2 restart student-leave

# 或调整 PM2 配置中的 max_memory_restart
```

### 问题 4: 无法上传文件

检查 `MAX_FILE_SIZE` 环境变量和 Nginx 的 `client_max_body_size` 配置。

### 问题 5: 502 Bad Gateway

```bash
# 检查应用是否运行
pm2 status

# 检查端口监听
netstat -tlnp | grep 3000

# 检查 Nginx 配置
sudo nginx -t
```

## 性能优化建议

1. **启用 Gzip 压缩**（Nginx 配置）
2. **配置静态资源缓存**
3. **定期清理操作日志**（保留最近 3 个月）
4. **定期数据库优化**:
   ```bash
   # 进入数据库
   sqlite3 data/student_leave.db

   # 优化数据库
   VACUUM;
   ANALYZE;
   ```
5. **监控磁盘空间**，及时清理日志

## 安全加固

1. **防火墙配置**:
   ```bash
   # 只开放必要端口
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp   # HTTP
   sudo ufw allow 443/tcp  # HTTPS
   sudo ufw enable
   ```

2. **定期更新系统**:
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```

3. **配置 fail2ban 防止暴力破解**

4. **定期备份数据**

5. **使用强密码策略**

## 更新升级

```bash
# 1. 备份数据
cp -r data data.backup

# 2. 拉取最新代码
git fetch origin
git checkout origin/main  # 或对应版本标签

# 3. 安装依赖
npm install

# 4. 运行数据库迁移（如有）
npm run db:migrate

# 5. 重新构建
npm run build

# 6. 重启服务
pm2 restart student-leave
# 或
docker compose up -d --build
```

## 联系支持

如有部署问题，请联系技术支持或查阅项目文档。
