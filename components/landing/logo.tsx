import { cn } from '@/lib/utils'

/**
 * Marque alba : une arche double (le A, la porte du restaurant) couronnée
 * du pommeau de la cloche de service. Tout le langage graphique de la
 * vitrine dérive de ces deux formes : archère, liseré, halo.
 */
export function LogoMark({
  className,
  avecHalo = false,
}: {
  className?: string
  avecHalo?: boolean
}) {
  return (
    <span
      className={cn('relative inline-flex shrink-0', className)}
      aria-hidden="true"
    >
      {avecHalo && (
        <span className="bg-radial-ember absolute -inset-3 rounded-full blur-md" />
      )}
      <svg viewBox="0 0 48 48" className="relative size-full">
        <defs>
          <linearGradient id="alba-tuile" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#23262c" />
            <stop offset="100%" stopColor="#0e0f12" />
          </linearGradient>
          <linearGradient id="alba-arch" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f5a174" />
            <stop offset="55%" stopColor="#de6640" />
            <stop offset="100%" stopColor="#a83e1e" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#alba-tuile)" />
        <rect
          x="0.75"
          y="0.75"
          width="46.5"
          height="46.5"
          rx="12.25"
          fill="none"
          stroke="oklch(1 0 0 / 14%)"
        />
        <rect
          x="0.75"
          y="0.75"
          width="46.5"
          height="46.5"
          rx="12.25"
          fill="none"
          stroke="oklch(0.65 0.16 38 / 22%)"
        />
        {/* Arche extérieure — le A, la porte */}
        <path
          d="M9.5 38.5 V25.5 C9.5 17.5 16 10.5 24 10.5 C32 10.5 38.5 17.5 38.5 25.5 V38.5"
          fill="none"
          stroke="url(#alba-arch)"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Arche intérieure — écho plus fin */}
        <path
          d="M17 38.5 V26.5 C17 21.8 20.3 18.5 24 18.5 C27.7 18.5 31 21.8 31 26.5 V38.5"
          fill="none"
          stroke="oklch(0.96 0.005 80 / 38%)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Pommeau de la cloche de service */}
        <circle cx="24" cy="6.8" r="2.6" fill="url(#alba-arch)" />
        <circle
          cx="24"
          cy="6.8"
          r="2.6"
          fill="none"
          stroke="oklch(0.96 0.005 80 / 22%)"
        />
      </svg>
    </span>
  )
}

export function LogoComplet({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <LogoMark className={compact ? 'size-9' : 'size-10'} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-semibold tracking-tight">
          alba
        </span>
        <span className="mt-1 text-[9.5px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
          sans coupure
        </span>
      </div>
    </div>
  )
}

/** Rangée d'arches décoratives — motif mural répété en filigrane. */
export function ArcheMotif({
  className,
  densite = 7,
}: {
  className?: string
  densite?: number
}) {
  return (
    <svg
      className={cn('h-full w-full', className)}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {Array.from({ length: densite }).map((_, i) => (
        <path
          key={i}
          d={`M${(i * 100) / densite} 100 V58 C${(i * 100) / densite} 28, ${(i * 100) / densite + 100 / densite / 2 - 14} 18, ${(i * 100) / densite + 100 / densite / 2} 18 C${(i * 100) / densite + 100 / densite / 2 + 14} 18, ${((i + 1) * 100) / densite} 28, ${((i + 1) * 100) / densite} 58 V100`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
