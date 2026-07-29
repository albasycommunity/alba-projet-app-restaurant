'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RESTAURANT, prochainPalier, type ClientFidele } from '@/lib/data'
import { cn } from '@/lib/utils'

/**
 * Carte de fidélité en relief, façon Apple Wallet : elle s'incline au
 * mouvement du téléphone (gyroscope) ou du curseur, et un reflet balaie
 * la surface. Aucun modèle 3D chargé — juste des transformations CSS,
 * pour rester fluide sur un téléphone milieu de gamme.
 */
export function CarteFidelite({ client }: { client: ClientFidele }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cadre = useRef<HTMLDivElement>(null)
  const palier = prochainPalier(client.points)

  const bornes = useCallback((x: number, y: number) => {
    const limite = 12
    setTilt({
      x: Math.max(-limite, Math.min(limite, x)),
      y: Math.max(-limite, Math.min(limite, y)),
    })
  }, [])

  // Gyroscope : la carte suit l'inclinaison réelle de l'appareil.
  useEffect(() => {
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduit) return
    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return
      bornes((e.gamma ?? 0) / 3, -((e.beta ?? 0) - 40) / 3)
    }
    window.addEventListener('deviceorientation', onOrientation)
    return () => window.removeEventListener('deviceorientation', onOrientation)
  }, [bornes])

  const suivrePointeur = (e: React.PointerEvent) => {
    const zone = cadre.current?.getBoundingClientRect()
    if (!zone) return
    const cx = (e.clientX - zone.left) / zone.width - 0.5
    const cy = (e.clientY - zone.top) / zone.height - 0.5
    bornes(cx * 22, -cy * 22)
  }

  const niveaux = {
    Or: 'from-primary/90 via-accent/80 to-primary/70',
    Argent: 'from-secondary via-elevated to-secondary',
    Bronze: 'from-accent/50 via-primary/35 to-accent/30',
  } as const

  return (
    <div
      ref={cadre}
      onPointerMove={suivrePointeur}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className="w-full select-none"
      style={{ perspective: '900px' }}
    >
      <div
        className={cn(
          'relative aspect-[1.62/1] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br p-5 shadow-2xl transition-transform duration-200 ease-out',
          niveaux[client.niveau],
        )}
        style={{
          transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Reflet qui suit l'inclinaison */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-60 transition-opacity"
          style={{
            background: `radial-gradient(circle at ${50 + tilt.x * 3}% ${50 - tilt.y * 3}%, oklch(1 0 0 / 28%), transparent 55%)`,
          }}
        />

        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-bold tracking-tight text-primary-foreground">
                {RESTAURANT.nom}
              </span>
              <span className="text-[10px] text-primary-foreground/70">
                Carte fidélité · {RESTAURANT.quartier}
              </span>
            </div>
            <span className="rounded-full bg-background/25 px-2.5 py-1 font-display text-[10px] font-bold tracking-widest text-primary-foreground uppercase backdrop-blur-sm">
              {client.niveau}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="font-display text-3xl font-semibold text-primary-foreground tnum">
              {client.points}
              <span className="ml-1.5 text-sm font-medium text-primary-foreground/70">
                points
              </span>
            </span>
            {palier ? (
              <span className="text-[11px] text-primary-foreground/80 tnum">
                {palier.manque} points avant {palier.niveau}
              </span>
            ) : (
              <span className="text-[11px] text-primary-foreground/80">
                Palier maximum — 10 % à vie sur toute la carte
              </span>
            )}
          </div>

          <div className="flex items-end justify-between gap-3">
            <span className="font-display text-sm font-medium tracking-wide text-primary-foreground uppercase">
              {client.nom}
            </span>
            <span className="text-[10px] text-primary-foreground/70 tnum">
              {client.visites} visites
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
