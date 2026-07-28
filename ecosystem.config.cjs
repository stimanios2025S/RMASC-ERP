// ─── RMASC FACTORY — PM2 Ecosystem Configuration ─────────────────────────
// Professional process management for production.
// Auto-restart, log rotation, health checks, graceful shutdown.
// Usage: pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [{
    name: 'rmasc-erp',
    script: 'backend/api.mjs',
    cwd: '/home/sarlrmasc/rmasc-erp',

    // ── Execution ──────────────────────────────────────────────────────────
    exec_mode: 'cluster',
    instances: 4,
    node_args: '--max-old-space-size=512',

    // ── Restart behavior (no more infinite crash loops) ────────────────────
    max_restarts: 5,
    min_uptime: 5000,         // Must stay up 5s to be considered "started"
    restart_delay: 2000,      // Wait 2s before restarting
    exp_backoff_restart_delay: 100, // Exponential: 100ms, 200ms, 400ms...
    autorestart: true,
    max_memory_restart: '400M',

    // ── Environment ────────────────────────────────────────────────────────
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 4000,
    },

    // ── Logs (rotated, never fill disk) ────────────────────────────────────
    error_file: '/home/sarlrmasc/.pm2/logs/rmasc-erp-error.log',
    out_file: '/home/sarlrmasc/.pm2/logs/rmasc-erp-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,

    // ── Watch ──────────────────────────────────────────────────────────────
    watch: false,  // Disabled in production — use GitHub Actions for deploys

    // ── Graceful shutdown ─────────────────────────────────────────────────
    kill_timeout: 10000,
    listen_timeout: 5000,
    shutdown_with_message: true,
  }],

  // ── Deployment config (for CI/CD) ───────────────────────────────────────
  deploy: {
    production: {
      user: 'sarlrmasc',
      host: '100.73.62.52',
      ref: 'origin/main',
      repo: 'https://github.com/stimanios2025S/RMASC-ERP.git',
      path: '/home/sarlrmasc/rmasc-erp',
      'post-deploy': 'npm ci && npm run build && pm2 startOrRestart ecosystem.config.cjs --env production',
    },
  },
}
