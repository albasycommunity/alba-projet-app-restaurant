'use client'

import Link from 'next/link'
import { ArrowRightIcon, CheckIcon, SparklesIcon } from 'lucide-react'
import { PLANS_ABONNEMENT } from '@/lib/auth'
import { cn } from '@/lib/utils'

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'

const DETAILLES: Record<string, string[]> = {
  mensuel: [
    'Tous les modules : caisse, cuisine, stock, hygiène',
    'Équipe, pointage et planning',
    'Clients et Carte de Fidélité',
    'Pilotage et statistiques',
    'Sans engagement — résiliable à tout moment',
  ],
  annuel: [
    'Tout ce que comprend le plan mensuel',
    '2 mois offerts (300 000 F au lieu de 250 000 F)',
    'Mise en route accompagnée par l’équipe',
    'Support prioritaire',
  ],
}

/** Section tarifs : le plan se choisit ICI, avant toute inscription. */
export function Plans() {
  return (
    <section id="plans" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="bg-radial-ember absolute -left-32 bottom-0 h-[420px] w-[420px] rounded-full opacity-50" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Plans
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            15 jours d'essai gratuit, puis un plan simple
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Chaque plan démarre par un essai gratuit complet. Aucun paiement
            avant la fin de l'essai — et l'accès au back-office est entier dès
            le premier jour.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-3 lg:grid-cols-2">
          {(Object.keys(PLANS_ABONNEMENT) as (keyof typeof PLANS_ABONNEMENT)[]).map(
            (plan) => {
              const offre = PLANS_ABONNEMENT[plan]
              const enEvidence = plan === 'annuel'
              return (
                <div
                  key={plan}
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
                      le plus économique
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                        {offre.libelle}
                      </span>
                      <span className="font-display mt-2 text-4xl font-semibold tracking-tight tnum">
                        {fcfa(offre.montant)}
                        <span className="text-base font-medium text-muted-foreground">
                          {plan === 'mensuel' ? ' / mois' : ' / an'}
                        </span>
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-[11px] font-semibold text-success">
                      <CheckIcon className="size-3" />
                      15 j d'essai gratuit
                    </span>
                  </div>

                  <p className="-mt-2 text-xs text-muted-foreground">
                    {offre.detail}
                  </p>

                  <ul className="flex flex-col gap-2">
                    {DETAILLES[plan].map((l) => (
                      <li key={l} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="text-foreground/85">{l}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/register?plan=${plan}`}
                    className={cn(
                      'group mt-auto flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]',
                      enEvidence
                        ? 'bg-primary text-primary-foreground shadow-[0_14px_32px_-14px_oklch(0.65_0.16_38/0.9)] hover:bg-primary/90'
                        : 'border border-border bg-secondary/50 text-foreground hover:border-primary/35 hover:bg-primary/8',
                    )}
                  >
                    Commencer l'essai gratuit
                    <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )
            },
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Paiement par Wave, Orange Money, Free Money ou espèces — activation
          par notre équipe dès réception. Le compte client reste gratuit.
        </p>
      </div>
    </section>
  )
}
