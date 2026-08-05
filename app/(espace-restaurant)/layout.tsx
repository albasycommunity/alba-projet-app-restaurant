import { AppShell } from '@/components/app-shell'
import { OnboardingDecouverte } from '@/components/onboarding/onboarding-client'

/**
 * Espace back-office du restaurant : toute la gestion quotidienne
 * (pilotage, caisse, cuisine, stock, hygiène, équipe, clients, abonnement).
 * L'accès est verrouillé par proxy.ts pour les RESTAURANT_ADMIN.
 *
 * L'onboarding découverte est monté ici (toujours vivant) : il capte le
 * moment où la 5ᵉ étape tombe, où que soit le gérant. Il ne rend rien
 * pour un restaurant masqué (fail-closed) ou un compte STAFF.
 */
export default function EspaceRestaurantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppShell>
      <OnboardingDecouverte />
      {children}
    </AppShell>
  )
}
