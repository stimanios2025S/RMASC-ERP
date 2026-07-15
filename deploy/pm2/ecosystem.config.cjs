// ═══════════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — PM2 Ecosystem File (Process Manager)
//  Gère le backend Node.js avec auto-redémarrage, logs, et monitoring
//  Utilisation : pm2 start ecosystem.config.cjs
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  apps: [
    {
      // ── Backend API ─────────────────────────────────────────────────────
      name: 'rmasc-api',
      cwd: '/opt/rmasc',
      script: './backend/api.mjs',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      env_file: './backend/.env',

      // ── Auto-restart ──────────────────────────────────────────────────
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      min_uptime: 10000,
      watch: false,

      // ── Logs ──────────────────────────────────────────────────────────
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/log/rmasc/api-error.log',
      out_file: '/var/log/rmasc/api-out.log',
      merge_logs: true,
      log_type: 'json',

      // ── Performance ───────────────────────────────────────────────────
      max_memory_restart: '500M',
      kill_timeout: 5000,
      listen_timeout: 10000,

      // ── Metadata ──────────────────────────────────────────────────────
      namespace: 'rmasc-production',
      description: 'RMASC Factory Backend API — Express/MongoDB',
    },
  ],

  // ── Déploiement (optionnel) ──────────────────────────────────────────────
  deploy: {
    production: {
      user: 'sarlrmasc',
      host: '192.168.1.95',
      ref: 'origin/main',
      repo: '',  // À configurer si vous utilisez Git
      path: '/opt/rmasc',
      'pre-deploy': 'git fetch --all && git reset --hard origin/main',
      'post-deploy': 'cd /opt/rmasc && npm install --production && npm run build && pm2 reload ecosystem.config.cjs --only rmasc-api',
      'pre-setup': 'sudo apt-get update && sudo apt-get install -y nodejs nginx',
    },
  },
}
