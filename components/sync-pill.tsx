'use client'

import { useEffect, useState } from 'react'
import { CloudCheckIcon, WifiOffIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlba } from '@/lib/store'

/**
 * Indicateur de synchronisation hors-ligne → en ligne.
 * Au retour du réseau, une onde traverse l'icône : les données en attente partent.
 */
export function SyncPill({ compact = false }: { compact?: boolean }) {
  const { etat } = useAlba()
  const [enLigne, setEnLigne] = useState(true)
  const [synchro, setSynchro] = useState(false)
  const enAttente = etat.enAttente.length

  useEffect(() => {
    const online = () => {
      setEnLigne(true)
      setSynchro(true)
      window.setTimeout(() => setSynchro(false), 2200)
    }
    const offline = () => setEnLigne(false)
    setEnLigne(navigator.onLine)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  const label = !enLigne
    ? enAttente > 0
      ? `${enAttente} ticket${enAttente > 1 ? 's' : ''} gardé${enAttente > 1 ? 's' : ''} ici`
      : 'Hors-ligne — tout est gardé'
    : synchro
      ? 'Synchronisation…'
      : enAttente > 0
        ? `${enAttente} à envoyer`
        : 'À jour'

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
        enLigne
          ? 'bg-success/12 text-success'
          : 'bg-warning/12 text-warning animate-shake',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex size-4 items-center justify-center">
        {synchro && (
          <span className="absolute inset-0 rounded-full bg-current/40 animate-wave" />
        )}
        {enLigne ? (
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
