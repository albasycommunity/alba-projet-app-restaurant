'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ChartPieIcon,
  ClipboardCheckIcon,
  CommandIcon,
  FlameIcon,
  HeartIcon,
  LayoutGridIcon,
  LogOutIcon,
  MoonIcon,
  PackageIcon,
  ReceiptTextIcon,
  ScanBarcodeIcon,
  SearchIcon,
  SunIcon,
  UsersIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlba } from '@/lib/store'
import { initialesDe, useAuth } from '@/lib/auth-contexte'
import { SyncPill } from '@/components/sync-pill'
import { Notifs } from '@/components/notifs'
import { Palette } from '@/components/palette'
import { Sheet } from '@/components/kit'

type Entree = {
  href: string
  label: string
  short: string
  icon: typeof ChartPieIcon
  /** clé d'alerte à afficher en pastille */
  alerte?: 'cuisine' | 'stock' | 'haccp'
}

/** Les 4 écrans du service quotidien restent au pouce ; le reste passe dans « Plus ». */
const PRINCIPAL: Entree[] = [
  { href: '/pilotage', label: 'Pilotage', short: 'Pilotage', icon: ChartPieIcon },
  { href: '/caisse', label: 'Caisse', short: 'Caisse', icon: ScanBarcodeIcon },
  { href: '/cuisine', label: 'Cuisine', short: 'Cuisine', icon: FlameIcon, alerte: 'cuisine' },
  { href: '/stock', label: 'Stock', short: 'Stock', icon: PackageIcon, alerte: 'stock' },
]

const SECONDAIRE: Entree[] = [
  { href: '/back-office', label: 'Back-office', short: 'Back-office', icon: LayoutGridIcon },
  { href: '/hygiene', label: 'Hygiène', short: 'Hygiène', icon: ClipboardCheckIcon, alerte: 'haccp' },
  { href: '/equipe', label: 'Équipe', short: 'Équipe', icon: UsersIcon },
  { href: '/clients', label: 'Clients', short: 'Clients', icon: HeartIcon },
  { href: '/abonnement', label: 'Abonnement', short: 'Abonnement', icon: ReceiptTextIcon },
]

export const NAV_COMPLET = [...PRINCIPAL, ...SECONDAIRE]

function AlbaMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground',
        className,
      )}
      aria-hidden="true"
    >
      a
    </span>
  )
}

