'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ChartPieIcon,
  ClipboardCheckIcon,
  FlameIcon,
  MoonIcon,
  PackageIcon,
  ScanBarcodeIcon,
  SunIcon,
  UsersIcon,
  HeartIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RESTAURANT } from '@/lib/data'
import { SyncPill } from '@/components/sync-pill'

const NAV = [
  { href: '/', label: 'Pilotage', short: 'Pilotage', icon: ChartPieIcon },
  { href: '/caisse', label: 'Caisse', short: 'Caisse', icon: ScanBarcodeIcon },
  { href: '/cuisine', label: 'Cuisine', short: 'Cuisine', icon: FlameIcon },
  { href: '/stock', label: 'Stock', short: 'Stock', icon: PackageIcon },
  { href: '/hygiene', label: 'Hygiène', short: 'Hygiène', icon: ClipboardCheckIcon },
  { href: '/equipe', label: 'Équipe', short: 'Équipe', icon: UsersIcon },
  { href: '/clients', label: 'Clients', short: 'Clients', icon: HeartIcon },
]

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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [clair, setClair] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('light', clair)
  }, [clair])

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Aller au contenu
      </a>

      {/* Rail latéral — desktop */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-card/40 px-3 py-5 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <AlbaMark />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold tracking-tight">
              alba
            </span>
            <span className="text-xs text-muted-foreground">
              {RESTAURANT.nom}
            </span>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex flex-col gap-1">
          {NAV.map((item) => {
            const actif =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
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
                {actif && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary" />
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
              FN
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium">{RESTAURANT.gerante}</span>
              <span className="text-[11px] text-muted-foreground">
                {RESTAURANT.quartier}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* En-tête mobile */}
      <header className="glass sticky top-0 z-40 flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
        <AlbaMark className="size-8 rounded-lg text-base" />
        <div className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold">alba</span>
          <span className="text-[11px] text-muted-foreground">
            {RESTAURANT.nom}
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

      <main id="contenu" className="min-w-0 flex-1 pb-24 lg:pb-0">
        {children}
      </main>

      {/* Barre d'onglets mobile — zones tactiles généreuses, usage à une main */}
      <nav
        aria-label="Navigation principale"
        className="glass fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-border px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {NAV.map((item) => {
          const actif =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg py-2 text-[10px] font-medium transition-colors',
                actif ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon
                className={cn(
                  'size-5 transition-transform duration-300 ease-[var(--ease-spring)]',
                  actif && 'scale-110',
                )}
              />
              <span className="truncate">{item.short}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
