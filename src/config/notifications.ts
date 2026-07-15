// ─── RMASC FACTORY — Notification Service ──────────────────────────────
// Handles WhatsApp notifications, sound alerts, and browser notifications.
// Integrates with the backend /api/notifications/whatsapp endpoint.

import { apiFetch } from './api'

const ADMIN_PHONE = '+213550026660'

// ─── Play notification sound using Web Audio API ───────────────────────
// Generates a professional alert tone programmatically (no external files needed)
let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

export function playNotificationSound(): void {
  try {
    const ctx = getAudioContext()
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playTone(ctx))
    } else {
      playTone(ctx)
    }
  } catch {
    // Audio not supported — silent fallback
  }
}

function playTone(ctx: AudioContext): void {
  const now = ctx.currentTime

  // ── Professional chime: two ascending tones ──
  // First tone: 523 Hz (C5) — 150ms
  const osc1 = ctx.createOscillator()
  const gain1 = ctx.createGain()
  osc1.type = 'sine'
  osc1.frequency.value = 523
  gain1.gain.setValueAtTime(0.3, now)
  gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
  osc1.connect(gain1)
  gain1.connect(ctx.destination)
  osc1.start(now)
  osc1.stop(now + 0.15)

  // Second tone: 659 Hz (E5) — 200ms (starts after first tone ends)
  const osc2 = ctx.createOscillator()
  const gain2 = ctx.createGain()
  osc2.type = 'sine'
  osc2.frequency.value = 659
  gain2.gain.setValueAtTime(0.3, now + 0.12)
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.32)
  osc2.connect(gain2)
  gain2.connect(ctx.destination)
  osc2.start(now + 0.12)
  osc2.stop(now + 0.32)
}

// ─── Send WhatsApp notification via backend ────────────────────────────
export async function sendWhatsAppNotification(
  message: string,
  orderRef?: string,
  phone: string = ADMIN_PHONE
): Promise<boolean> {
  try {
    await apiFetch('/notifications/whatsapp', {
      method: 'POST',
      body: JSON.stringify({ phone, message, orderRef }),
    })
    return true
  } catch {
    console.warn('⚠️ Notification WhatsApp non disponible (hors-ligne)')
    return false
  }
}

// ─── Browser notification API ──────────────────────────────────────────
export function showBrowserNotification(title: string, body: string): void {
  try {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/images/rmasc-logo.png' })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          new Notification(title, { body, icon: '/images/rmasc-logo.png' })
        }
      })
    }
  } catch {
    // Notifications not supported
  }
}

// ─── Full alert: sound + WhatsApp + browser notification ──────────────
export async function triggerAlert(
  title: string,
  message: string,
  orderRef?: string
): Promise<void> {
  // 1. Play sound
  playNotificationSound()

  // 2. Browser notification
  showBrowserNotification(title, message)

  // 3. WhatsApp notification (fire-and-forget)
  sendWhatsAppNotification(`${title}\n${message}`, orderRef).catch(() => {})
}

// ─── Request notification permission (call once on mount) ──────────────
export function requestNotificationPermission(): void {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  } catch {
    // Silently fail
  }
}
