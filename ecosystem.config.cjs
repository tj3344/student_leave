module.exports = {
  apps: [
    {
      name: 'student-leave',
      script: 'server.js',
      cwd: '/app',
      instances: 1, // SQLite 不支持多实例并发写入
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/app/logs/pm2-error.log',
      out_file: '/app/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      // 自动重启配置
      min_uptime: '10s',
      max_restarts: 10,
      // 健康检查
      health_check_grace_period: 10000,
    },
  ],
};
