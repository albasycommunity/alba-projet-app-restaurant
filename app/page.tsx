'use client'

import { useAuth } from '@/lib/auth-contexte'
import { AccueilClient } from '@/components/clients/accueil-client'
import { Landing } from '@/components/landing/landing'
import { LogoMark } from '@/components/landing/logo'

/**
 * Porte d'entrée de l'app.
 * - Session CLIENT valide → sa carte, sa commande, sa fidélité.
 * - Sinon → la vitrine produit (landing), totalement neutre :
 *   aucun nom de restaurant, de gérant ou donnée d'établissement.
 */
function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background">
      <LogoMark avecHalo className="size-16 animate-haleine" />
      <div className="flex flex-col items-center gap-2">
        <span className="font-display text-xl font-semibold tracking-tight">
          alba
        </span>
        <span className="text-xs tracking-wide text-muted-foreground">
          l'excellence culinaire, simplifiée
        </span>
      </div>
    </div>
  )
}

export default function PageAccueil() {
  const { utilisateur, chargement } = useAuth()

  if (chargement) return <Splash />

  if (utilisateur?.role === 'CLIENT') return <AccueilClient />

  return <Landing />
}
