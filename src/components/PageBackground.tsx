// ─── RMASC FACTORY — Unified Page Background ──────────────────────────
// Wraps any page content with a clean white background.

export function PageBackground({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative bg-white ${className}`}>
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}
