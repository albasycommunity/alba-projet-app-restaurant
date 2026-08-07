'use client'

import { useMemo } from 'react'
import { ClockIcon, TriangleAlertIcon } from 'lucide-react'
import {
  JOURS,
  PLANNING,
  PLANNING_DEBUT,
  PLANNING_FIN,
  jourCourant,
  type Employe,
} from '@/lib/data'
import { Badge, Card, CardTitle } from '@/components/kit'
import { cn } from '@/lib/utils'

const AMPLITUDE = PLANNING_FIN - PLANNING_DEBUT

/** Position et largeur d'un créneau dans la bande horaire, en pourcentage. */
function bande(debut: number, fin: number) {
  const gauche = ((debut - PLANNING_DEBUT) / AMPLITUDE) * 100
  const largeur = ((fin - debut) / AMPLITUDE) * 100
  return { left: `${gauche}%`, width: `${largeur}%` }
}

/**
 * Planning visuel de la semaine. On lit la couverture d'un coup d'œil :
 * chaque barre est un service, les trous sautent aux yeux.
 */
export function Planning({ equipe }: { equipe: Employe[] }) {
  const aujourdhui = jourCourant()

  /** Heures planifiées par personne sur la semaine. */
  const heures = useMemo(() => {
    const total = new Map<string, number>()
    for (const c of PLANNING) {
      total.set(c.employeId, (total.get(c.employeId) ?? 0) + (c.fin - c.debut))
    }
    return total
  }, [])

  /** Un jour sans personne en salle est un jour à risque. */
  const joursDecouverts = useMemo(
    () => JOURS.filter((j) => PLANNING.every((c) => c.jour !== j)),
    [],
  )

  const graduations = [8, 12, 16, 20]

  return (
    <div className="flex flex-col gap-3">
      {joursDecouverts.length > 0 && (
        <Card className="flex items-center gap-3 border-warning/30 bg-warning/6">
          <TriangleAlertIcon className="size-5 shrink-0 text-warning" />
          <p className="min-w-0 flex-1 text-sm leading-relaxed text-pretty">
            <span className="font-medium">
              {joursDecouverts.join(', ')} sans personne au planning.
            </span>{' '}
            <span className="text-muted-foreground">
              À combler avant que quelqu’un ne s’en aperçoive un dimanche midi.
            </span>
          </p>
        </Card>
      )}

      <Card>
        <CardTitle
          aside={
            <span className="text-[11px] text-muted-foreground tnum">
              {PLANNING_DEBUT}h – {PLANNING_FIN}h
            </span>
          }
        >
          Semaine en cours
        </CardTitle>

        <div className="flex flex-col gap-2">
          {/* Règle horaire */}
          <div className="flex items-center gap-2">
            <span className="w-9 shrink-0" />
            <div className="relative h-4 min-w-0 flex-1">
              {graduations.map((h) => (
                <span
                  key={h}
                  className="absolute -translate-x-1/2 text-[10px] text-muted-foreground tnum"
                  style={{ left: `${((h - PLANNING_DEBUT) / AMPLITUDE) * 100}%` }}
                >
                  {h}h
                </span>
              ))}
            </div>
          </div>

          {JOURS.map((jour, index) => {
            const creneaux = PLANNING.filter((c) => c.jour === jour)
            const actif = jour === aujourdhui
            return (
              <div
                key={jour}
                className="animate-rise flex items-center gap-2"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span
                  className={cn(
                    'w-9 shrink-0 text-xs font-medium',
                    actif ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {jour}
                </span>
                <div
                  className={cn(
                    'relative min-w-0 flex-1 overflow-hidden rounded-lg',
                    actif ? 'bg-primary/8 ring-1 ring-primary/25' : 'bg-secondary/50',
                  )}
                  style={{ height: `${Math.max(1, creneaux.length) * 22 + 8}px` }}
                >
                  {graduations.map((h) => (
                    <span
                      key={h}
                      aria-hidden="true"
                      className="absolute inset-y-0 w-px bg-border"
                      style={{
                        left: `${((h - PLANNING_DEBUT) / AMPLITUDE) * 100}%`,
                      }}
                    />
                  ))}
                  {creneaux.length === 0 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                      personne
                    </span>
                  )}
                  {creneaux.map((c, i) => {
                    const employe = equipe.find((e) => e.id === c.employeId)
                    if (!employe) return null
                    return (
                      <div
                        key={`${c.employeId}-${c.debut}`}
                        data-tooltip={`${employe.nom} — ${c.debut}h à ${c.fin}h`}
                        className="absolute flex items-center overflow-hidden rounded-md border border-primary/30 bg-primary/25 px-1.5 transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.02]"
                        style={{
                          ...bande(c.debut, c.fin),
                          top: `${i * 22 + 4}px`,
                          height: '18px',
                        }}
                      >
                        <span className="truncate text-[10px] font-medium">
                          {employe.nom.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <CardTitle
          aside={
            <span className="text-[11px] text-muted-foreground">
              base légale 40 h
            </span>
          }
        >
          Volume horaire par personne
        </CardTitle>
        <ul className="flex flex-col divide-y divide-border">
          {equipe.map((e) => {
            const h = heures.get(e.id) ?? 0
            return (
              <li key={e.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{e.nom}</span>
                <span className="shrink-0 font-display text-sm font-semibold tnum">
                  {h} h
                </span>
                {h > 44 ? (
                  <Badge ton="alerte">au-delà du plafond</Badge>
                ) : h === 0 ? (
                  <Badge>non planifié</Badge>
                ) : h < 20 ? (
                  <Badge ton="attention">temps partiel</Badge>
                ) : (
                  <Badge ton="succes">équilibré</Badge>
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
