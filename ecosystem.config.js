module.exports = {
  apps: [
    {
      name: 'hr-daily-monitoring',
      script: 'server.js',
      cwd: './backend',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 80,
        HOST: '0.0.0.0'
      }
    }
  ]
};
