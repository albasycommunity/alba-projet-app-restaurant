import type { Metadata } from 'next'
import { MonCompteClient } from '@/components/rh/mon-compte-client'

export const metadata: Metadata = {
  title: 'Mon compte — Alba',
  description:
    'Ta fiche RH, tes pointages, tes absences et ton mot de passe — le tout depuis un seul écran, pour chaque membre de l’équipe.',
}

/**
 * Espace personnel : accessible à TOUT STAFF / RESTAURANT_ADMIN
 * authentifié, indépendamment des permissions métier (voir proxy.ts et
 * la route GET /api/rh/mon-compte).
 */
export default function MonComptePage() {
  return <MonCompteClient />
}
