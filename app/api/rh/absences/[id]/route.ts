import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { statutAbsenceValide, type StatutAbsence } from '@/lib/rh'
import { exigerRole } from '@/lib/server/auth'
import { traiterAbsence } from '@/lib/server/rh'
import { logger } from '@/lib/server/logger'

const STATUTS_TRAITABLES: StatutAbsence[] = ['justifiee', 'refusee']

/**
 * Traitement d'une absence (justifier / refuser) — réservé au
 * RESTAURANT_ADMIN. `traiterAbsence` vérifie que l'absence appartient bien
 * au restaurant de la gérante AVANT toute modification : une absence d'un
 * autre restaurant ne peut pas être touchée, même en devinant son ID.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const { id } = await context.params
  const corps = await req.json().catch(() => null)
  const statut = corps?.statut
  if (typeof statut !== 'string' || !STATUTS_TRAITABLES.includes(statut as StatutAbsence)) {
    return NextResponse.json(
      { erreur: 'Statut de traitement invalide.' },
      { status: 400 },
    )
  }

  try {
    const absence = await traiterAbsence({
      id,
      restaurantId,
      statut: statut as StatutAbsence,
      traiteePar: garde.utilisateur.id,
    })
    if (!absence) {
      return NextResponse.json(
        { erreur: 'Absence introuvable dans votre restaurant.' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, absence })
  } catch {
    logger('rh', 'erreur', 'Échec traitement absence', {
      absenceId: id,
      restaurantId,
    })
    return NextResponse.json(
      { erreur: 'Impossible de traiter cette absence.' },
      { status: 500 },
    )
  }
}