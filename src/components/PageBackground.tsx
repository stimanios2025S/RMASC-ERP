// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Unified Page Background
//  CSS-gradient based (NO heavy background image).
//  Fast loading, consistent across all portals.
//  Orange ambient glow adds depth without image download.
// ═══════════════════════════════════════════════════════════════════════════

export function PageBackground({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Base dark gradient — pure CSS, zero download */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900/95 to-slate-950" />

      {/* Subtle radial glow — CSS only, no image loaded */}
      <div className="absolute inset-0 z-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, rgba(251,146,60,0.4) 0%, transparent 60%),
                           radial-gradient(circle at 70% 60%, rgba(249,115,22,0.3) 0%, transparent 50%)`,
        }}
      />

      {/* Ambient glow */}
      <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-orange-600/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex-1 flex flex-col min-h-0">
        {children}
      </div>
    </div>
  )
}
