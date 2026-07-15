// ═══════════════════════════════════════════════════════════════════════════
//  RMASC FACTORY — Agent Speech Input (Voice Recognition)
//  Utilise l'API Web Speech pour la reconnaissance vocale.
//  Supporte Français, Arabe, Kabyle, Derja, Anglais — automatiquement.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react'

interface SpeechInputProps {
  onResult: (text: string) => void
  language?: string
  disabled?: boolean
}

// Languages supported by Web Speech API
const LANG_MAP: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-DZ',
  en: 'en-US',
  kab: 'fr-FR', // Kabyle falls back to French
  derja: 'ar-DZ', // Derja falls back to Arabic
}

export default function SpeechInput({ onResult, language = 'fr-FR', disabled = false }: SpeechInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = language

    recognition.onresult = (event: any) => {
      let final = ''
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        } else {
          interim += event.results[i][0].transcript
        }
      }
      setTranscript(final || interim)

      if (final) {
        onResult(final)
        setIsListening(false)
      }
    }

    recognition.onerror = (event: any) => {
      console.warn('[SPEECH] Error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        setTranscript('⚠️ Microphone non autorisé. Vérifiez les permissions.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      try { recognition.abort() } catch {}
    }
  }, [language, onResult])

  const toggleListening = useCallback(() => {
    if (isListening) {
      try { recognitionRef.current?.stop() } catch {}
      setIsListening(false)
    } else {
      try {
        recognitionRef.current?.start()
        setIsListening(true)
        setTranscript('🎤 Écoute en cours...')
      } catch (e) {
        console.warn('[SPEECH] Start failed:', e)
        setIsListening(false)
      }
    }
  }, [isListening])

  if (!supported) return null

  const isActive = isListening

  return (
    <div className="relative flex items-center">
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
          isActive
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-glow'
            : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white'
        }`}
        title={isActive ? 'Arrêter l\'écoute' : 'Parler à Salim'}
      >
        {isActive ? (
          <span className="text-sm relative">
            🎤
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white animate-pulse" />
          </span>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="22"/>
          </svg>
        )}
      </button>

      {/* Indicator pill when listening */}
      {isActive && (
        <div className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 z-50 bg-slate-800 border border-slate-600 rounded-full px-3 py-1 flex items-center gap-2 whitespace-nowrap shadow-lg animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-white font-medium">
            {transcript || 'Parlez maintenant...'}
          </span>
          <button onClick={() => { try { recognitionRef.current?.stop() } catch {} setIsListening(false) }}
            className="text-slate-400 hover:text-white text-xs ml-1">✕</button>
        </div>
      )}
    </div>
  )
}
