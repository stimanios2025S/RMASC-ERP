import { useState } from 'react'

interface HelpSection {
  id: string
  icon: string
  title: string
  steps: { label: string; desc: string; jump?: string }[]
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'overview',
    icon: '📊',
    title: 'Overview complet — Tableau de bord',
    steps: [
      { label: 'Indicateurs KPI', desc: 'Les 4 cartes en haut affichent en temps réel le total des commandes, celles livrées, en production et les brouillons, directement depuis la base Neon PostgreSQL.', jump: 'dashboard' },
      { label: 'Répartition par application', desc: 'Le graphique à barres montre la distribution des projets par catégorie : Résidentiel, Commercial, Charges Lourdes et Sur-mesure.' },
      { label: 'Commandes récentes', desc: 'La liste de droite affiche les 5 dernières commandes créées. Passez la souris pour voir le bouton 📄 Fiche Technique.', jump: 'commandes' },
      { label: 'Rappels atelier', desc: 'La carte Rappels Atelier affiche les alertes de contrôle qualité et les échéances importantes de production.' },
    ],
  },
  {
    id: 'commandes',
    icon: '📋',
    title: 'Mes commandes — Gestion des ordres',
    steps: [
      { label: 'Liste complète', desc: 'Toutes les commandes sont affichées dans un tableau triable et filtrable avec barre de recherche.', jump: 'commandes' },
      { label: 'Filtres par statut', desc: 'Cliquez sur les pastilles de statut pour filtrer la liste : Brouillon, Attente Plan, Approbation Admin, etc.' },
      { label: 'Détails d\'une commande', desc: 'Cliquez sur une ligne pour ouvrir la vue détaillée avec dimensions, matériaux, options et motorisation.' },
      { label: 'Fiche Technique', desc: 'Depuis la liste ou la vue détail, cliquez sur 📄 pour générer et imprimer la Fiche Technique officielle au format A4.', jump: 'fiche' },
    ],
  },
  {
    id: 'validations',
    icon: '✅',
    title: 'Validations — Approbations Bureau d\'Études',
    steps: [
      { label: 'Commandes en attente', desc: 'La section Validations liste toutes les commandes nécessitant votre approbation (statut ATTENTE_APPROBATION_ADMIN).', jump: 'validations' },
      { label: 'Vérifier le plan', desc: 'Cliquez sur "Vérifier →" pour ouvrir le plan d\'installation dans le visualiseur CAD sécurisé.' },
      { label: 'Approuver ou rejeter', desc: 'Dans le visualiseur, utilisez ✅ Approuver pour valider le plan et passer au Dessin 2D, ou ❌ Rejeter pour renvoyer à l\'ingénieur avec un motif.' },
    ],
  },
  {
    id: 'roadmap',
    icon: '🚀',
    title: 'Roadmap Production — Suivi temporel',
    steps: [
      { label: 'Vue d\'ensemble', desc: 'La Roadmap affiche toutes les commandes avec leur position dans le cycle PLM : Création → Plan Installation → Validation Admin → Dessin 2D → Vérification → Prêt Production.', jump: 'roadmap' },
      { label: 'Timeline interactive', desc: 'Cliquez sur une commande pour développer sa timeline. Chaque étape affiche le temps restant estimé et une barre de progression.' },
      { label: 'Filtres et recherche', desc: 'Utilisez la barre de recherche par série/client et les pastilles de filtre pour isoler un statut spécifique.' },
    ],
  },
  {
    id: 'creation',
    icon: '➕',
    title: 'Ajouter un ascenseur — Nouvelle commande',
    steps: [
      { label: 'Lancer le wizard', desc: 'Dans le Tableau de bord, cliquez sur "Ajouter un ascenseur" pour ouvrir l\'assistant de configuration en 6 étapes.', jump: 'add-elevator' },
      { label: 'Étape 1 — Client', desc: 'Renseignez le nom du client, l\'email (optionnel), le téléphone et la ville.' },
      { label: 'Étape 2 — Motorisation', desc: 'Sélectionnez le type (ÉLECTRIQUE ou HYDRAULIQUE), le sous-type, la vitesse (m/s) et le nombre d\'étages.' },
      { label: 'Étape 3 — Dimensions', desc: 'Saisissez la largeur, la profondeur et la hauteur de la gaine technique en millimètres.' },
      { label: 'Étape 4 — Matériaux', desc: 'Choisissez les matériaux pour la cabine, les portes, les parois et le sol parmi les catalogues RMASC.' },
      { label: 'Étape 5 — Options', desc: 'Activez les options : panoramique, secours, annonces vocales, CCTV, portes coupe-feu, panneau tactile.' },
      { label: 'Étape 6 — Finalisation', desc: 'Vérifiez le récapitulatif, confirmez et validez. Un numéro de série unique RMASC-2026-XXXXXX est généré automatiquement.' },
    ],
  },
  {
    id: 'bureau-etude',
    icon: '📐',
    title: 'Bureau d\'Études — PLM & Cycle de vie',
    steps: [
      { label: 'Stades PLM', desc: 'Naviguez entre les stades via le panneau latéral : Plan Installation, Approbation, Dessin 2D, Vérification, Prêt Production.' },
      { label: 'Visualiseur CAD', desc: 'Le visualiseur intégré affiche le blueprint technique avec grille, cotes, et matériaux. Utilisez +/− pour le zoom, ▦ pour la grille, ⛶ pour le plein écran.' },
      { label: 'Dépôt de fichiers', desc: 'Glissez-déposez vos fichiers (PDF, DXF, DWG, SVG) dans la zone prévue pour chaque étape du processus.' },
      { label: 'Signature électronique', desc: 'L\'approbation admin applique un tampon "ACCEPTATION RMASC" visible directement sur le plan technique.' },
    ],
  },
]

