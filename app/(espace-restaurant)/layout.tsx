import { AppShell } from '@/components/app-shell'

/**
 * Espace back-office du restaurant : toute la gestion quotidienne
 * (pilotage, caisse, cuisine, stock, hygiène, équipe, clients, abonnement).
 * L'accès est verrouillé par proxy.ts pour les RESTAURANT_ADMIN.
 */
export default function EspaceRestaurantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>
}
