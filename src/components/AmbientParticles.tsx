// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Ambient Floating Particles
//  Particules subtiles qui flottent dans l'arrière-plan.
//  100% CSS — pas de canvas, pas de dépendance.
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  opacity: number
}

export default function AmbientParticles({ count = 15 }: { count?: number }) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1.5 + Math.random() * 3,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.25,
    }))
  )

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-amber-400/30 animate-particle-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{particleStyles}</style>
    </div>
  )
}

const particleStyles = `
  @keyframes particle-float {
    0%, 100% {
      transform: translateY(0) translateX(0) scale(1);
      opacity: 0;
    }
    10% {
      opacity: 0.3;
    }
    50% {
      transform: translateY(-80px) translateX(30px) scale(1.5);
      opacity: 0.15;
    }
    90% {
      opacity: 0.1;
    }
    100% {
      transform: translateY(-160px) translateX(-20px) scale(0.5);
      opacity: 0;
    }
  }
`
