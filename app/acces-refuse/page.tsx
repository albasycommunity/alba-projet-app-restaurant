'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { LogOutIcon, ShieldAlertIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-contexte'
import { LogoMark } from '@/components/landing/logo'

/**
 * Page « Accès non autorisé » : destination d'un STAFF sans permission,
 * ou dont une zone est verrouillée par le palier de son restaurant.
 * Le proxy.ts ne redirige jamais depuis cette page (pas de boucle).
 * Un STAFF n'y voit JAMAIS de lien de paiement : c'est la gérante qui
 * décide de la mise à niveau.
 */
function ContenuAccesRefuse() {
  const { deconnecter, utilisateur } = useAuth()
  const params = useSearchParams()
  const raison = params.get('raison')

  const messageModule = utilisateur
    ? `Ton restaurant est abonné à un plan qui n'inclut pas ce module (Stock, Hygiène et Pilotage nécessitent le plan Pro). Contacte ta gérante : c'est elle qui peut faire évoluer l'abonnement.`
    : 'Connecte-toi pour accéder à ton espace.'

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div className="bg-grid-fine absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)]" />
      <div className="bg-radial-ember animate-haleine absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" />

      <div className="animate-rise relative flex w-full max-w-sm flex-col items-center gap-5 text-center">
        <LogoMark className="size-12" />
        <span className="flex size-14 items-center justify-center rounded-2xl bg-warning/15 text-warning">
          <ShieldAlertIcon className="size-7" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Accès non autorisé
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {utilisateur
              ? raison === 'module-verrouille'
                ? messageModule
                : `Ton compte (${utilisateur.nom}) n'a actuellement aucune
                   zone autorisée. Ta gérante doit te donner au moins une
                   permission depuis le back-office.`
              : 'Connecte-toi pour accéder à ton espace.'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={deconnecter}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
          >
            <LogOutIcon className="size-4" />
            Se déconnecter
          </button>
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Revenir à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PageAccesRefuse() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LogoMark className="size-12 animate-haleine" />
        </div>
      }
    >
      <ContenuAccesRefuse />
    </Suspense>
  )
}
