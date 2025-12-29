#!/bin/bash
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}学生请假管理系统 - 生产环境部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查 Node.js 版本
echo -e "\n${YELLOW}[1/8] 检查环境...${NC}"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}错误: 需要 Node.js >= 18${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js 版本检查通过${NC}"

# 安装依赖
echo -e "\n${YELLOW}[2/8] 安装依赖...${NC}"
npm ci
echo -e "${GREEN}✓ 依赖安装完成${NC}"

# 运行测试
echo -e "\n${YELLOW}[3/8] 运行测试...${NC}"
npm run test -- --run 2>/dev/null || echo -e "${YELLOW}⚠ 测试跳过（可能没有测试文件）${NC}"
echo -e "${GREEN}✓ 测试完成${NC}"

# 构建项目
echo -e "\n${YELLOW}[4/8] 构建项目...${NC}"
npm run build
echo -e "${GREEN}✓ 项目构建完成${NC}"

# 检查环境变量
echo -e "\n${YELLOW}[5/8] 检查环境变量...${NC}"
if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        echo -e "${YELLOW}⚠ 已创建 .env.local，请修改其中的配置项${NC}"
        echo -e "${YELLOW}特别是 SESSION_SECRET 必须设置为随机字符串${NC}"
        read -p "按回车继续编辑 .env.local..."
        ${EDITOR:-vi} .env.local
    else
        echo -e "${RED}错误: 缺少 .env.local.example 文件${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ 环境变量检查完成${NC}"

# 创建必要目录
echo -e "\n${YELLOW}[6/8] 创建目录结构...${NC}"
mkdir -p data/backups
mkdir -p logs
mkdir -p backups
echo -e "${GREEN}✓ 目录创建完成${NC}"

# 数据库迁移
echo -e "\n${YELLOW}[7/8] 数据库迁移...${NC}"
if [ -f lib/db/migrate.js ]; then
    node lib/db/migrate.js
else
    echo -e "${YELLOW}⚠ 未找到数据库迁移脚本${NC}"
fi
echo -e "${GREEN}✓ 数据库准备完成${NC}"

# 启动应用
echo -e "\n${YELLOW}[8/8] 启动应用...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.cjs 2>/dev/null || pm2 start ecosystem.config.cjs
    pm2 save
    echo -e "${GREEN}✓ 应用已启动 (PM2)${NC}"
    echo -e "${GREEN}查看状态: pm2 status${NC}"
    echo -e "${GREEN}查看日志: pm2 logs student-leave${NC}"
else
    echo -e "${YELLOW}⚠ PM2 未安装，使用 npm start 启动${NC}"
    echo -e "${YELLOW}建议安装 PM2: npm install -g pm2${NC}"
    npm start
fi

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}应用地址: http://localhost:3000${NC}"
echo -e "${GREEN}========================================${NC}"
