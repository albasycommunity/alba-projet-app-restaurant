import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import {
  abonnementDeRestaurant,
  decouverteActionsRestantes,
  lireBdd,
  palierDeRestaurant,
} from '@/lib/server/bdd'
import { sessionDepuisRequete } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await sessionDepuisRequete(req)
  if (!session) {
    return NextResponse.json({ utilisateur: null })
  }

  const { utilisateur } = session
  const abonnement =
    utilisateur.role === Role.RESTAURANT_ADMIN && utilisateur.restaurantId
      ? await abonnementDeRestaurant(utilisateur.restaurantId)
      : null

  const restaurant =
    utilisateur.restaurantId
      ? (await lireBdd()).restaurants.find(
          (r) => r.id === utilisateur.restaurantId,
        )
      : null

  return NextResponse.json({
    utilisateur: {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      role: utilisateur.role,
      restaurantId: utilisateur.restaurantId,
      permissions: utilisateur.permissions ?? [],
      restaurantNom: restaurant?.nom ?? null,
    },
    abonnement: abonnement
      ? {
          plan: abonnement.plan,
          statut: abonnement.statut,
          dateFin: abonnement.dateFin,
          montant: abonnement.montant,
          // Palier EFFECTIF (relu du store) : 'pro' en découverte, sinon le
          // palier commercial — il pilote les verrous côté interface.
          palier: await palierDeRestaurant(utilisateur.restaurantId!),
          // Compteur d'actions de découverte — null hors mode découverte.
          decouverteActionsRestantes: await decouverteActionsRestantes(
            utilisateur.restaurantId!,
          ),
        }
      : null,
  })
}
