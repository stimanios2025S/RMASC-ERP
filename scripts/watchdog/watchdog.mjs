#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Watchdog (Agent de garde) 🛡️
//  Surveille la santé du backend en permanence, redémarre automatiquement en
//  cas de panne, et alerte le patron sur Telegram avec un diagnostic complet.
//
//  Zéro dépendance (Node >= 18, fetch natif). Tourne comme service système
//  (rmasc-watchdog.service) → il ne meurt jamais, Restart=always.
//
//  Commandes :
//    node watchdog.mjs                  → mode surveillance (normal)
//    node watchdog.mjs --once           → 1 seul check + exit (test manuel)
//    node watchdog.mjs --test-alert     → envoie un message Telegram de test
//    node watchdog.mjs --check-log      → scanne les logs 1 fois + exit
//
//  Config : variables d'env (voir /etc/rmasc-watchdog.env)
// ═══════════════════════════════════════════════════════════════════════════

import { execFileSync } from 'child_process'
import fs from 'fs'

// ─── CONFIG (env avec défauts sûrs) ────────────────────────────────────────
const CFG = {
  service:            process.env.WATCHDOG_SERVICE || 'rmasc-erp',
  healthUrl:          process.env.WATCHDOG_HEALTH_URL || 'http://localhost:4001/api/health',
  checkIntervalMs:    parseInt(process.env.WATCHDOG_CHECK_INTERVAL || '30000', 10),
  logScanIntervalMs:  parseInt(process.env.WATCHDOG_LOG_SCAN_INTERVAL || '60000', 10),
  healthTimeoutMs:    parseInt(process.env.WATCHDOG_HEALTH_TIMEOUT || '10000', 10),
  restartGraceMs:     parseInt(process.env.WATCHDOG_RESTART_GRACE || '15000', 10),
  maxRestarts:        parseInt(process.env.WATCHDOG_MAX_RESTARTS || '3', 10),
  restartWindowMs:    parseInt(process.env.WATCHDOG_RESTART_WINDOW || '600000', 10), // 10 min
  logCooldownMs:      parseInt(process.env.WATCHDOG_LOG_COOLDOWN || '300000', 10),   // 5 min / signature
  telegramToken:      process.env.TELEGRAM_BOT_TOKEN || '',
  telegramChatId:     process.env.TELEGRAM_CHAT_ID || '',
  logFile:            process.env.WATCHDOG_LOG || '/tmp/rmasc-watchdog.log',
  pidFile:            '/tmp/rmasc-watchdog.pid',
}

// ─── Logging (console + fichier) ───────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  try { fs.appendFileSync(CFG.logFile, line + '\n') } catch {}
}

// ─── Instance unique (évite 2 watchdogs qui se battent) ────────────────────
function acquireLock() {
  try {
    if (fs.existsSync(CFG.pidFile)) {
      const pid = parseInt(fs.readFileSync(CFG.pidFile, 'utf8'), 10)
      if (pid && Number.isInteger(pid)) {
        try { process.kill(pid, 0); log(`⚠️  Un autre watchdog tourne déjà (PID ${pid}). Exit.`); process.exit(0) } catch {}
      }
    }
    fs.writeFileSync(CFG.pidFile, String(process.pid))
    process.on('exit', () => { try { fs.unlinkSync(CFG.pidFile) } catch {} })
  } catch (e) { log(`⚠️  Lock: ${e.message}`) }
}

// ─── Exécution d'une commande (sans shell, timeout, pas de crash) ─────────
function run(cmd, args, timeoutMs = 10000) {
  try {
    const stdout = execFileSync(cmd, args, { timeout: timeoutMs, encoding: 'utf8' })
    return { code: 0, stdout: (stdout || '').trim(), stderr: '' }
  } catch (e) {
    return { code: e.status ?? -1, stdout: (e.stdout || '').toString().trim(), stderr: (e.stderr || '').toString().trim() }
  }
}