function estActif(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { indicateurs, etat } = useAlba()
  const { utilisateur, restaurantNom, deconnecter } = useAuth()
  const [clair, setClair] = useState(false)
  const [plus, setPlus] = useState(false)
  const [palette, setPalette] = useState(false)

  // Préférence de luminosité conservée : la terrasse et la cuisine
  // n'ont pas les mêmes besoins.
  useEffect(() => {
    const enregistre = window.localStorage.getItem('alba:clair')
    if (enregistre === '1') setClair(true)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('light', clair)
    window.localStorage.setItem('alba:clair', clair ? '1' : '0')
  }, [clair])

  // Cmd/Ctrl + K : aller n'importe où sans lâcher le clavier
  useEffect(() => {
    const onTouche = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette((v) => !v)
      }
    }
    document.addEventListener('keydown', onTouche)
    return () => document.removeEventListener('keydown', onTouche)
  }, [])

  useEffect(() => {
    setPlus(false)
  }, [pathname])

  const compteurs: Record<string, number> = {
    cuisine: indicateurs.enCuisine,
    stock: indicateurs.alertesStock.length + indicateurs.peremptions.length,
    haccp: indicateurs.haccpRestant,
  }

  const alertesSecondaires = SECONDAIRE.reduce(
    (n, e) => n + (e.alerte ? compteurs[e.alerte] : 0),
    0,
  )

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Aller au contenu
      </a>

      {/* Rail latéral — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-5 border-r border-border bg-card/40 px-3 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <AlbaMark />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight">
              alba
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {restaurantNom ?? 'alba'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <SearchIcon className="size-3.5" />
          Rechercher une action
          <kbd className="ml-auto flex items-center gap-0.5 rounded border border-border px-1 py-0.5 text-[10px]">
            <CommandIcon className="size-2.5" />K
          </kbd>
        </button>

        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {NAV_COMPLET.map((item) => {
            const actif = estActif(pathname, item.href)
            const compte = item.alerte ? compteurs[item.alerte] : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={actif ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
                  actif
                    ? 'bg-primary/12 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
                )}
              >
                <item.icon
                  className={cn(
                    'size-[18px] transition-transform duration-300 ease-[var(--ease-spring)] group-hover:scale-110',
                    actif && 'text-primary',
                  )}
                />
                {item.label}
                {compte > 0 ? (
                  <span
                    className={cn(
                      'ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tnum',
                      item.alerte === 'cuisine'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-destructive/20 text-destructive',
                    )}
                  >
                    {compte}
                  </span>
                ) : (
                  actif && (
                    <span className="ml-auto size-1.5 rounded-full bg-primary" />
                  )
                )}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          <SyncPill />
          <button
            type="button"
            onClick={() => setClair((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
          >
            {clair ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
            {clair ? 'Mode nuit' : 'Mode terrasse'}
          </button>
          <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-2 py-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
              {initialesDe(utilisateur?.nom ?? 'Restaurant')}
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-xs font-medium">
                {utilisateur?.nom ?? 'Restaurant'}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {utilisateur?.email ?? restaurantNom ?? 'alba'}
              </span>
            </div>
            <button
              type="button"
              onClick={deconnecter}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              <LogOutIcon className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* En-tête mobile */}
      <header className="glass sticky top-0 z-40 flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
        <AlbaMark className="size-8 rounded-lg text-base" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-base font-semibold">alba</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {restaurantNom ?? "l'excellence culinaire"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SyncPill compact />
          <button
            type="button"
            onClick={() => setClair((v) => !v)}
            className="flex size-9 items-center justify-center rounded-lg bg-secondary/70 text-muted-foreground"
            aria-label={clair ? 'Activer le mode nuit' : 'Activer le mode terrasse'}
          >
            {clair ? <MoonIcon className="size-4" /> : <SunIcon className="size-4" />}
          </button>
        </div>
      </header>

      <main id="contenu" className="min-w-0 flex-1 pb-28 lg:pb-0">
        {children}
      </main>

      {/* Barre d'onglets mobile — 5 cibles larges, atteignables au pouce */}
      <nav
        aria-label="Navigation principale"
        className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {PRINCIPAL.map((item) => {
          const actif = estActif(pathname, item.href)
          const compte = item.alerte ? compteurs[item.alerte] : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium transition-colors',
                actif ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span className="relative">
                <item.icon
                  className={cn(
                    'size-6 transition-transform duration-300 ease-[var(--ease-spring)]',
                    actif && 'scale-110',
                  )}
                />
                {compte > 0 && (
                  <span
                    className={cn(
                      'absolute -right-2 -top-1.5 min-w-4 rounded-full px-1 text-center text-[9px] font-bold leading-4 tnum',
                      item.alerte === 'cuisine'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-destructive text-destructive-foreground',
                    )}
                  >
                    {compte}
                  </span>
                )}
              </span>
              <span className="truncate">{item.short}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={() => setPlus(true)}
          className="relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <span className="relative">
            <LayoutGridIcon className="size-6" />
            {alertesSecondaires > 0 && (
              <span className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-destructive px-1 text-center text-[9px] font-bold leading-4 text-destructive-foreground tnum">
                {alertesSecondaires}
              </span>
            )}
          </span>
          <span>Plus</span>
        </button>
      </nav>

      {/* Feuille « Plus » — accès aux écrans de fond sans encombrer la barre */}
      <Sheet
        ouvert={plus}
        onFermer={() => setPlus(false)}
        titre="Le reste du restaurant"
        sous="Ce qui ne se gère pas en pleine rush."
      >
        <div className="flex flex-col gap-2">
          {SECONDAIRE.map((item) => {
            const compte = item.alerte ? compteurs[item.alerte] : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
              >
                <item.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{item.label}</span>
                {compte > 0 && (
                  <span className="ml-auto rounded-full bg-destructive/20 px-2 py-0.5 text-[11px] font-semibold text-destructive tnum">
                    {compte} à faire
                  </span>
                )}
              </Link>
            )
          })}
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-secondary/50 p-4">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
              {initialesDe(utilisateur?.nom ?? 'Restaurant')}
            </span>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-sm font-medium">
                {utilisateur?.nom ?? 'Restaurant'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {utilisateur?.email ?? restaurantNom ?? 'alba'}
              </span>
            </div>
            <button
              type="button"
              onClick={deconnecter}
              className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
            >
              <LogOutIcon className="size-3.5" />
              Quitter
            </button>
          </div>
        </div>
      </Sheet>

      <Palette
        ouvert={palette}
        onFermer={() => setPalette(false)}
        onAller={(href) => {
          setPalette(false)
          router.push(href)
        }}
        panier={etat.panier.length}
      />

      <Notifs />
    </div>
  )
}
