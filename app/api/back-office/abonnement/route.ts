import { NextRequest, NextResponse } from 'next/server'
import { Role, joursRestants, MODES_MOBILE_MONEY } from '@/lib/auth'
import {
  abonnementDeRestaurant,
  lireBdd,
  lireParametresPaiement,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import {
  NABOOPAY_MOCK,
  paiementAutomatiqueDisponible,
} from '@/lib/server/naboopay'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const { utilisateur } = garde
  if (!utilisateur.restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const bdd = await lireBdd()
  const restaurant = bdd.restaurants.find(
    (r) => r.id === utilisateur.restaurantId,
  )
  const abonnement = await abonnementDeRestaurant(utilisateur.restaurantId)

  // Numéros de réception configurés par le super admin — jamais en dur.
  // Le paiement automatique n'est exposé que s'il est réellement prêt.
  const parametres = await lireParametresPaiement()
  const paiement = {
    naboopayActif: paiementAutomatiqueDisponible(parametres),
    naboopayMock: NABOOPAY_MOCK,
    modes: MODES_MOBILE_MONEY.map((mode) => ({
      mode,
      numero: parametres.numerosMobileMoney[mode],
    })),
  }

  if (!abonnement) {
    return NextResponse.json(
      { abonnement: null, restaurant, paiement },
    )
  }

  return NextResponse.json({
    abonnement: {
      id: abonnement.id,
      plan: abonnement.plan,
      statut: abonnement.statut,
      dateDebut: abonnement.dateDebut,
      dateFin: abonnement.dateFin,
      montant: abonnement.montant,
      joursRestants: joursRestants(abonnement.dateFin),
    },
    paiements: bdd.paiements
      .filter((p) => p.abonnementId === abonnement.id)
      .slice(0, 12),
    restaurant,
    paiement,
  })
}
