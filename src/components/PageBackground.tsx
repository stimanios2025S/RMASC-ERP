// ─── RMASC FACTORY — Unified Page Background ──────────────────────────
// Wraps any page content with the professional background image,
// dark overlay, and orange ambient glow — consistent across all portals.

export function PageBackground({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 z-0">
        <img src="/images/login-bg.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/92 via-slate-950/60 to-slate-950/20" />
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/8 blur-3xl" />
      </div>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
