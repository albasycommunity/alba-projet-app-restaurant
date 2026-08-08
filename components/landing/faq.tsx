'use client'

import { PlusIcon, ShieldCheckIcon } from 'lucide-react'
import {
  PALIERS_ABONNEMENT,
  PLANS_ABONNEMENT,
  montantPalier,
  type PalierAbonnement,
} from '@/lib/auth'

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'

/**
 * Le prix affiché se relit TOUJOURS depuis la grille de plans
 * (`lib/auth.ts` costs de vérité) — jamais une copie en dur qui peut
 * diverger.
 */
function textePrix() {
  const par = (p: PalierAbonnement) =>
    `${PLANS_ABONNEMENT[p].libelle} ${fcfa(montantPalier(p, 'mensuel'))}/mois`
  const prixAn = (p: PalierAbonnement) => fcfa(montantPalier(p, 'annuel'))
  const lignePaliers = PALIERS_ABONNEMENT.map((p) => par(p)).join(' · ')
  return `Le compte client est gratuit. Le back-office démarre en mode découverte : explore tout, gratuitement, sans engagement ni paiement. Quand tu es prêt, tu choisis ton plan — ${lignePaliers}. À l'annuel, deux mois sont offerts (ex. le plus courant : ${prixAn('pro')}/an au lieu de ${fcfa(montantPalier('pro', 'mensuel') * 12)}). Le paiement se fait par Wave, Orange Money, Free Money ou espèces.`
}

const FAQ: { q: string; r: string | (() => string) }[] = [
  {
    q: "Est-ce qu'un logiciel ne va pas compliquer les choses ?",
    r: "C'est l'inverse : Alba simplifie la gestion. En quelques heures, votre équipe sera plus rapide. Vous n'aurez plus à chercher des tickets perdus ou à recalculer les stocks le soir.",
  },
  {
    q: 'Est-ce que ça marche vraiment sans connexion ?',
    r: "Oui. Alba écrit d'abord en local : encaisser, servir, ajuster le stock — rien de vital ne dépend du réseau. Dès que la connexion revient, tout se synchronise automatiquement. Idéal pour les coupures de courant ou de wifi.",
  },
  {
    q: 'Combien ça coûte ?',
    r: textePrix,
  },
  {
    q: "Mon restaurant est petit, en ai-je vraiment besoin ?",
    r: "Même avec 5 tables, les erreurs de caisse et les pertes de stock coûtent très cher. Alba vous aide à protéger vos marges et à arrêter de perdre de l'argent dès le premier jour.",
  },
  {
    q: "Puis-je essayer avant de m'abonner ?",
    r: `Oui — le back-office est entièrement ouvert en mode découverte, gratuitement et sans carte bancaire. Vous explorez avec vos propres données, et passez au plan payant seulement quand vous voyez les premiers résultats.`,
  },
  {
    q: 'Faut-il acheter du matériel spécial ?',
    r: "Non. Vos serveurs et cuisiniers peuvent utiliser leurs propres smartphones (Android ou iPhone). L'application est pensée pour être utilisée à une main, même en plein rush.",
  },
]

export function FoireAuxQuestions() {
  return (
    <section id="faq" className="relative scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            FAQ
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Les questions qu'on nous pose
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-2.5">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="faq group rounded-2xl border border-border bg-card/60 transition-colors duration-300 open:border-primary/30 open:bg-card"
            >
              <summary className="flex items-center gap-3 px-5 py-4">
                <span className="flex-1 text-sm font-medium sm:text-[15px]">
                  {f.q}
                </span>
                <span className="faq-icone flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground group-hover:text-foreground">
                  <PlusIcon className="size-4" />
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {typeof f.r === 'function' ? f.r() : f.r}
                </p>
              </div>
            </details>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-success" />
          Autre question ? Écris-nous, on répond en moins de 24 h.
        </p>
      </div>
    </section>
  )
}
