# ===================================
# 构建阶段
# ===================================
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置环境变量（不常变动，前置）
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    npm_config_production=false

# 安装编译依赖（better-sqlite3 需要）并清理缓存
RUN apk add --no-cache --virtual .gyp \
        python3 \
        make \
        g++ \
    && rm -rf /var/cache/apk/*

# 只复制依赖文件（优先复制，利用缓存）
COPY package.json package-lock.json ./

# 安装所有依赖（包括 devDependencies，用于构建）
RUN npm ci --prefer-offline --no-audit && \
    npm cache clean --force

# 只复制必要的源代码文件（避免复制整个项目）
COPY next.config.ts ./
COPY tsconfig.json ./
COPY components.json ./
COPY app ./app
COPY lib ./lib
COPY components ./components
COPY types ./types
COPY hooks ./hooks

# 复制 public 目录（使用 .gitkeep 确保目录非空）
COPY public ./public

# 构建应用
RUN npm run build && \
    rm -rf .next/cache

# ===================================
# 生产运行阶段
# ===================================
FROM node:18-alpine AS runner

# 合并 RUN 指令：安装运行时依赖 + 创建用户 + 设置时区
RUN apk add --no-cache tzdata \
    # 创建非 root 用户
    && addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001 \
    # 设置时区为上海
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone \
    && rm -rf /var/cache/apk/*

# 设置环境变量
ENV NODE_ENV=production \
    TZ=Asia/Shanghai \
    PORT=3000

# 设置工作目录
WORKDIR /app

# 复制必要文件（按顺序，利用缓存）
COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./

# 复制构建产物（只复制 standalone 输出）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 复制数据库层（运行时需要）
COPY --chown=nextjs:nodejs lib/db ./lib/db

# 安装 PM2（容器内进程管理）
RUN npm install -g pm2 && npm cache clean --force

# 复制 PM2 配置文件
COPY --chown=nextjs:nodejs ecosystem.config.cjs ./

# 创建必要的目录并设置权限
RUN mkdir -p /app/data/backups /app/logs && \
    chown -R nextjs:nodejs /app/data /app/logs

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 使用 PM2 Runtime 启动应用（容器内必须使用 --no-daemon）
CMD ["pm2-runtime", "start", "ecosystem.config.cjs", "--no-daemon"]
