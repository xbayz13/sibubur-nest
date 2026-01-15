/**
 * PM2 Ecosystem Configuration for SiBubur Backend API
 * 
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

const path = require('path');

module.exports = {
  apps: [{
    name: 'sibubur-api',
    script: path.resolve(__dirname, 'dist/src/main.js'),
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    // Wait for graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 10000,
    shutdown_with_message: true,
  }]
};
