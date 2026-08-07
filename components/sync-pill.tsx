'use client'

import { useEffect, useState } from 'react'
import { CloudCheckIcon, WifiOffIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlba } from '@/lib/store'

/**
 * Indicateur de synchronisation robuste.
 * Se base sur la file d'attente réelle plutôt que l'état réseau théorique.
 */
export function SyncPill({ compact = false }: { compact?: boolean }) {
  const { etat } = useAlba()
  const [enLigne, setEnLigne] = useState(true)
  const enAttente = etat.enAttente.length
  
  // Petit délai visuel pour ne pas faire clignoter le loader si ça part très vite
  const [synchroVisible, setSynchroVisible] = useState(false)

  useEffect(() => {
    if (enAttente > 0) {
      const t = window.setTimeout(() => setSynchroVisible(true), 150)
      return () => clearTimeout(t)
    } else {
      setSynchroVisible(false)
    }
  }, [enAttente])

  useEffect(() => {
    const online = () => setEnLigne(true)
    const offline = () => setEnLigne(false)
    if (typeof navigator !== 'undefined') {
      setEnLigne(navigator.onLine)
    }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const label = !enLigne
    ? enAttente > 0
      ? `${enAttente} en attente (hors ligne)`
      : 'Hors-ligne'
    : synchroVisible
      ? `Envoi de ${enAttente} ticket${enAttente > 1 ? 's' : ''}...`
      : 'À jour'

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
        enAttente === 0
          ? 'bg-success/12 text-success'
          : 'bg-warning/12 text-warning',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-4 items-center justify-center">
        {synchroVisible ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : enLigne ? (
          <CloudCheckIcon className="size-4" />
        ) : (
          <WifiOffIcon className="size-4" />
        )}
      </span>
      {!compact && <span className="truncate">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}
