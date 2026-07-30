import type { Metadata } from 'next'
import { AbonnementClient } from '@/components/abonnement/abonnement-client'

export const metadata: Metadata = {
  title: 'Abonnement — Alba',
  description:
    'Plan, usage, moyen de paiement récurrent et historique de facturation.',
}

export default function AbonnementPage() {
  return <AbonnementClient />
}
