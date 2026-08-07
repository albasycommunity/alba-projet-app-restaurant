'use client'

import { MinusIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { CANAUX, TABLES, fcfa, type CanalCommande } from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { cn } from '@/lib/utils'

const CANAL_ORDRE: CanalCommande[] = ['salle', 'comptoir', 'ligne', 'livraison']

/** Contenu du ticket en cours : destination, lignes, total. */
export function Ticket({ compact = false }: { compact?: boolean }) {
  const { etat, envoyer, total } = useAlba()
  const { panier, destination } = etat

  return (
    <div className="flex flex-col gap-4">
      {/* Où va ce ticket — une seule question à la fois */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Ce ticket part où ?
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {CANAL_ORDRE.map((canal) => {
            const actif = destination.canal === canal
            return (
              <button
                key={canal}
                type="button"
                onClick={() =>
                  envoyer({ type: 'destination', valeur: { canal } })
                }
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)] active:scale-[0.97]',
                  actif
                    ? 'border-primary/60 bg-primary/12 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {CANAUX[canal].court}
              </button>
            )
          })}
        </div>

        {destination.canal === 'salle' && (
          <div className="flex flex-wrap gap-1.5">
            {TABLES.map((t) => {
              const actif = destination.table === t
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    envoyer({
                      type: 'destination',
                      valeur: { canal: 'salle', table: actif ? undefined : t },
                    })
                  }
                  className={cn(
                    'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
                    actif
                      ? 'border-primary/60 bg-primary/12 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t.replace('Table ', 'T')}
                </button>
              )
            })}
          </div>
        )}

        {(destination.canal === 'livraison' || destination.canal === 'ligne') && (
          <input
            value={destination.client ?? ''}
            onChange={(e) =>
              envoyer({
                type: 'destination',
                valeur: { canal: destination.canal, client: e.target.value },
              })
            }
            placeholder="Nom du client (optionnel)"
            className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
        )}
      </div>

      {/* Lignes du ticket */}
      {panier.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm leading-relaxed text-muted-foreground text-pretty">
          Rien à encaisser pour l’instant — la journée commence bien. Appuie sur
          un plat pour démarrer un ticket.
        </p>
      ) : (
        <ul className={cn('flex flex-col gap-1.5', compact && 'max-h-none')}>
          {panier.map((ligne) => (
            <li
              key={ligne.platId}
              className="animate-pop flex items-center gap-2 rounded-lg border border-border bg-card p-2"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{ligne.nom}</span>
                <span className="text-[11px] text-muted-foreground tnum">
                  {fcfa(ligne.prix)} × {ligne.qte} ={' '}
                  {fcfa(ligne.prix * ligne.qte)}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    envoyer({ type: 'retirer', platId: ligne.platId })
                    vibrer(8)
                  }}
                  aria-label={`Retirer un ${ligne.nom}`}
                  className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90"
                >
                  <MinusIcon className="size-4" />
                </button>
                <span className="w-6 text-center font-display text-sm font-semibold tnum">
                  {ligne.qte}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    envoyer({
                      type: 'ajouter',
                      platId: ligne.platId,
                      plat: {
                        id: ligne.platId,
                        nom: ligne.nom,
                        prix: ligne.prix,
                      },
                    })
                    vibrer(8)
                  }}
                  aria-label={`Ajouter un ${ligne.nom}`}
                  className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90"
                >
                  <PlusIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => envoyer({ type: 'supprimer', platId: ligne.platId })}
                  aria-label={`Enlever ${ligne.nom} du ticket`}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive"
                >
                  <Trash2Icon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {panier.length > 0 && (
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">
            {panier.reduce((n, l) => n + l.qte, 0)} article
            {panier.reduce((n, l) => n + l.qte, 0) > 1 ? 's' : ''}
          </span>
          <span className="font-display text-2xl font-semibold tracking-tight tnum">
            {fcfa(total)}
          </span>
        </div>
      )}
    </div>
  )
}
