import { cn } from '@/lib/utils'

/**
 * Marque alba : logo importé depuis public/logo.png (affiché partout :
 * navigation, footer, login, register, accueil, accès refusé). Le
 * `<span>` wrapper pilote la taille et le halo — les call-sites n'ont
 * pas changé.
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
      <img
        src="/logo.png"
        alt=""
        className="relative size-full object-contain"
      />
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
          excellence culinaire
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
