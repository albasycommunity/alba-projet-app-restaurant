'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRightIcon, CheckIcon, SparklesIcon, UsersIcon, Building2Icon } from 'lucide-react'
import {
  PALIERS_ABONNEMENT,
  PLANS_ABONNEMENT,
  type PalierAbonnement,
  type PlanAbonnement,
} from '@/lib/auth'
import { cn } from '@/lib/utils'

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'

const DETAILLES: Record<PalierAbonnement, string[]> = {
  starter: [
    'Caisse, cuisine, équipe et clients',
    'Carte de Fidélité',
    'Support par email',
  ],
  pro: [
    'Tous les modules : + stock, hygiène, pilotage',
    'Équipe illimitée, pointage et planning',
    'Clients et Carte de Fidélité',
    'Support prioritaire',
  ],
  premium: [
    'Tout le plan Pro',
    'Plusieurs établissements (multi-restaurants)',
    'Pilotage consolidé des groupes',
    'Support prioritaire dédié',
  ],
}

const INCLUSIONS_PALIER: Record<PalierAbonnement, string[]> = {
  starter: ['Caisse', 'Cuisine', 'Équipe', 'Clients'],
  pro: ['Caisse', 'Cuisine', 'Équipe', 'Clients', 'Stock', 'Hygiène', 'Pilotage'],
  premium: ['Caisse', 'Cuisine', 'Équipe', 'Clients', 'Stock', 'Hygiène', 'Pilotage'],
}

/**
 * Section tarifs : le plan se choisit ICI, avant toute inscription.
 * Trois paliers, chacun avec sa bascule mensuel/annuel — Pro mis en avant.
 */
export function Plans() {
  const [periodicite, setPeriodicite] = useState<Record<PalierAbonnement, PlanAbonnement>>({
    starter: 'mensuel',
    pro: 'mensuel',
    premium: 'mensuel',
  })

  return (
    <section id="plans" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="bg-radial-ember absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-50" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Plans
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Découvre Alba, puis choisis ton plan
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Chaque restaurant démarre en mode découverte : le back-office est
            entièrement ouvert dès le premier jour, sans paiement. Tu passes
            au plan payant quand tu es prêt — rien d'autre à faire.
          </p>
        </div>

        <div className="mx-auto mt-12 grid gap-4 lg:grid-cols-3">
          {PALIERS_ABONNEMENT.map((palier) => {
            const offre = PLANS_ABONNEMENT[palier]
            const plan = periodicite[palier]
            const montant = offre.periodicites[plan].montant
            const enEvidence = palier === 'pro'
            return (
              <div
                key={palier}
                className={cn(
                  'relative flex flex-col gap-5 rounded-3xl p-6 sm:p-7',
                  enEvidence
                    ? 'border-ember shadow-float'
                    : 'rounded-3xl border border-border bg-card/60',
                )}
              >
                {enEvidence && (
                  <span className="absolute -top-2.5 left-6 flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    <SparklesIcon className="size-3" />
                    le plus populaire
                  </span>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                      {offre.libelle}
                    </span>
                    <span className="font-display mt-2 text-4xl font-semibold tracking-tight tnum">
                      {fcfa(montant)}
                      <span className="text-base font-medium text-muted-foreground">
                        {plan === 'mensuel' ? ' / mois' : ' / an'}
                      </span>
                    </span>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-[11px] font-semibold text-success">
                    <CheckIcon className="size-3" />
                    Paye quand tu veux
                  </span>
                </div>

                <p className="-mt-2 text-xs text-muted-foreground">
                  {offre.detail}
                </p>

                <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
                  {(['mensuel', 'annuel'] as PlanAbonnement[]).map((per) => (
                    <button
                      key={per}
                      type="button"
                      onClick={() =>
                        setPeriodicite((s) => ({ ...s, [palier]: per }))
                      }
                      className={cn(
                        'flex h-9 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all duration-300 ease-[var(--ease-organic)]',
                        plan === per
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {per === 'mensuel' ? 'Mensuel' : 'Annuel'}
                    </button>
                  ))}
                </div>

                {plan === 'annuel' && (
                  <p className="-mt-2 text-[11px] font-medium text-success">
                    2 mois offerts —{' '}
                    {fcfa(
                      offre.periodicites.mensuel.montant * 12 -
                        offre.periodicites.annuel.montant,
                    )}{' '}
                    d'économies
                  </p>
                )}

                <ul className="flex flex-col gap-2">
                  {DETAILLES[palier].map((l) => (
                    <li key={l} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-foreground/85">{l}</span>
                    </li>
                  ))}
                  <li className="flex items-start gap-2 text-sm">
                    {palier === 'premium' ? (
                      <Building2Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                    ) : (
                      <UsersIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    )}
                    <span className="text-foreground/85">
                      {palier === 'starter'
                        ? '1 membre du personnel inclus'
                        : palier === 'pro'
                          ? 'Équipe illimitée'
                          : 'Multi-établissements'}
                    </span>
                  </li>
                </ul>

                <div className="flex flex-wrap gap-1.5">
                  {INCLUSIONS_PALIER[palier].map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/register?mode=restaurant&plan=${plan}&palier=${palier}`}
                  className={cn(
                    'group mt-auto flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]',
                    enEvidence
                      ? 'bg-primary text-primary-foreground shadow-[0_14px_32px_-14px_oklch(0.65_0.16_38/0.9)] hover:bg-primary/90'
                      : 'border border-border bg-secondary/50 text-foreground hover:border-primary/35 hover:bg-primary/8',
                  )}
                >
                  Commencer gratuitement
                  <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Paiement par Wave, Orange Money, Free Money ou espèces — activation
          par notre équipe dès réception. Le compte client reste gratuit.
        </p>
      </div>
    </section>
  )
}
