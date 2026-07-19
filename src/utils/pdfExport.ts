// ─── RMASC FACTORY — PDF Export Engine ───────────────────────────────────
// Génère des PDFs pour les fiches techniques, bons de commande, etc.
// Utilise l'API Print du navigateur pour un rendu pixel-perfect.

/**
 * Exporte une fiche technique en PDF via l'impression navigateur.
 * @param orderId - ID de la commande
 * @param title - Titre du document
 */
export function printTechnicalSheet(orderId: string, title?: string) {
  // Ouvre la fiche technique dans une nouvelle fenêtre pour impression
  const win = window.open(`/fiche-technique/${orderId}/print`, '_blank')
  if (win) {
    win.focus()
  } else {
    // Fallback : popup bloquée → navigation directe
    window.location.href = `/fiche-technique/${orderId}/print`
  }
}

/**
 * Génère un PDF à partir d'un contenu HTML.
 * Crée une popup, y injecte le HTML puis appelle print().
 */
export function printHTML(html: string, title = 'RMASC - Document') {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Veuillez autoriser les popups pour imprimer.')
    return
  }
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        @page { margin: 15mm; size: A4 portrait; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; font-size: 12pt; line-height: 1.5; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f3f4f6; font-weight: 600; }
        h1 { font-size: 18pt; color: #f97316; margin-bottom: 5px; }
        h2 { font-size: 14pt; color: #334155; margin-top: 20px; border-bottom: 2px solid #f97316; padding-bottom: 4px; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .logo { font-size: 16pt; font-weight: 800; }
        .logo span { color: #f97316; }
        .meta { font-size: 10pt; color: #64748b; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9pt; font-weight: 600; }
        .badge-ok { background: #d1fae5; color: #065f46; }
        .badge-warn { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 9pt; color: #94a3b8; text-align: center; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .section { margin-bottom: 15px; }
        .label { color: #64748b; font-size: 10pt; }
        .value { font-weight: 600; font-size: 11pt; }
        @media print {
          .no-print { display: none !important; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>${html}</body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 500)
}

/**
 * Formatte un objet commande en HTML pour impression.
 */
export function orderToHTML(order: any): string {
  const options = [
    order.optPanoramique && 'Ascenseur panoramique',
    order.optSecours && 'Alimentation secours',
    order.optAnnoncesVocales && 'Annonces vocales',
    order.optCctv && 'CCTV intégré',
    order.optPortesCoupeFeu && 'Portes coupe-feu',
    order.optPanneauTactile && 'Panneau tactile',
    order.optVentilation && 'Ventilateur gaine',
    order.optBarreaudage && 'Barreaudage',
    order.optAlarme && 'Alarme cabine',
  ].filter(Boolean)

  const statusLabels: Record<string, string> = {
    BROUILLON: 'Brouillon', ATTENTE_DESSIN_TECH: 'Plan Installation',
    ATTENTE_APPROBATION_ADMIN: 'Approbation Admin', ATTENTE_DESSIN_2D: 'Dessin 2D',
    ATTENTE_VERIFICATION: 'Vérification', PRET_POUR_PRODUCTION: 'Prêt Production',
    EN_LIVRAISON: 'Livraison', LIVREE: 'Livrée', VALIDEE: 'Validée', ANNULEE: 'Annulée',
  }

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  return `
    <div class="header">
      <div class="logo"><span>RM</span>ASC <span>FACTORY</span></div>
      <div class="meta">Généré le ${date}</div>
    </div>
    <h1>
      Fiche Technique — ${order.serialNumber || 'Nouvelle commande'}
      <span class="badge ${order.status === 'VALIDE' || order.status === 'LIVREE' ? 'badge-ok' : 'badge-warn'}">${statusLabels[order.status] || order.status}</span>
    </h1>

    <div class="grid-2">
      <div class="section">
        <h2>👤 Client</h2>
        <div><span class="label">Nom :</span> <span class="value">${order.clientName || '—'}</span></div>
        ${order.clientEmail ? `<div><span class="label">Email :</span> <span class="value">${order.clientEmail}</span></div>` : ''}
        <div><span class="label">Téléphone :</span> <span class="value">${order.clientPhone || '—'}</span></div>
        <div><span class="label">Ville :</span> <span class="value">${order.clientCity || '—'}</span></div>
        ${order.projectName ? `<div><span class="label">Projet :</span> <span class="value">${order.projectName}</span></div>` : ''}
        <div><span class="label">Priorité :</span> <span class="value">${order.priority || 'Normale'}</span></div>
      </div>
      <div class="section">
        <h2>⚡ Motorisation</h2>
        <div><span class="label">Type :</span> <span class="value">${order.typeMotorisation || '—'}</span></div>
        ${order.vitesseMs ? `<div><span class="label">Vitesse :</span> <span class="value">${order.vitesseMs} m/s</span></div>` : ''}
        ${order.nombreEtages ? `<div><span class="label">Étages :</span> <span class="value">${order.nombreEtages}</span></div>` : ''}
      </div>
    </div>

    <h2>📏 Dimensions Gaine</h2>
    <table>
      <tr><th>Paramètre</th><th>Valeur (mm)</th></tr>
      <tr><td>Largeur gaine</td><td>${order.largeurGaineMm || '—'}</td></tr>
      <tr><td>Profondeur gaine</td><td>${order.profondeurGaineMm || '—'}</td></tr>
      <tr><td>Hauteur gaine</td><td>${order.hauteurGaineMm || '—'}</td></tr>
      ${order.profondeurCuvetteMm ? `<tr><td>Profondeur cuvette</td><td>${order.profondeurCuvetteMm}</td></tr>` : ''}
      ${order.hauteurDernierEtageMm ? `<tr><td>Hauteur dernier étage</td><td>${order.hauteurDernierEtageMm}</td></tr>` : ''}
      ${order.largeurCabineCalculeeMm ? `<tr><td>Largeur cabine calculée</td><td>${order.largeurCabineCalculeeMm}</td></tr>` : ''}
      ${order.profondeurCabineCalculeeMm ? `<tr><td>Profondeur cabine calculée</td><td>${order.profondeurCabineCalculeeMm}</td></tr>` : ''}
    </table>

    <div class="grid-2">
      <div class="section">
        <h2>🎨 Matériaux</h2>
        <div><span class="label">Cabine :</span> <span class="value">${order.materiauCabine || '—'}</span></div>
        <div><span class="label">Portes :</span> <span class="value">${order.materiauPortes || '—'}</span></div>
        <div><span class="label">Parois :</span> <span class="value">${order.materiauParois || '—'}</span></div>
      </div>
      <div class="section">
        <h2>📦 Options</h2>
        ${options.length > 0 ? options.map(o => `<div>✅ ${o}</div>`).join('') : '<div class="label">Aucune option</div>'}
      </div>
    </div>

    ${order.notes ? `
    <h2>📝 Notes</h2>
    <p>${order.notes}</p>` : ''}

    ${order.engineeredBy || order.totalCostDZD ? `
    <h2>💰 Coûts</h2>
    <table>
      ${order.engineeredBy ? `<tr><td>Ingénieur</td><td>${order.engineeredBy}</td></tr>` : ''}
      ${order.totalCostDZD ? `<tr><td>Coût total</td><td>${order.totalCostDZD.toLocaleString()} DZD</td></tr>` : ''}
      ${order.salePriceDZD ? `<tr><td>Prix vente</td><td>${order.salePriceDZD.toLocaleString()} DZD</td></tr>` : ''}
      ${order.marginPct ? `<tr><td>Marge</td><td>${order.marginPct}%</td></tr>` : ''}
    </table>` : ''}

    <div class="footer">
      RMASC FACTORY ERP — ${order.serialNumber} — ${date}<br>
      SARL RMASC — Tous droits réservés
    </div>
    <div class="no-print" style="text-align:center;margin-top:20px">
      <button onclick="window.print()" style="padding:10px 30px;background:#f97316;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer">🖨️ Imprimer / PDF</button>
    </div>
  `
}
