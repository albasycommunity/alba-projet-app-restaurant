'use client'

import {
  BikeIcon,
  CheckIcon,
  ChevronLeftIcon,
  CloudOffIcon,
  GlobeIcon,
  StoreIcon,
  UtensilsCrossedIcon,
} from 'lucide-react'
import { CANAUX, STATUTS, fcfa, type Commande } from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { minutesEcoulees } from '@/lib/horloge'
import { cn } from '@/lib/utils'

const ICONES = {
  salle: UtensilsCrossedIcon,
  comptoir: StoreIcon,
  ligne: GlobeIcon,
  livraison: BikeIcon,
}

/**
 * Une commande en cuisine. Le bouton principal fait avancer le statut :
 * un seul geste, libellé en clair ("C'est prêt"), sans menu à ouvrir.
 */
export function CarteCommande({
  commande,
  maintenant,
}: {
  commande: Commande
  maintenant: number | null
}) {
  const { envoyer, notifier } = useAlba()
  const ecoulees = minutesEcoulees(commande.recueA, maintenant)
  const statut = STATUTS[commande.statut]
  const Icone = ICONES[commande.canal]

  // Retard = on a dépassé l'estimation alors que le plat n'est pas parti.
  const enRetard =
    ecoulees > commande.estimation &&
    commande.statut !== 'servie' &&
    commande.statut !== 'prete'
  const presse = !enRetard && ecoulees > commande.estimation * 0.7
  const total = commande.lignes.reduce((s, l) => s + l.prix * l.qte, 0)

  const avancer = () => {
    envoyer({ type: 'avancer', id: commande.id })
    vibrer([14, 30])
    const suivant = statut.suivant
    if (suivant === 'prete') {
      notifier({
        ton: 'succes',
        titre: `${commande.ref} est prête`,
        detail: `${commande.table ?? commande.client ?? 'Comptoir'} — à envoyer maintenant.`,
      })
    }
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-card p-3 transition-all duration-300 ease-[var(--ease-organic)]',
        enRetard
          ? 'border-destructive/55 bg-destructive/[0.04]'
          : presse
            ? 'border-warning/50'
            : 'border-border',
      )}
    >
      {/* En-tête : référence, destination, minuteur */}
      <header className="flex items-start gap-2">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-lg',
            enRetard ? 'bg-destructive/15 text-destructive' : 'bg-secondary text-muted-foreground',
          )}
          aria-hidden="true"
        >
          <Icone className="size-4" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            <span className="font-display text-sm font-semibold tnum">
              {commande.ref}
            </span>
            {!commande.synchronise && (
              <CloudOffIcon
                className="size-3 text-warning"
                aria-label="Pas encore synchronisé"
              />
            )}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {commande.table ?? commande.client ?? CANAUX[commande.canal].court}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end">
          <span
            className={cn(
              'font-display text-lg font-semibold tabular-nums',
              enRetard
                ? 'text-destructive'
                : presse
                  ? 'text-warning'
                  : 'text-foreground',
            )}
          >
            {ecoulees}′
          </span>
          <span className="text-[10px] text-muted-foreground tnum">
            /{commande.estimation}′
          </span>
        </div>
      </header>

      {/* Ce qu'il faut cuisiner — la quantité prime visuellement */}
      <ul className="flex flex-col gap-1">
        {commande.lignes.map((l) => (
          <li key={l.platId} className="flex items-baseline gap-2 text-sm">
            <span className="font-display font-semibold text-primary tnum">
              {l.qte}×
            </span>
            <span className="min-w-0 flex-1 truncate">{l.nom}</span>
          </li>
        ))}
      </ul>

      {enRetard && (
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] font-medium text-destructive">
          En retard de {ecoulees - commande.estimation}′ — prévenir la salle
        </p>
      )}

      {/* Actions : reculer discrètement, avancer en grand */}
      <footer className="flex items-center gap-2 border-t border-border pt-2.5">
        {commande.statut !== 'recue' && (
          <button
            type="button"
            onClick={() => envoyer({ type: 'reculer', id: commande.id })}
            aria-label={`Revenir en arrière pour ${commande.ref}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
        )}

        {statut.suivant ? (
          <button
            type="button"
            onClick={avancer}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 font-display text-sm font-semibold text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] hover:brightness-110 active:scale-[0.97]"
          >
            <CheckIcon className="size-4" />
            {statut.action}
          </button>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success/12 px-3 py-2.5 text-sm font-medium text-success">
            <CheckIcon className="size-4" />
            Servie — {fcfa(total)}
          </span>
        )}
      </footer>
    </article>
  )
}
