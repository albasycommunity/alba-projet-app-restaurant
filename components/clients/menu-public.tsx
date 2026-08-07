'use client'

import { useMemo } from 'react'
import { UtensilsCrossedIcon } from 'lucide-react'
import { CATEGORIES, RESTAURANT, fcfa } from '@/lib/data'
import { useMenu } from '@/components/menu-store'
import { LogoComplet } from '@/components/landing/logo'

/**
 * Menu client PUBLIC, atteint par le QR / le partage WhatsApp
 * (`/?carte=partage`). Lecture seule : la carte vient du MENU ÉDITABLE
 * du back-office — une différence de prix ou un plat retiré ici aussi.
 * Aucune donnée de restaurant·super-admin n'est exposée.
 */
export function MenuPublic() {
  const { platsActifs } = useMenu()

  const platsParCategorie = useMemo(() => {
    return CATEGORIES.map((c) => ({
      categorie: c,
      plats: platsActifs.filter((p) => !p.rupture && p.categorie === c),
    })).filter((g) => g.plats.length > 0)
  }, [platsActifs])

  const nombreDePlats = platsActifs.filter((p) => !p.rupture).length

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border/60 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4">
          <LogoComplet compact />
          <span className="text-[11px] font-medium text-muted-foreground uppercase">
            click &amp; collect
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-6">
        <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
          {RESTAURANT.quartier}
        </p>
        <h1 className="font-display mt-1 text-2xl font-semibold tracking-tight">
          {RESTAURANT.nom}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {nombreDePlats > 0
            ? `${nombreDePlats} plat${nombreDePlats > 1 ? 's' : ''} disponibles aujourd'hui — commande par WhatsApp.`
            : "La carte s'actualise côté restaurant."}
        </p>

        {platsParCategorie.length === 0 ? (
          <p className="mt-10 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            La carte arrive bientôt.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-8">
            {platsParCategorie.map(({ categorie, plats }) => (
              <section key={categorie}>
                <h2 className="font-display text-sm font-semibold tracking-wide text-primary uppercase">
                  {categorie}
                </h2>
                <ul className="mt-2 flex flex-col divide-y divide-border rounded-xl border border-border bg-card/50">
                  {plats.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-baseline justify-between gap-3 px-4 py-3"
                    >
                      <span className="min-w-0 text-sm font-medium text-pretty">
                        {p.nom}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tnum">
                        {fcfa(p.prix)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <UtensilsCrossedIcon className="size-3.5 text-primary/70" />
          Carte générée par alba — prix à jour côté restaurant.
        </p>
      </main>
    </div>
  )
}