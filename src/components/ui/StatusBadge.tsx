// ─── RMASC FACTORY — Shared StatusBadge Component ────────────────────────
// Affiche le statut d'une commande avec la couleur appropriée.

interface StatusBadgeProps {
  status: string
  className?: string
}

const COLORS: Record<string, string> = {
  BROUILLON: 'bg-white/15 text-white/80 border border-white/[0.10]',
  ATTENTE_DESSIN_TECH: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  ATTENTE_APPROBATION_ADMIN: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  ATTENTE_DESSIN_2D: 'bg-violet-500/15 text-violet-400 border border-violet-500/20',
  ATTENTE_VERIFICATION: 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
  PRET_POUR_PRODUCTION: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  EN_LIVRAISON: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  LIVREE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  VALIDEE: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  ANNULEE: 'bg-red-500/15 text-red-400 border border-red-500/20',
}

const LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ATTENTE_DESSIN_TECH: 'Plan Installation',
  ATTENTE_APPROBATION_ADMIN: 'Approbation Admin',
  ATTENTE_DESSIN_2D: 'Dessin 2D',
  ATTENTE_VERIFICATION: 'Vérification',
  PRET_POUR_PRODUCTION: 'Prêt Production',
  EN_LIVRAISON: 'En Livraison',
  LIVREE: 'Livrée',
  VALIDEE: 'Validée',
  ANNULEE: 'Annulée',
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const colorClass = COLORS[status] || 'bg-white/15 text-white/80 border border-white/[0.10]'
  const label = LABELS[status] || status
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${colorClass} ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
      {label}
    </span>
  )
}
