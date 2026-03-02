#!/usr/bin/env node

/**
 * Docker 部署密钥生成脚本
 *
 * 使用方法:
 *   node scripts/generate-secrets.js
 *
 * 此脚本会生成以下密钥:
 * - DB_ENCRYPTION_KEY: 数据库加密密钥 (64位十六进制)
 * - CSRF_SECRET: CSRF Token 签名密钥 (64位十六进制)
 * - SESSION_SECRET: 会话密钥 (Base64编码)
 * - POSTGRES_PASSWORD: PostgreSQL 数据库密码 (随机生成)
 */

const crypto = require('crypto');

console.log('\n===================================');
console.log('  Docker 部署密钥生成');
console.log('===================================\n');

// 生成 64 位十六进制密钥 (32字节)
const dbKey = crypto.randomBytes(32).toString('hex');
const csrfKey = crypto.randomBytes(32).toString('hex');

// 生成 Base64 会话密钥
const sessionKey = crypto.randomBytes(32).toString('base64');

// 生成 PostgreSQL 密码 (16字节 + 特殊字符)
const postgresPassword = crypto.randomBytes(16).toString('base64').replace(/[+/=]/g, '').substring(0, 20) + '!A1';

console.log('请复制以下内容到您的 .env 文件:\n');
console.log('-----------------------------------');
console.log('# 数据库加密密钥 (64位十六进制)');
console.log('DB_ENCRYPTION_KEY=' + dbKey);
console.log('');
console.log('# CSRF Token 签名密钥 (64位十六进制)');
console.log('CSRF_SECRET=' + csrfKey);
console.log('');
console.log('# 会话密钥');
console.log('SESSION_SECRET=' + sessionKey);
console.log('');
console.log('# PostgreSQL 数据库密码');
console.log('POSTGRES_PASSWORD=' + postgresPassword);
console.log('');
console.log('# PostgreSQL 连接字符串 (已自动填充密码)');
console.log('POSTGRES_URL=postgresql://student_leave:' + postgresPassword + '@postgres:5432/student_leave');
console.log('-----------------------------------\n');

console.log('提示:');
console.log('  1. 将上述内容复制到 .env 文件中');
console.log('  2. 确保不要将 .env 文件提交到版本控制');
console.log('  3. 在生产环境中使用强密码');
console.log('');
