'use client'

import Link from 'next/link'
import {
  ArrowRightIcon,
  ChartPieIcon,
  PackageSearchIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  UsersIcon,
  ShieldCheckIcon,
} from 'lucide-react'

const FONCTIONNALITES = [
  {
    i: ShieldCheckIcon,
    titre: 'Caisse 100% fiable',
    texte:
      "Chaque franc est tracé. Finies les erreurs de calcul, les annulations frauduleuses et les écarts en fin de journée.",
  },
  {
    i: PackageSearchIcon,
    titre: 'Zéro vol en stock',
    texte:
      "Vous savez exactement ce qui entre, ce qui sort, et ce qui devrait rester. L'app signale les pertes avant qu'elles ne s'accumulent.",
  },
  {
    i: TrendingUpIcon,
    titre: 'Marges maîtrisées',
    texte:
      "Suivez la rentabilité de chaque plat. Prenez des décisions basées sur vos vraies marges, pas sur des estimations.",
  },
  {
    i: ReceiptTextIcon,
    titre: 'Service sans erreur',
    texte:
      "Finis les tickets perdus ou illisibles. La cuisine reçoit exactement ce que le client a demandé, instantanément.",
  },
  {
    i: UsersIcon,
    titre: 'Responsabilité',
    texte:
      "Chaque action est signée par un PIN. Vous savez exactement qui a encaissé, qui a annulé, et qui était présent.",
  },
  {
    i: ChartPieIcon,
    titre: 'Vision claire',
    texte:
      "Chiffre d'affaires, panier moyen, affluence : pilotez votre activité de n'importe où, avec des données en temps réel.",
  },
]

export function Fonctionnalites() {
  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="bg-radial-ember absolute top-1/3 -left-40 h-[480px] w-[480px] rounded-full opacity-60" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Reprenez le contrôle
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Arrêtez de naviguer à vue
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Alba transforme votre restaurant en une machine bien huilée où chaque ressource compte, et chaque perte est identifiée.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FONCTIONNALITES.map(({ i: I, titre, texte }, idx) => (
            <div
              key={titre}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset] transition-all duration-500 ease-[var(--ease-organic)] hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_48px_-24px_oklch(0_0_0/0.6),0_0_0_1px_oklch(0.65_0.16_38/25%)_inset]"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="absolute top-0 left-0 h-24 w-24 -translate-x-10 -translate-y-10 rounded-full bg-primary/12 blur-2xl transition-all duration-500 group-hover:translate-x-0 group-hover:translate-y-0" />
              <span className="relative flex size-11 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_8px_20px_-10px_oklch(0.65_0.16_38/0.7)] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:scale-110 group-hover:rotate-3">
                <I className="size-5" />
              </span>
              <h3 className="font-display mt-4 text-base font-semibold tracking-tight">
                {titre}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                {texte}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const ROLES = [
  {
    role: 'Le gérant',
    titre: "Tranquillité d'esprit absolue",
    texte:
      'Gérez tout depuis votre téléphone. Caisse, marges, stock, hygiène : le contrôle de votre affaire dans votre poche.',
    enEvidence: true,
  },
  {
    role: "L'équipe",
    titre: 'Fini le stress en plein rush',
    texte:
      "Chacun sait exactement ce qu'il doit faire. Les commandes passent seules, le service s'accélère sans tension.",
  },
  {
    role: 'Le client',
    titre: 'Une expérience qui fidélise',
    texte:
      "Servi plus vite, sans erreur, et récompensé automatiquement par la Carte de Fidélité à chaque passage.",
  },
]

export function ParRoles() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Gagnant sur toute la ligne
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Tout le monde y gagne
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            L'excellence ne s'arrête pas à la gestion. De la cuisine à la table, l'expérience globale s'améliore et tout le monde en ressort gagnant.
          </p>
        </div>

        <div className="mt-12 grid gap-3 lg:grid-cols-3">
          {ROLES.map((r) => (
            <div
              key={r.role}
              className={
                r.enEvidence
                  ? 'border-ember shadow-float relative flex flex-col gap-3 rounded-2xl p-6 sm:p-7'
                  : 'relative flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-6 sm:p-7'
              }
            >
              {r.enEvidence && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  le cœur du produit
                </span>
              )}
              <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                {r.role}
              </p>
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {r.titre}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                {r.texte}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/register?mode=restaurant"
            className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Commencer
            <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
