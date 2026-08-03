'use client'

import { useEffect } from 'react'
import { MinusIcon, PlusIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  titre,
  sous,
  action,
}: {
  titre: React.ReactNode
  sous: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {titre}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          {sous}
        </p>
      </div>
      {action}
    </header>
  )
}

/** Gouttière commune à tous les écrans : le contenu ne colle jamais au bord. */
export function Contenu({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('px-4 sm:px-6 lg:px-8', className)}>{children}</div>
  )
}

/**
 * Compteur tactile : deux grosses cibles et une valeur au milieu.
 * Utilisable d'une main, sans clavier, en cuisine.
 */
export function Stepper({
  valeur,
  onChange,
  pas = 1,
  min = 0,
  max = 9999,
  unite,
  libelle,
}: {
  valeur: number
  onChange: (v: number) => void
  pas?: number
  min?: number
  max?: number
  unite?: string
  libelle: string
}) {
  const borner = (v: number) =>
    Math.min(max, Math.max(min, +v.toFixed(2)))
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label={`Diminuer ${libelle}`}
        onClick={() => onChange(borner(valeur - pas))}
        disabled={valeur <= min}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary text-lg font-semibold transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90 disabled:opacity-35"
      >
        <MinusIcon className="size-4" />
      </button>
      <span className="flex-1 text-center font-display text-lg font-semibold tnum">
        {valeur}
        {unite && (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {unite}
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label={`Augmenter ${libelle}`}
        onClick={() => onChange(borner(valeur + pas))}
        disabled={valeur >= max}
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-lg font-semibold text-primary transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90 disabled:opacity-35"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  )
}

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_oklch(1_0_0/6%)_inset]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({
  children,
  aside,
}: {
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-sm font-semibold tracking-tight">
        {children}
      </h2>
      {aside}
    </div>
  )
}

const TONS = {
  neutre: 'bg-secondary text-secondary-foreground',
  primaire: 'bg-primary/15 text-primary',
  succes: 'bg-success/15 text-success',
  alerte: 'bg-destructive/15 text-destructive',
  attention: 'bg-warning/15 text-warning',
} as const

export function Badge({
  ton = 'neutre',
  className,
  children,
}: {
  ton?: keyof typeof TONS
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap',
        TONS[ton],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function EmptyState({
  titre,
  texte,
  action,
}: {
  titre: string
  texte: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-base font-semibold">{titre}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
        {texte}
      </p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

/**
 * Panneau modal : feuille remontant du bas sur mobile (pouce accessible),
 * boîte centrée sur grand écran.
 */
export function Sheet({
  ouvert,
  onFermer,
  titre,
  sous,
  children,
  pied,
  large = false,
}: {
  ouvert: boolean
  onFermer: () => void
  titre: string
  sous?: string
  children: React.ReactNode
  pied?: React.ReactNode
  large?: boolean
}) {
  useEffect(() => {
    if (!ouvert) return
    const onTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onTouche)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onTouche)
      document.body.style.overflow = overflow
    }
  }, [ouvert, onFermer])

  if (!ouvert) return null

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onFermer}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className={cn(
          'animate-rise relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-popover shadow-2xl sm:rounded-2xl',
          large ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="font-display text-lg font-semibold tracking-tight">
              {titre}
            </h2>
            {sous && (
              <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                {sous}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="ml-auto flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {children}
        </div>
        {pied && (
          <div className="border-t border-border bg-card/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            {pied}
          </div>
        )}
      </div>
    </div>
  )
}

/** Sélecteur d'onglets tactile — zones larges, un seul geste. */
export function Segments<T extends string>({
  valeur,
  options,
  onChange,
  className,
}: {
  valeur: T
  options: { valeur: T; libelle: string; compte?: number }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex gap-1 overflow-x-auto rounded-xl bg-secondary/60 p-1',
        className,
      )}
    >
      {options.map((o) => {
        const actif = o.valeur === valeur
        return (
          <button
            key={o.valeur}
            type="button"
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(o.valeur)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
              actif
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.libelle}
            {o.compte !== undefined && o.compte > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-semibold tnum',
                  actif
                    ? 'bg-primary/15 text-primary'
                    : 'bg-background/60 text-muted-foreground',
                )}
              >
                {o.compte}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Progress({
  valeur,
  ton = 'primaire',
  className,
}: {
  valeur: number
  ton?: 'primaire' | 'succes' | 'alerte' | 'attention'
  className?: string
}) {
  const couleurs = {
    primaire: 'bg-primary',
    succes: 'bg-success',
    alerte: 'bg-destructive',
    attention: 'bg-warning',
  }
  return (
    <div
      className={cn(
        'h-1.5 overflow-hidden rounded-full bg-secondary',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-1000 ease-[var(--ease-organic)]',
          couleurs[ton],
        )}
        style={{ width: `${Math.min(100, Math.max(0, valeur))}%` }}
      />
    </div>
  )
}

/** Grosse pastille de chiffre clé, lisible d'un coup d'œil. */
export function StatTile({
  libelle,
  valeur,
  detail,
  icone,
  ton = 'neutre',
}: {
  libelle: string
  valeur: React.ReactNode
  detail?: React.ReactNode
  icone?: React.ReactNode
  ton?: 'neutre' | 'primaire' | 'succes' | 'alerte'
}) {
  const bords = {
    neutre: 'border-border',
    primaire: 'border-primary/30',
    succes: 'border-success/30',
    alerte: 'border-destructive/30',
  }
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border bg-card p-3.5',
        bords[ton],
      )}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {icone}
        {libelle}
      </span>
      <span className="font-display text-xl font-semibold tracking-tight tnum">
        {valeur}
      </span>
      {detail && (
        <span className="text-[11px] leading-snug text-muted-foreground">
          {detail}
        </span>
      )}
    </div>
  )
}
