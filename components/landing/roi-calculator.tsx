'use client'

import { useState } from 'react'
import { CalculatorIcon, TrendingDownIcon, TrendingUpIcon } from 'lucide-react'
import { fcfa } from '@/lib/data'
import { montantPalier } from '@/lib/auth'

export function CalculateurROI() {
  const [couverts, setCouverts] = useState(40)
  const [panier, setPanier] = useState(8000)

  // Hypothèses conservatrices : 26 jours d'ouverture par mois
  const joursParMois = 26
  const caMensuel = couverts * panier * joursParMois

  // Estimation des pertes : 5% du CA (vols, erreurs de caisse, gaspillage stock, tickets oubliés)
  const pertesMensuelles = caMensuel * 0.05

  // Estimation prudente : Alba permet d'éviter au moins 60% de ces pertes
  const economieMensuelle = pertesMensuelles * 0.60
  
  // Pour le visuel, on recommande 'pro' si CA > 5M
  const abonnementRecommande = caMensuel > 5000000 ? 'pro' : 'starter'
  const prixRecommande = montantPalier(abonnementRecommande, 'mensuel')

  return (
    <section id="calculateur-roi" className="relative py-20 sm:py-24 bg-card/30">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Simulateur de rentabilité
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Combien perdez-vous chaque mois ?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Les erreurs de caisse et les fuites de stock coûtent en moyenne 5% du chiffre d'affaires d'un restaurant. Calculez ce qu'Alba peut vous faire économiser.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
          {/* Controles */}
          <div className="flex flex-col gap-8 rounded-2xl border border-border bg-card/60 p-6 sm:p-8 shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label htmlFor="couverts" className="text-sm font-semibold">
                  Couverts par jour
                </label>
                <span className="font-display text-lg font-bold text-primary tnum">
                  {couverts}
                </span>
              </div>
              <input
                id="couverts"
                type="range"
                min="10"
                max="300"
                step="5"
                value={couverts}
                onChange={(e) => setCouverts(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Petit café (10)</span>
                <span>Gros porteur (300)</span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label htmlFor="panier" className="text-sm font-semibold">
                  Panier moyen estimé
                </label>
                <span className="font-display text-lg font-bold text-primary tnum">
                  {fcfa(panier)}
                </span>
              </div>
              <input
                id="panier"
                type="range"
                min="1500"
                max="25000"
                step="500"
                value={panier}
                onChange={(e) => setPanier(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Restauration rapide</span>
                <span>Restaurant gastronomique</span>
              </div>
            </div>
          </div>

          {/* Resultats */}
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/50 p-4">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">CA Mensuel (26j)</span>
                <span className="font-display text-xl font-semibold tnum">{fcfa(caMensuel)}</span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-destructive uppercase tracking-wide">
                  <TrendingDownIcon className="size-3.5" />
                  Pertes estimées
                </span>
                <span className="font-display text-xl font-semibold text-destructive tnum">{fcfa(pertesMensuelles)}</span>
              </div>
            </div>

            <div className="relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl border border-success/30 bg-success/10 p-6 text-center sm:p-8 shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset]">
              <div className="bg-radial-success absolute inset-0 opacity-20" />
              <CalculatorIcon className="relative size-8 text-success mb-2" />
              <span className="relative text-[11px] font-bold tracking-[0.15em] text-success uppercase">
                Économie avec Alba
              </span>
              <span className="relative font-display text-4xl font-bold tracking-tight text-success tnum sm:text-5xl">
                {fcfa(economieMensuelle)}
              </span>
              <p className="relative mt-2 text-sm text-success/80 text-balance">
                par mois, en stoppant les vols et les erreurs de caisse.
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground text-pretty">
              L'abonnement recommandé pour votre volume est de <strong className="text-foreground">{fcfa(prixRecommande)}/mois</strong>. Alba s'autofinance dès la première semaine.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
