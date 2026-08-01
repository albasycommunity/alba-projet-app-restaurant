'use client'

import Link from 'next/link'
import {
  ArrowRightIcon,
  CalendarCheck2Icon,
  ChartPieIcon,
  PackageSearchIcon,
  ReceiptTextIcon,
  TrendingUpIcon,
  UsersIcon,
} from 'lucide-react'

const FONCTIONNALITES = [
  {
    i: ReceiptTextIcon,
    titre: 'Commandes',
    texte:
      'De la salle à la cuisine en une seconde. Chaque ticket circule, rien ne se perd, même en plein rush.',
  },
  {
    i: PackageSearchIcon,
    titre: 'Stocks',
    texte:
      "Seuils d'alerte, DLC et réappro suggéré. L'app signale ce qui manque avant que ça manque.",
  },
  {
    i: ChartPieIcon,
    titre: 'Dashboard',
    texte:
      "Chiffre d'affaires, panier moyen, objectif du jour : le pilotage en temps réel, sans tableur.",
  },
  {
    i: CalendarCheck2Icon,
    titre: 'Réservations',
    texte:
      "Plan de salle, créneaux et file d'attente. Plus de double réservation, plus de tables perdues.",
  },
  {
    i: UsersIcon,
    titre: 'Équipe',
    texte:
      'Pointage, planning et formation par poste. Chacun sait quoi faire et qui tient la caisse.',
  },
  {
    i: TrendingUpIcon,
    titre: 'Statistiques',
    texte:
      "Food cost, marges, affluence, performance : les décisions reposent sur des chiffres, pas sur l'instinct.",
  },
]

export function Fonctionnalites() {
  return (
    <section id="fonctionnalites" className="relative scroll-mt-24 py-20 sm:py-28">
      <div className="bg-radial-ember absolute top-1/3 -left-40 h-[480px] w-[480px] rounded-full opacity-60" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Fonctionnalités
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Tout le restaurant dans une seule app
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Pas de puzzle d'outils à faire tenir ensemble. Alba couvre chaque
            poste du service, avec des données qui circulent toutes seules.
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
    role: 'Le client',
    titre: 'Commande et fidélité',
    texte:
      'Commande en ligne, retrait ou livraison, et une Carte de Fidélité qui engrange des points à chaque passage.',
  },
  {
    role: 'Le gérant',
    titre: 'Le restaurant dans une main',
    texte:
      'Caisse, cuisine, stock, hygiène, équipe, pilotage : le back-office complet, même sans connexion.',
    enEvidence: true,
  },
  {
    role: 'Le super admin',
    titre: 'Vue sur le parc',
    texte:
      "Multi-établissements, abonnements et revenus : chaque restaurant de la plateforme au même endroit.",
  },
]

export function ParRoles() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Un compte par métier
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Une plateforme, trois expériences
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Chaque profil voit exactement ce dont il a besoin — ni plus, ni
            moins. Les permissions sont verrouillées au serveur.
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
            href="#plans"
            className="group inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Commencer gratuitement
            <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
