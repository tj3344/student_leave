# Docker 部署指南

## 场景：独立 PostgreSQL 容器

如果你的 PostgreSQL 数据库运行在独立的 Docker 容器中，需要配置网络连接。

### 步骤 1：查找 PostgreSQL 容器信息

```bash
# 查看 PostgreSQL 容器名称和网络
docker ps | grep postgres

# 查看容器的网络
docker inspect <postgres-container-name> | grep Network
```

### 步骤 2：创建或使用共享网络

```bash
# 创建一个共享网络（如果还没有）
docker network create postgres-network

# 将 PostgreSQL 容器加入到该网络
docker network connect postgres-network <postgres-container-name>
```

### 步骤 3：配置环境变量

在 `.env` 文件中设置：

```bash
# PostgreSQL 容器名称作为主机名
POSTGRES_URL=postgresql://tianjun:tj875891..@<postgres-container-name>:5432/student_leave

# 网络名称（默认是 postgres-network）
POSTGRES_NETWORK_NAME=postgres-network

# 其他配置
DB_ENCRYPTION_KEY=897f8de7fa8bebf00f8eea89282b4929f844ca43fa62e578b1cd3a2f99170a69
SESSION_SECRET=student-leave-secret-key-2025-production
```

### 步骤 4：启动应用

```bash
docker-compose up -d --build
```

## 场景：使用 Compose 内置 PostgreSQL

如果希望 Docker Compose 同时管理 PostgreSQL，使用：

```bash
# 配置环境变量
export POSTGRES_USER=student_leave
export POSTGRES_PASSWORD=your-password
export POSTGRES_DB=student_leave
export POSTGRES_URL=postgresql://student_leave:your-password@postgres:5432/student_leave

# 启动（包含 PostgreSQL）
docker-compose --profile with-postgres up -d
```

## 故障排查

### 查看容器网络
```bash
docker network ls
docker network inspect <network-name>
```

### 测试网络连接
```bash
# 进入应用容器
docker exec -it student-leave-app sh

# 测试 PostgreSQL 连接
nc -zv <postgres-container-name> 5432
```

### 常见错误

**ENOTFOUND host.docker.internal**
- Linux Docker 不支持此地址
- 需要使用容器网络连接

**Connection refused**
- 检查 PostgreSQL 容器是否运行
- 确认两个容器在同一网络中
- 验证 POSTGRES_URL 中的容器名正确

**Authentication failed**
- 检查用户名密码是否正确
- 确认 PostgreSQL 允许容器连接
