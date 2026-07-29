'use client'

import { CheckCircle2Icon, InfoIcon, TriangleAlertIcon, XIcon } from 'lucide-react'
import { useAlba } from '@/lib/store'
import { cn } from '@/lib/utils'

const ICONES = {
  succes: CheckCircle2Icon,
  info: InfoIcon,
  alerte: TriangleAlertIcon,
}

const TONS = {
  succes: 'border-success/35 text-success',
  info: 'border-border text-foreground',
  alerte: 'border-destructive/35 text-destructive',
}

/** Retours d'action, toujours au-dessus du pouce sur mobile. */
export function Notifs() {
  const { notifs, fermerNotif } = useAlba()

  if (notifs.length === 0) return null

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-70 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:left-auto lg:right-6 lg:items-end lg:px-0"
    >
      {notifs.map((n) => {
        const Icone = ICONES[n.ton]
        return (
          <div
            key={n.id}
            className={cn(
              'animate-pop glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-xl',
              TONS[n.ton],
            )}
          >
            <Icone className="mt-0.5 size-4 shrink-0" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-medium text-foreground">{n.titre}</p>
              {n.detail && (
                <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                  {n.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => fermerNotif(n.id)}
              aria-label="Fermer la notification"
              className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
