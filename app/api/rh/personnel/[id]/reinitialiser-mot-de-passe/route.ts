import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { exigerRole } from '@/lib/server/auth'
import { reinitialiserMotDePasse, trouverUtilisateur } from '@/lib/server/bdd'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

/** Réinitialisation : 5 gestes / heure / gérante — limite les abus. */
const LIMITE_REINITIALISATION = { fenetreMs: 3_600_000, max: 5 }

/**
 * Réinitialisation du mot de passe d'un employé — réservée au
 * RESTAURANT_ADMIN. La cible doit appartenir au restaurant de la gérante
 * (anti-IDOR). Le mot de passe TEMPORAIRE généré est renvoyé UNE SEULE
 * FOIS à la gérante, jamais loggé, jamais ré-affiché par une autre route.
 */
export async function POST(
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

  if (
    !(await requeteAutorisee(
      req,
      `rh-reinitialisation:${garde.utilisateur.id}`,
      LIMITE_REINITIALISATION,
    ))
  ) {
    logger('rh', 'warn', 'Trop de réinitialisations de mot de passe', {
      restaurantId,
    })
    return reponseTropDeRequetes(
      'Trop de réinitialisations. Réessaie dans une heure.',
    )
  }

  const { id } = await context.params
  const cible = await trouverUtilisateur(id)
  if (!cible || cible.role !== Role.STAFF) {
    return NextResponse.json({ erreur: 'Membre introuvable.' }, { status: 404 })
  }
  // Anti-IDOR : on ne réinitialise jamais le mot de passe d'un employé d'un
  // autre restaurant.
  if (cible.restaurantId !== restaurantId) {
    return NextResponse.json(
      { erreur: 'Ce membre ne fait pas partie de ton restaurant.' },
      { status: 403 },
    )
  }

  try {
    const genere = await reinitialiserMotDePasse(cible)
    // Le mot de passe n'est JAMAIS loggé — il n'est montré que cette fois.
    logger('rh', 'info', 'Mot de passe réinitialisé', {
      cibleId: cible.id,
      restaurantId,
    })
    return NextResponse.json({ ok: true, motDePasseTemporaire: genere })
  } catch {
    logger('rh', 'erreur', 'Échec réinitialisation de mot de passe', {
      cibleId: cible.id,
      restaurantId,
    })
    return NextResponse.json(
      { erreur: 'Impossible de réinitialiser ce mot de passe.' },
      { status: 500 },
    )
  }
}