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
      // PM2 ne charge PAS le fichier .env du backend par défaut → on lui
      // donne les variables en dur. PORT=4001 + l'URI MongoDB (telle
      // qu'elle est dans backend/.env) pour que le process PM2 ait le
      // même environnement que le test direct (CONNECT OK).
      env: {
        PORT: '4001',
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://localhost:27017/rmasc-erp',
      },
      autorestart: true,
      // PM2 tuait le process 5s après le start (SIGTERM) avant la fin du
      // boot → boucle de redémarrage. 15s laisse MongoDB + index finir.
      kill_timeout: 15000,
      // Augmente aussi le délai avant que PM2 ne considère le start comme
      // un échec et ne relance le process en boucle.
      listen_timeout: 20000,
      restart_delay: 3000,
    },
  ],
}