// ─── Check santé (avec timeout propre) ─────────────────────────────────────
async function healthCheck() {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CFG.healthTimeoutMs)
  try {
    const res = await fetch(CFG.healthUrl, { signal: controller.signal })
    const body = await res.text()
    let json = null
    try { json = JSON.parse(body) } catch {}
    return { ok: res.status === 200 && json?.status === 'ok', status: res.status, json }
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.cause?.code || e.message }
  } finally {
    clearTimeout(timer)
  }
}

// ─── Telegram ──────────────────────────────────────────────────────────────
let lastTelegramErrorAt = 0
async function telegramSend(text) {
  if (!CFG.telegramToken || !CFG.telegramChatId) {
    log(`  ⚠️  Telegram non configuré (manque TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID). Message non envoyé.`)
    return false
  }
  const safe = String(text).slice(0, 3500) // limite Telegram 4096
  try {
    const res = await fetch(`https://api.telegram.org/bot${CFG.telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CFG.telegramChatId, text: safe, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15000),
    })
    const body = await res.json()
    if (!body.ok) {
      log(`  ⚠️  Telegram API: ${body.description || 'erreur inconnue'}`)
      if (body.error_code === 401 && Date.now() - lastTelegramErrorAt > 600000) {
        log('  ⚠️  ⚠️  TELEGRAM TOKEN INVALIDE — vérifie le token du bot (401).')
        lastTelegramErrorAt = Date.now()
      }
      return false
    }
    log(`  📤 Alerte Telegram envoyée (${body.result?.message_id || '?'})`)
    return true
  } catch (e) {
    log(`  ⚠️  Telegram inaccessible: ${e.message}`)
    return false
  }
}

// ─── Diagnostics système (pour l'alerte CRITIQUE) ──────────────────────────
function gatherDiagnostics() {
  const lines = []
  const svc = run('systemctl', ['is-active', CFG.service])
  lines.push(`• Service ${CFG.service}: ${svc.stdout || svc.stderr || '?'}`)
  const status = run('systemctl', ['status', CFG.service, '--no-pager', '-l'])
  const statusLine = (status.stdout || '').split('\n').find(l => l.includes('Active:')) || '?'
  lines.push(`• ${statusLine.trim()}`)
  const mongo = run('systemctl', ['is-active', 'mongod'])
  lines.push(`• MongoDB (mongod): ${mongo.stdout || mongo.stderr || '?'}`)
  const disk = run('df', ['-h', '/'])
  const diskLine = (disk.stdout || '').split('\n')[1] || '?'
  lines.push(`• Disque /: ${diskLine.replace(/\s+/g, ' ')}`)
  const mem = run('free', ['-m'])
  const memLine = (mem.stdout || '').split('\n')[1] || '?'
  lines.push(`• Mémoire: ${memLine.replace(/\s+/g, ' ')} Mo`)
  const ports = run('ss', ['-tlnp'])
  const portLine = (ports.stdout || '').split('\n').find(l => l.includes('4001')) || 'port 4001 non écouté'
  lines.push(`• Port 4001: ${portLine.trim().replace(/\s+/g, ' ')}`)
  const logs = run('journalctl', ['-u', CFG.service, '-n', '15', '--no-pager'], 10000)
  if (logs.stdout) lines.push(`• Derniers logs:\n${logs.stdout.split('\n').slice(-15).join('\n')}`)
  return lines.join('\n')
}

// ─── Redémarrage du service ────────────────────────────────────────────────
function restartService() {
  const r = run('sudo', ['systemctl', 'restart', CFG.service], 20000)
  if (r.code !== 0) {
    // fallback sans sudo (au cas où)
    const r2 = run('systemctl', ['restart', CFG.service], 20000)
    return r2.code === 0
  }
  return true
}

// ─── Scanner de logs (signatures d'erreurs connues) ────────────────────────
const ERROR_SIGNATURES = [
  { name: 'ERR_HTTP_HEADERS_SENT (double réponse)', re: /ERR_HTTP_HEADERS_SENT|Cannot set headers after they are sent/i },
  { name: 'Module introuvable (deps cassées)',       re: /ERR_MODULE_NOT_FOUND|Cannot find module/i },
  { name: 'Port déjà utilisé (EADDRINUSE)',          re: /EADDRINUSE/i },
  { name: 'MongoDB déconnectée',                     re: /MongoNetworkError|MongoServerSelectionError|MongooseError.*(connect|open)|ECONNREFUSED.*27017/i },
  { name: 'Mémoire épuisée (heap OOM)',              re: /heap out of memory|JavaScript heap/i },
  { name: 'Exception non gérée',                     re: /uncaughtException|unhandledRejection/i },
  { name: 'Processus tué (OOM killer)',              re: /Killed|OOMKilled/i },
  { name: 'Timeout requête (504)',                   re: /La requête a expiré/i },
]
const signatureCooldowns = new Map() // signature → timestamp dernier alerté

async function scanLogs() {
  const sinceSec = Math.max(10, Math.ceil(CFG.logScanIntervalMs / 1000) + 5)
  const r = run('journalctl', ['-u', CFG.service, '--since', `${sinceSec} seconds ago`, '--no-pager'], 15000)
  const output = `${r.stdout}\n${r.stderr}`.slice(0, 200000)
  if (!output.trim()) return

  const now = Date.now()
  for (const sig of ERROR_SIGNATURES) {
    if (!sig.re.test(output)) continue
    const last = signatureCooldowns.get(sig.name) || 0
    if (now - last < CFG.logCooldownMs) continue
    signatureCooldowns.set(sig.name, now)
    const match = output.match(new RegExp(`.{0,120}${sig.re.source}.{0,120}`, 'i'))
    const excerpt = match ? match[0].replace(/\n/g, ' ⏎ ') : ''
    log(`👂 Log: ${sig.name}`)
    await telegramSend(
      `⚠️ RMASC — Erreur détectée (l'appli tourne encore)\n\n` +
      `• Signature: ${sig.name}\n` +
      `• Extrait: ${excerpt.slice(0, 300)}\n\n` +
      `⏱ ${new Date().toLocaleString('fr-FR')}`
    )
  }
}

// ─── Cycle de surveillance principal ───────────────────────────────────────
let consecutiveFailures = 0
let restartTimestamps = [] // anti-folie : max X redémarrages par fenêtre

async function checkOnce() {
  const h = await healthCheck()

  if (h.ok) {
    if (consecutiveFailures > 0) {
      log(`✅ Santé OK (après ${consecutiveFailures} échec(s) consécutif(s)) — uptime ${h.json?.uptimeSeconds ?? '?'}s`)
      await telegramSend(
        `✅ RMASC — Backend rétabli\n\n` +
        `• Le service répond de nouveau (uptime ${h.json?.uptimeSeconds ?? '?'}s)\n` +
        `• MongoDB: ${h.json?.database ?? '?'} (latence ${h.json?.databaseLatencyMs ?? '?'}ms)`
      )
    }
    consecutiveFailures = 0
    return
  }

  consecutiveFailures++
  const attempt = consecutiveFailures === 1 ? 'première détection' : `échec n°${consecutiveFailures} consécutif`
  log(`🚨 Santé KO (${attempt}): status=${h.status} ${h.error || ''}`)

  // ── Anti-folie : fenêtre de redémarrages ──
  const now = Date.now()
  restartTimestamps = restartTimestamps.filter(t => now - t < CFG.restartWindowMs)
  if (restartTimestamps.length >= CFG.maxRestarts) {
    log(`🔴 DÉJÀ ${restartTimestamps.length} redémarrages en ${Math.round(CFG.restartWindowMs / 60000)} min — arrêt des tentatives automatiques.`)
    await telegramSend(
      `🔴 CRITIQUE RMASC — Backend toujours DOWN après ${restartTimestamps.length} redémarrages automatiques.\n\n` +
      `Il faut une intervention humaine. Détails:\n\n${gatherDiagnostics()}`
    )
    return // ne pas redémarrer en boucle — on laisse passer la fenêtre
  }

  // ── Alerte détection + redémarrage ──
  await telegramSend(
    `🚨 ALERTE RMASC — le backend ne répond plus (${h.status || h.error})\n` +
    `→ Redémarrage automatique en cours…`
  )

  const restarted = restartService()
  restartTimestamps.push(Date.now())
  if (!restarted) {
    await telegramSend(`❌ Échec de la commande de redémarrage (sudo systemctl restart ${CFG.service}).\n\n${gatherDiagnostics()}`)
    return
  }
  log(`🔄 Service redémarré (tentative #${restartTimestamps.length}) — attente ${CFG.restartGraceMs / 1000}s…`)

  // ── Re-vérification après redémarrage (jusqu'à 60s) ──
  await new Promise(r => setTimeout(r, CFG.restartGraceMs))
  for (let i = 0; i < 9; i++) {
    const h2 = await healthCheck()
    if (h2.ok) {
      log(`✅ Rétabli après redémarrage (uptime ${h2.json?.uptimeSeconds ?? '?'}s)`)
      await telegramSend(
        `✅ RMASC — Redémarrage automatique réussi\n\n` +
        `• Le backend répond de nouveau (uptime ${h2.json?.uptimeSeconds ?? '?'}s)\n` +
        `• MongoDB: ${h2.json?.database ?? '?'} (latence ${h2.json?.databaseLatencyMs ?? '?'}ms)`
      )
      consecutiveFailures = 0
      return
    }
    await new Promise(r => setTimeout(r, 5000))
  }

  // ── Toujours DOWN → escalade avec diagnostic complet ──
  log(`🔴 Toujours DOWN après redémarrage — envoi du rapport complet.`)
  await telegramSend(
    `🔴 CRITIQUE RMASC — Backend DOWN même après redémarrage.\n\n` +
    `Rapport de diagnostic:\n\n${gatherDiagnostics()}`
  )
}

// ─── Mode test ─────────────────────────────────────────────────────────────
async function testAlert() {
  log(`🧪 Envoi d'un message de test Telegram…`)
  const ok = await telegramSend(
    `🧪 TEST RMASC Guard — ceci est un message de test.\n\n` +
    `Si tu reçois ce message, les alertes fonctionnent ✅\n` +
    `⏱ ${new Date().toLocaleString('fr-FR')}`
  )
  log(ok ? '✅ Test envoyé.' : '❌ Test échoué — vérifie token/chat_id.')
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--test-alert')) return testAlert()

  acquireLock()
  log(`🛡️  RMASC Guard démarré (PID ${process.pid}) — service: ${CFG.service}, check toutes les ${Math.round(CFG.checkIntervalMs / 1000)}s`)

  // Si le service est déjà DOWN au démarrage → agir immédiatement (pas d'attente)
  const h0 = await healthCheck()
  if (!h0.ok) {
    log(`🚨 Au démarrage, le backend ne répond pas (${h0.status || h0.error}) — action immédiate.`)
    await checkOnce()
  } else {
    log(`✅ Santé au démarrage: OK (uptime ${h0.json?.uptimeSeconds ?? '?'}s)`)
    await telegramSend(
      `🛡️ RMASC Guard en ligne — surveillance active.\n` +
      `• Backend: OK (uptime ${h0.json?.uptimeSeconds ?? '?'}s)\n` +
      `• Vérification toutes les ${Math.round(CFG.checkIntervalMs / 1000)}s + scanner de logs\n` +
      `• Les alertes arrivent ici ✅`
    )
  }

  if (args.includes('--once')) { log('Mode --once: exit.'); process.exit(0) }

  let lastLogScan = Date.now()
  setInterval(checkOnce, CFG.checkIntervalMs).unref()
  setInterval(() => {
    if (Date.now() - lastLogScan >= CFG.logScanIntervalMs) { lastLogScan = Date.now(); scanLogs() }
  }, CFG.logScanIntervalMs).unref()
}

main().catch(e => log(`❌ Watchdog crashé: ${e.stack || e.message}`))
