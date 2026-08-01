'use client'

import { QuoteIcon, StarIcon } from 'lucide-react'

const TEMOIGNAGES = [
  {
    citation:
      "On a encaissé tout le service du soir sans réseau. Le lendemain matin, tout était synchronisé. Aucun ticket perdu, aucun calcul refait.",
    nom: 'Awa S.',
    role: 'Gérante de restaurant — Dakar',
    teinte: 'from-primary/25 to-primary/5',
  },
  {
    citation:
      "Le stock ne me surprend plus. L'app me dit ce qui va manquer avant que ça manque, et le réappro est déjà chiffré.",
    nom: 'Moussa D.',
    role: 'Responsable de cuisine — Thiès',
    teinte: 'from-success/20 to-success/5',
  },
  {
    citation:
      "La Carte de Fidélité tourne toute seule. Mes clients reviennent, et je n'ai plus un cahier pour compter les points.",
    nom: 'Ndeye C.',
    role: 'Restauratrice — Rufisque',
    teinte: 'from-warning/20 to-warning/5',
  },
]

export function Temoignages() {
  return (
    <section id="temoignages" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="bg-radial-ember absolute -right-40 top-1/4 h-[420px] w-[420px] rounded-full opacity-50" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Témoignages
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            La parole est au terrain
          </h2>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {TEMOIGNAGES.map((t) => (
            <figure
              key={t.nom}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card/70 p-6 shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset] transition-all duration-500 ease-[var(--ease-organic)] hover:-translate-y-1 hover:border-primary/25"
            >
              <QuoteIcon className="size-5 text-primary/50" />
              <blockquote className="text-sm leading-relaxed text-pretty">
                {t.citation}
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                <span
                  className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br font-display text-xs font-bold text-primary-foreground ${t.teinte}`}
                >
                  {t.nom
                    .split(' ')
                    .map((m) => m[0])
                    .join('')}
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">{t.nom}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {t.role}
                  </span>
                </div>
                <span className="ml-auto flex gap-0.5 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className="size-3 fill-current" />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
