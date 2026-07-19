// ─── RMASC FACTORY — Real-time SSE Controller ───────────────────────────
// Server-Sent Events pour notifications instantanées.
// Plus léger que WebSocket, compatible Cloudflare Tunnel.

// Stockage des clients SSE connectés
const clients = new Map()
let clientIdCounter = 0

// ─── GET /api/realtime/subscribe — Client SSE ───────────────────────────
export function subscribe(req, res) {
  // Headers SSE obligatoires
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Désactive le buffering nginx
  })

  const clientId = ++clientIdCounter
  const client = { id: clientId, res, user: req.user }
  clients.set(clientId, client)

  console.log(`[SSE] Client ${clientId} connecté — ${req.user?.userId || 'anon'}`)

  // Envoyer un événement de bienvenue
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, message: 'Connecté au flux temps réel' })}\n\n`)

  // Heartbeat toutes les 30s pour garder la connexion ouverte
  const heartbeat = setInterval(() => {
    try { res.write(`event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`) }
    catch { clearInterval(heartbeat); clients.delete(clientId) }
  }, 30_000)

  // Nettoyage à la déconnexion
  req.on('close', () => {
    clearInterval(heartbeat)
    clients.delete(clientId)
    console.log(`[SSE] Client ${clientId} déconnecté`)
  })
}

// ─── Fonction utilitaire pour envoyer un événement à tous les clients ────
export function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const [id, client] of clients) {
    try { client.res.write(payload) }
    catch { clients.delete(id) }
  }
}

// ─── Fonction utilitaire pour envoyer à un role spécifique ───────────────
export function broadcastToRole(event, data, role) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const [id, client] of clients) {
    if (client.user?.role === role) {
      try { client.res.write(payload) }
      catch { clients.delete(id) }
    }
  }
}

// ─── POST /api/realtime/broadcast — Envoyer un événement (admin only) ────
export function sendEvent(req, res) {
  try {
    const { event, data, role } = req.body
    if (!event) return res.status(400).json({ error: 'Nom d\'événement requis.' })

    if (role) broadcastToRole(event, data, role)
    else broadcast(event, data)

    res.json({ success: true, sent: clients.size })
  } catch (e) { res.status(500).json({ error: e.message }) }
}

// ─── Hook dans les contrôleurs existants pour broadcast automatique ──────
// Ces fonctions seront appelées après chaque action importante
export function notifyOrderCreated(order) {
  broadcast('order:created', {
    id: order._id?.toString(),
    serialNumber: order.serialNumber,
    clientName: order.clientName,
    status: order.status,
    message: `Nouvelle commande: ${order.serialNumber}`,
  })
}

export function notifyOrderStatusChanged(orderId, serialNumber, oldStatus, newStatus) {
  broadcast('order:status', {
    id: orderId,
    serialNumber,
    oldStatus,
    newStatus,
    message: `Commande ${serialNumber}: ${oldStatus} → ${newStatus}`,
  })
}

export function notifyStockMovement(movement) {
  broadcast('stock:movement', {
    id: movement._id?.toString(),
    type: movement.type,
    quantity: movement.quantity,
    message: `Mouvement stock: ${movement.type === 'ENTRY' ? 'Entrée' : 'Sortie'} de ${movement.quantity}`,
  })
}

export function notifyOrderApproval(serialNumber, approvedBy) {
  broadcastToRole('order:approval', {
    serialNumber,
    approvedBy,
    message: `Plan approuvé: ${serialNumber} par ${approvedBy}`,
  }, 'PRODUCTION')
}

export function notifyFileUploaded(serialNumber, fileName, uploadedBy) {
  broadcast('order:file', {
    serialNumber,
    fileName,
    uploadedBy,
    message: `Fichier ajouté à ${serialNumber}: ${fileName}`,
  })
}
