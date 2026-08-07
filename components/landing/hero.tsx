'use client'

import Link from 'next/link'
import {
  ArrowRightIcon,
  BellRingIcon,
  CheckCircle2Icon,
  FlameIcon,
  LayoutGridIcon,
  PackageSearchIcon,
  ReceiptTextIcon,
  SparklesIcon,
  WifiOffIcon,
  ZapIcon,
} from 'lucide-react'
import { destinationPour } from '@/lib/auth'
import { useAuth } from '@/lib/auth-contexte'

const BARS = [34, 48, 42, 62, 55, 74, 92]

function Barres() {
  return (
    <div className="flex h-24 items-end gap-1.5">
      {BARS.map((h, i) => (
        <span
          key={i}
          className={
            i === BARS.length - 1
              ? 'w-full rounded-t-[3px] bg-gradient-to-t from-primary/70 to-[#f5a174]'
              : 'w-full rounded-t-[3px] bg-foreground/12'
          }
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  )
}

/** Maquette du pilotage — la preuve vivante, construite en pur CSS. */
export function MockupPilotage() {
  return (
    <div className="perspective relative mx-auto mt-14 w-full max-w-4xl sm:mt-16">
      {/* Halo derrière la fenêtre */}
      <div className="bg-radial-ember absolute -inset-x-8 -top-10 bottom-0 -z-10" />

      {/* Carte flottante — encaissement */}
      <div className="animate-float absolute -top-7 -left-3 z-20 hidden sm:block lg:-left-16">
        <div className="shadow-float-sm flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 backdrop-blur-md">
          <span className="flex size-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2Icon className="size-4.5" />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-xs font-semibold">Ticket #254 encaissé</span>
            <span className="text-[11px] text-muted-foreground tnum">
              6 500 F · Wave · il y a 12 s
            </span>
          </div>
        </div>
      </div>

      {/* Carte flottante — stock */}
      <div className="animate-float-slow absolute -bottom-8 -right-3 z-20 hidden sm:block lg:-right-14">
        <div className="shadow-float-sm flex items-center gap-3 rounded-2xl border border-border bg-card/90 px-4 py-3 backdrop-blur-md">
          <span className="flex size-9 items-center justify-center rounded-xl bg-warning/15 text-warning">
            <PackageSearchIcon className="size-4.5" />
          </span>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold">Riz parfumé — sous seuil</span>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-1/4 rounded-full bg-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* La fenêtre */}
      <div className="tilt shadow-float border-ember relative overflow-hidden rounded-3xl">
        {/* Barre de fenêtre */}
        <div className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 hidden rounded-md border border-border bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground sm:block">
            alba — pilotage
          </span>
          <span className="ml-auto flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
            <span className="size-1.5 animate-haleine rounded-full bg-success" />
            synchronisé
          </span>
        </div>

        <div className="relative grid gap-4 bg-gradient-to-b from-card to-background p-4 sm:grid-cols-[110px_1fr] sm:p-5">
          {/* Faux rail latéral */}
          <div className="hidden flex-col gap-1.5 sm:flex">
            {[
              { i: FlameIcon, actif: true },
              { i: ReceiptTextIcon },
              { i: PackageSearchIcon },
            ].map(({ i: I, actif }, idx) => (
              <span
                key={idx}
                className={
                  actif
                    ? 'flex items-center gap-2 rounded-lg bg-primary/15 px-2.5 py-2 text-[11px] font-medium text-primary'
                    : 'flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] text-muted-foreground/60'
                }
              >
                <I className="size-3.5" />
                {['Caisse', 'Cuisine', 'Stock'][idx]}
              </span>
            ))}
          </div>

          {/* Contenu du pilotage */}
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Chiffre d'affaires du jour
                </span>
                <span className="font-display text-2xl font-semibold tracking-tight tnum sm:text-3xl">
                  1 284 500 <span className="text-base text-muted-foreground">F</span>
                </span>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-semibold text-success tnum">
                <ZapIcon className="size-3" />
                +14 %
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Tickets', v: '148' },
                { l: 'Panier moyen', v: '8 679 F' },
                { l: 'En cuisine', v: '4' },
              ].map((s) => (
                <div
                  key={s.l}
                  className="flex flex-col gap-0.5 rounded-xl border border-border bg-background/50 px-3 py-2"
                >
                  <span className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                    {s.l}
                  </span>
                  <span className="font-display text-sm font-semibold tnum">
                    {s.v}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-background/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Affluence
                </span>
                <span className="text-[10px] text-muted-foreground">
                  pointe à 20 h
                </span>
              </div>
              <Barres />
            </div>
          </div>
        </div>

        {/* Reflet qui glisse sur la vitre */}
        <div className="sheen pointer-events-none absolute inset-0" />
      </div>
    </div>
  )
}

export function Hero() {
  const { utilisateur } = useAuth()
  return (
    <section className="relative overflow-hidden">
      {/* Ambiance de fond : grille + halo + arches filigrane */}
      <div className="bg-grid-fine absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="bg-radial-ember animate-haleine absolute -top-32 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full" />
      <div className="animate-arc absolute top-24 -left-10 hidden h-64 w-40 text-primary/15 lg:block">
        <svg viewBox="0 0 160 256" className="h-full w-full" aria-hidden="true">
          <path
            d="M80 256 V128 C80 64 120 24 160 0 M80 256 V128 C80 64 40 24 0 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pt-16 text-center sm:px-6 sm:pt-24">
        <div className="animate-rise inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          Pensé pour le terrain sénégalais
          <span className="size-1.5 animate-haleine rounded-full bg-primary" />
        </div>

        <h1 className="animate-rise font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl [animation-delay:80ms]">
          L'excellence culinaire,
          <br />
          <span className="text-ember">simplifiée.</span>
        </h1>

        <p className="animate-rise mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base [animation-delay:160ms]">
          Caisse, cuisine, stock, hygiène, équipe et fidélité dans une seule
          app — qui continue de tourner quand le réseau s'arrête. Alba est le
          poste de travail complet du restaurant, pensé pour ne jamais
          interrompre le service.
        </p>

        <div className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row [animation-delay:240ms]">
          {utilisateur ? (
            <Link
              href={destinationPour(utilisateur.role, utilisateur.permissions)}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_oklch(0.65_0.16_38/0.9)] transition-all duration-300 ease-[var(--ease-spring)] hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
            >
              <LayoutGridIcon className="size-4" />
              Ouvrir mon espace
              <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          ) : (
            <>
              <Link
                href="#plans"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_oklch(0.65_0.16_38/0.9)] transition-all duration-300 ease-[var(--ease-spring)] hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
              >
                Commencer gratuitement
                <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="glass flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-medium text-foreground transition-all duration-300 ease-[var(--ease-spring)] hover:border-primary/35 hover:bg-primary/8 sm:w-auto"
              >
                Se connecter
              </Link>
            </>
          )}
        </div>

        <p className="animate-rise mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground [animation-delay:300ms]">
          <WifiOffIcon className="size-3.5 text-primary/70" />
          Offline-first : le service continue, la synchro attend son tour.
        </p>

        <MockupPilotage />
      </div>
    </section>
  )
}

/** Bandeau « équipé pour chaque service » — les postes couverts. */
export function BandeServices() {
  const services = [
    { i: ReceiptTextIcon, l: 'Caisse' },
    { i: FlameIcon, l: 'Cuisine' },
    { i: PackageSearchIcon, l: 'Stock' },
    { i: BellRingIcon, l: 'Réservations' },
    { i: ZapIcon, l: 'Pilotage' },
  ]
  return (
    <section className="relative border-y border-border/60 bg-card/30 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 sm:px-6">
        <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          Un poste de travail par service
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {services.map(({ i: I, l }) => (
            <span
              key={l}
              className="glass flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/85"
            >
              <I className="size-4 text-primary" />
              {l}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
