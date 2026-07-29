import { cn } from '@/lib/utils'

export function PageHeader({
  titre,
  sous,
  action,
}: {
  titre: string
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
}: {
  titre: string
  texte: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-base font-semibold">{titre}</p>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
        {texte}
      </p>
    </div>
  )
}
