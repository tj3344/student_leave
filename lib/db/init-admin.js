#!/usr/bin/env node

/**
 * 初始化管理员用户脚本
 * 创建默认的 admin 用户
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// 加载 .env 文件
function loadEnvFile() {
  const envPaths = ['.env', '/app/.env', '/opt/student_leave/.env'];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`[INFO] 正在加载环境变量: ${envPath}`);
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

async function initAdminUser() {
  console.log('[INFO] 开始初始化管理员用户...');

  // 加载环境变量
  loadEnvFile();

  if (!process.env.POSTGRES_URL) {
    console.error('[ERROR] POSTGRES_URL 环境变量未设置');
    process.exit(1);
  }

  const { Client } = require('pg');
  const config = parsePostgresUrl(process.env.POSTGRES_URL);

  if (!config) {
    console.error('[ERROR] 无法解析数据库连接字符串');
    process.exit(1);
  }

  console.log(`[INFO] 连接到数据库: ${config.host}:${config.port}/${config.database}`);

  const client = new Client(config);

  try {
    await client.connect();
    console.log('[SUCCESS] 数据库连接成功');

    // 检查 admin 用户是否存在
    const checkResult = await client.query('SELECT id, username FROM users WHERE username = $1', ['admin']);

    if (checkResult.rows.length > 0) {
      console.log('[INFO] Admin 用户已存在，跳过创建');
      console.log('[INFO] 用户名: admin');
      console.log('[INFO] 密码: admin123 (如果需要重置，请手动修改数据库)');
      return;
    }

    // 创建 admin 用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const now = new Date();

    await client.query(`
      INSERT INTO users (username, password_hash, real_name, role, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, ['admin', hashedPassword, '系统管理员', 'admin', true, now, now]);

    console.log('[SUCCESS] Admin 用户创建成功！');
    console.log('');
    console.log('登录信息：');
    console.log('  用户名: admin');
    console.log('  密码: admin123');
    console.log('');
    console.log('⚠️  请登录后立即修改密码！');

  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('[INFO] Admin 用户已存在');
      console.log('[INFO] 用户名: admin');
      console.log('[INFO] 密码: admin123');
    } else {
      console.error('[ERROR] 初始化失败：' + error.message);
      console.error(error);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

initAdminUser();
