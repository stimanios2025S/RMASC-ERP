// ─── RMASC FACTORY — Notifications Controller ────────────────────────────

// POST /api/notifications/whatsapp
export async function sendWhatsApp(req, res) {
  try {
    const { phone, message, orderRef } = req.body
    if (!phone || !message) return res.status(400).json({ error: 'Téléphone et message requis.' })

    const targetPhone = phone || process.env.ADMIN_WHATSAPP || '+213550026660'
    const maskedPhone = targetPhone.slice(0, 5) + '****' + targetPhone.slice(-2)
    console.log(`[WHATSAPP] Notification → ${maskedPhone} (ref: ${orderRef || 'RMASC'})`)

    // WhatsApp Business API — placeholder (commented out until configured)
    // const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY
    // if (WHATSAPP_API_KEY) { ... }

    res.json({
      success: true,
      message: 'Notification enregistrée.',
      phone: targetPhone,
      timestamp: new Date().toISOString(),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
}
