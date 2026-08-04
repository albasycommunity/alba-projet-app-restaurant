import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { exigerRole } from '@/lib/server/auth'
import { equipeRhComplete } from '@/lib/server/rh'
import { logger } from '@/lib/server/logger'

/**
 * Vue RH agrégée de l'équipe — réservée au RESTAURANT_ADMIN (jamais à un
 * STAFF, même avec la permission Équipe).
 *
 * Anti-IDOR : le `restaurantId` vient EXCLUSIVEMENT de la session de la
 * gérante connectée. La couche `equipeRhComplete` filtre toutes ses
 * requêtes (utilisateurs, fiches, pointages, absences) sur cet identifiant
 * — une gérante du restaurant A ne voit jamais un employé du restaurant B,
 * même en manipulant la requête.
 */
export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  try {
    const vue = await equipeRhComplete(restaurantId)
    return NextResponse.json(vue)
  } catch {
    logger('rh', 'erreur', 'Échec lecture vue équipe RH', { restaurantId })
    return NextResponse.json(
      { erreur: 'Impossible de charger la vue RH de l’équipe.' },
      { status: 500 },
    )
  }
}