#!/usr/bin/env node

/**
 * 数据库迁移脚本
 * 直接执行 SQL 迁移文件
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  debug: (msg) => console.log(`${colors.cyan}[DEBUG]${colors.reset} ${msg}`),
};

// 加载 .env 文件
function loadEnvFile() {
  const envPaths = ['.env', '/app/.env', '/opt/student_leave/.env'];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      log.info(`正在加载环境变量: ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          if (key && value) {
            process.env[key.trim()] = value;
          }
        }
      });
    }
  }
}

// 解析 PostgreSQL 连接字符串
function parsePostgresUrl(url) {
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) return null;
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

// 执行 SQL 迁移
async function runMigration() {
  log.info('开始执行数据库迁移...');

  // 加载环境变量
  loadEnvFile();

  // 检查环境变量
  if (!process.env.POSTGRES_URL) {
    log.error('POSTGRES_URL 环境变量未设置');
    log.info('');
    log.info('请确保在 1Panel 环境变量中配置了 POSTGRES_URL');
    log.info('格式: postgresql://用户名:密码@主机:端口/数据库名');
    process.exit(1);
  }

  log.info('数据库连接已配置');

  const { Client } = require('pg');
  const config = parsePostgresUrl(process.env.POSTGRES_URL);

  if (!config) {
    log.error('无法解析数据库连接字符串');
    process.exit(1);
  }

  log.debug(`连接到数据库: ${config.host}:${config.port}/${config.database}`);

  const client = new Client(config);

  try {
    await client.connect();
    log.success('数据库连接成功');

    // 查找迁移文件
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      log.warn(`迁移目录不存在: ${migrationsDir}`);
      log.info('跳过数据库迁移，使用应用自动初始化');
      return;
    }

    // 读取迁移文件
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
      .sort();

    if (migrationFiles.length === 0) {
      log.warn('没有找到迁移文件');
      return;
    }

    log.info(`找到 ${migrationFiles.length} 个迁移文件`);

    // 执行每个迁移文件
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      log.info(`正在执行迁移: ${file}`);

      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        log.success(`✓ ${file} 执行成功`);
      } catch (err) {
        // 如果是表已存在的错误，可以忽略
        if (err.message.includes('already exists')) {
          log.warn(`  ${file} 部分跳过（表已存在）`);
        } else {
          throw err;
        }
      }
    }

    log.success('数据库迁移完成！');
    log.info('');
    log.info('下一步：');
    log.info('1. 访问应用首页');
    log.info('2. 使用默认账号登录 (admin/admin123)');
    log.info('3. 首次登录后请修改密码');

  } catch (error) {
    log.error('数据库迁移失败：' + error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
