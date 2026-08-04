import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { exigerRole } from '@/lib/server/auth'
import {
  absencesDe,
  dernierPointageDuJour,
  ficheRhDe,
  pointagesRecents,
} from '@/lib/server/rh'
import { logger } from '@/lib/server/logger'

/**
 * Espace personnel « Mon compte » — STAFF et RESTAURANT_ADMIN, sans
 * aucune permission métier requise. Retourne la fiche RH de l'utilisateur
 * de session, ses pointages récents, son dernier pointage du jour (qui
 * dérive le prochain geste de pointage côté client) et ses absences.
 *
 * Une fiche absente (compte créé avant la migration RH) n'est pas une
 * erreur : `fiche: null` est renvoyé et l'interface affiche « fiche non
 * renseignée » — jamais de 500.
 */
export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.STAFF, Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const utilisateurId = garde.utilisateur.id

  try {
    const [fiche, pointages, absences, dernierPointage] = await Promise.all([
      ficheRhDe(utilisateurId),
      pointagesRecents(utilisateurId, 30),
      absencesDe(utilisateurId),
      dernierPointageDuJour(utilisateurId),
    ])
    return NextResponse.json({
      fiche,
      pointages,
      absences,
      dernierPointage,
      monCompte: true,
    })
  } catch {
    logger('rh', 'erreur', 'Échec lecture mon compte', { utilisateurId })
    return NextResponse.json(
      { erreur: 'Impossible de charger ton espace personnel.' },
      { status: 500 },
    )
  }
}