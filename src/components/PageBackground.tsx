// ─── RMASC FACTORY — Unified Page Background ──────────────────────────
// Wraps any page content with the professional background image,
// dark overlay, and orange ambient glow — consistent across all portals.
// All decorative elements are contained with overflow-hidden so nothing
// bleeds off-screen or stretches the page horizontally.

export function PageBackground({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Base dark gradient — always visible, no image loading dependency */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />

      {/* Background image (silent on error) */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/login-bg.jpg"
          alt=""
          className="w-full h-full object-cover opacity-30"
          onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/50 to-slate-950/10" />
      </div>

      {/* Ambient glow — contained so they never cause horizontal scroll */}
      <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 min-h-0">
        {children}
      </div>
    </div>
  )
}
