/**
 * Configuración de PM2 para Discord Bot
 * 
 * Uso:
 *   pm2 start ecosystem.config.js
 *   pm2 restart ecosystem.config.js
 *   pm2 stop ecosystem.config.js
 */

module.exports = {
  apps: [{
    // Información básica
    name: 'discord-bot',
    script: './dist/index.js',
    
    // Opciones de ejecución
    instances: 1,
    exec_mode: 'fork',
    
    // Reinicio automático
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    
    // Reintentos
    max_restarts: 10,
    min_uptime: '10s',
    
    // Variables de entorno
    env: {
      NODE_ENV: 'production',
    },
    
    // Logs
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Tiempo de espera para reinicio
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Configuración de cron para reinicio programado (opcional)
    // cron_restart: '0 3 * * *', // Reiniciar a las 3 AM todos los días
    
    // Configuración de tiempo
    time: true,
  }],
  
  // Configuración de deployment (opcional)
  deploy: {
    production: {
      user: 'usuario',
      host: '<IP_DEL_VPS>',
      ref: 'origin/main',
      repo: 'git@github.com:TU_USUARIO/TU_REPO.git',
      path: '/home/usuario/discord-bot',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-deploy-local': '',
      'post-setup': 'npm install'
    }
  }
};