const JUMPS: Record<string, string> = {
  'dashboard': 'dashboard',
  'commandes': 'commandes',
  'validations': 'validations',
  'roadmap': 'roadmap',
  'add-elevator': 'add-elevator',
}

interface Props {
  onBack?: () => void
}

export default function HelpPage({ onBack }: Props) {
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({})

  const filtered = HELP_SECTIONS.map(section => ({
    ...section,
    steps: section.steps.filter(s => !search || s.label.toLowerCase().includes(search.toLowerCase()) || s.desc.toLowerCase().includes(search.toLowerCase())),
  })).filter(s => s.steps.length > 0)

  const toggleStep = (stepKey: string) => {
    setExpandedSteps(prev => ({ ...prev, [stepKey]: !prev[stepKey] }))
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-800/70">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-slate-800/70 border-b border-white/10 px-6 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <span className="text-white text-lg">❓</span>
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-tight">🧭 Catalogue d'utilisation</h1>
              <p className="text-[11px] text-white font-semibold">Guide complet — RMASC FACTORY v2.5.2</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une fonctionnalité..."
            className="w-64 px-3.5 py-2 pl-9 rounded-xl bg-slate-800/70 border border-white/10 text-sm text-white placeholder:text-white/80 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* ── Hero banner ── */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-3xl flex-shrink-0 border border-amber-500/20">📘</div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Bienvenue dans le guide RMASC FACTORY</h2>
              <p className="text-white/90 text-sm mt-1 max-w-2xl">
                Ce catalogue vous présente l'ensemble des fonctionnalités du progiciel de gestion intégré pour l'industrie ascenseur.
                Utilisez la barre de recherche ou naviguez par sections pour découvrir comment utiliser chaque module.
              </p>
            </div>
          </div>
        </div>

        {/* ── Quick jump cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {HELP_SECTIONS.slice(0, 4).map(s => (
            <button key={s.id} onClick={() => setActiveSection(activeSection === s.id ? null : s.id)}
              className={`text-left p-3.5 rounded-xl border transition-all ${activeSection === s.id ? 'bg-amber-500/10 border-amber-500/30 shadow-sm' : 'bg-slate-800/70 border-white/10 hover:border-white/10 hover:shadow-sm'}`}>
              <span className="text-xl block mb-1">{s.icon}</span>
              <p className="text-xs font-bold text-white leading-tight">{s.title.split('—')[0].trim()}</p>
            </button>
          ))}
        </div>

        {/* ── Sections détaillées ── */}
        {filtered.map(section => (
          <div key={section.id} id={`section-${section.id}`} className={`bg-slate-800/70 rounded-2xl border overflow-hidden shadow-sm transition-all ${activeSection && activeSection !== section.id ? 'opacity-40' : ''}`}>
            <div
              onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
              className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/70 transition-all border-b border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{section.icon}</span>
                <h3 className="text-sm font-extrabold text-white">{section.title}</h3>
              </div>
              <svg className={`w-4 h-4 text-white/80 transition-transform ${activeSection === section.id ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {activeSection === section.id && (
              <div className="p-5 space-y-3">
                {section.steps.map((step, idx) => {
                  const stepKey = `${section.id}-${idx}`
                  const isOpen = expandedSteps[stepKey]
                  return (
                    <div key={stepKey} className="border border-white/10 rounded-xl overflow-hidden">
                      <div
                        onClick={() => toggleStep(stepKey)}
                        className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-slate-800/70 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                          <span className="text-sm font-semibold text-white">{step.label}</span>
                        </div>
                        <svg className={`w-3.5 h-3.5 text-white/80 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                      {isOpen && (
                        <div className="px-4 pb-3 pt-1 border-t border-white/5">
                          <p className="text-sm text-white leading-relaxed">{step.desc}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* ── Contact / Support ── */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl flex-shrink-0">📧</div>
            <div>
              <h3 className="text-sm font-extrabold text-white mb-1">📬 Support technique & signalement d'incidents</h3>
              <p className="text-sm text-white mb-2">
                Pour toute question, suggestion ou signalement d'anomalie concernant le fonctionnement du progiciel,
                veuillez contacter l'administrateur système à l'adresse suivante :
              </p>
              <a
                href="mailto:stimanios.boukrif@univ-bouira.dz"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Contacter : stimanios.boukrif@univ-bouira.dz
              </a>
              <p className="text-xs text-white/80 mt-2">Temps de réponse estimé : 24 à 48 heures ouvrées</p>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center text-[10px] text-white/80 py-4">
          <p>RMASC FACTORY v2.5.2 — Documentation générée le {new Date().toLocaleDateString('fr-FR')}</p>
          <p>© 2026 RMASC — Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}
