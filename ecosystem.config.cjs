// ═══════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — PM2 Ecosystem Config
//  Extension .cjs OBLIGATOIRE : package.json contient "type": "module",
//  donc un .js serait lu comme ES module par PM2 (erreur "module is not
//  defined"). Le .cjs force CommonJS → module.exports fonctionne.
//
//  Le port 4001 est GRAVÉ ici. Plus besoin de préfixe shell ni de
//  --update-env : `pm2 startOrRestart ecosystem.config.cjs` relit ce
//  fichier à chaque déploiement → zéro risque de finir sur le port 4000.
// ═══════════════════════════════════════════════════════════════════════
module.exports = {
  apps: [
    {
      name: 'rmasc-erp',
      cwd: '/home/sarlrmasc/rmasc-erp/backend',
      script: '/home/sarlrmasc/rmasc-erp/backend/api.mjs',
      interpreter: 'node',
      env: {
        PORT: '4001',
        NODE_ENV: 'production',
      },
      autorestart: true,
      kill_timeout: 5000,
    },
  ],
}
