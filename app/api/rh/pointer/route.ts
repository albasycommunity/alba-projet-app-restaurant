import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { typePointageValide, type TypePointage } from '@/lib/rh'
import { exigerRole } from '@/lib/server/auth'
import { enregistrerPointage } from '@/lib/server/rh'
import { logger } from '@/lib/server/logger'

/**
 * Pointage réel — STAFF et RESTAURANT_ADMIN.
 * L'employé pointe pour LUI-MÊME : l'identité vient de la session, jamais
 * du corps de la requête (un `utilisateurId`/`restaurantId` fourni par le
 * client est ignoré). Chaque scan persistence une ligne dans `pointages`.
 */
export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.STAFF, Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const corps = await req.json().catch(() => null)
  const type = corps?.type
  if (typeof type !== 'string' || !typePointageValide(type)) {
    return NextResponse.json({ erreur: 'Type de pointage invalide.' }, { status: 400 })
  }

  const { utilisateur } = garde
  if (!utilisateur.restaurantId) {
    return NextResponse.json(
      { erreur: 'Compte non rattaché à un restaurant.' },
      { status: 403 },
    )
  }

  try {
    const pointage = await enregistrerPointage({
      utilisateurId: utilisateur.id,
      restaurantId: utilisateur.restaurantId,
      type: type as TypePointage,
    })
    return NextResponse.json({ ok: true, pointage })
  } catch {
    logger('rh', 'erreur', 'Échec enregistrement pointage', {
      utilisateurId: utilisateur.id,
    })
    return NextResponse.json(
      { erreur: 'Impossible d\u2019enregistrer le pointage.' },
      { status: 500 },
    )
  }
}