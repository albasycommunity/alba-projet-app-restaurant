import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import {
  dateValide,
  typeAbsenceValide,
  type TypeAbsence,
} from '@/lib/rh'
import { exigerRole } from '@/lib/server/auth'
import { declarerAbsence } from '@/lib/server/rh'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

/** Déclaration d’absence : 10 gestes / jour / employé — suffisant, limite le spam. */
const LIMITE_DECLARATION = { fenetreMs: 86_400_000, max: 10 }

/**
 * Déclaration d'absence en self-service — STAFF et RESTAURANT_ADMIN.
 * Un employé ne déclare JAMAIS pour un autre : `utilisateurId` et
 * `declareePar` viennent de la session, jamais du corps de la requête.
 */
export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.STAFF, Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const { utilisateur } = garde
  if (!utilisateur.restaurantId) {
    return NextResponse.json(
      { erreur: 'Compte non rattaché à un restaurant.' },
      { status: 403 },
    )
  }

  if (
    !(await requeteAutorisee(
      req,
      `rh-absence:${utilisateur.id}`,
      LIMITE_DECLARATION,
    ))
  ) {
    logger('rh', 'warn', 'Trop de déclarations d’absence', {
      utilisateurId: utilisateur.id,
    })
    return reponseTropDeRequetes(
      'Trop de déclarations aujourd’hui. Réessaie demain.',
    )
  }

  const corps = await req.json().catch(() => null)
  const date = corps?.date
  const type = corps?.type
  const motif =
    typeof corps?.motif === 'string' ? corps.motif.trim().slice(0, 300) : ''

  if (!dateValide(date)) {
    return NextResponse.json(
      { erreur: 'Date invalide (format attendu : AAAA-MM-JJ).' },
      { status: 400 },
    )
  }
  if (typeof type !== 'string' || !typeAbsenceValide(type)) {
    return NextResponse.json({ erreur: 'Type d’absence invalide.' }, { status: 400 })
  }
  if (motif.length > 300) {
    return NextResponse.json(
      { erreur: 'Le motif est trop long (300 caractères maximum).' },
      { status: 400 },
    )
  }

  try {
    const absence = await declarerAbsence({
      utilisateurId: utilisateur.id,
      restaurantId: utilisateur.restaurantId,
      declareePar: utilisateur.id,
      date,
      type: type as TypeAbsence,
      motif: motif || undefined,
    })
    return NextResponse.json({ ok: true, absence })
  } catch {
    logger('rh', 'erreur', 'Échec déclaration absence', {
      utilisateurId: utilisateur.id,
    })
    return NextResponse.json(
      { erreur: 'Impossible de déclarer cette absence.' },
      { status: 500 },
    )
  }
}