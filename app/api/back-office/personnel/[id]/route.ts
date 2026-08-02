import { NextRequest, NextResponse } from 'next/server'
import { Role, TOUTES_LES_PERMISSIONS, type Permission } from '@/lib/auth'
import {
  modifierPersonnel,
  trouverUtilisateur,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

/** Valide les permissions reçues : liste non vide de valeurs connues. */
function validerPermissions(valeur: unknown): Permission[] | null {
  if (!Array.isArray(valeur) || valeur.length === 0) return null
  const valides = valeur.filter(
    (p): p is Permission =>
      typeof p === 'string' &&
      (TOUTES_LES_PERMISSIONS as string[]).includes(p),
  )
  if (valides.length === 0) return null
  return [...new Set(valides)]
}

/**
 * Modification d'un membre du personnel (permissions, nom, désactivation).
 * Protégé :
 * - route réservée RESTAURANT_ADMIN (un STAFF ne peut pas la modifier) ;
 * - IDOR : le membre ciblé doit appartenir au restaurant de la gérante
 *   connectée — impossible d'agir sur le personnel d'un autre restaurant ;
 * - le rôle ne peut jamais être changé : un STAFF reste STAFF.
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

  const cible = await trouverUtilisateur(id)
  if (!cible || cible.role !== Role.STAFF) {
    return NextResponse.json(
      { erreur: 'Membre introuvable.' },
      { status: 404 },
    )
  }
  // Protection IDOR : le personnel d'un autre restaurant est invisible.
  if (cible.restaurantId !== restaurantId) {
    return NextResponse.json(
      { erreur: 'Ce membre ne fait pas partie de ton restaurant.' },
      { status: 403 },
    )
  }

  const misesAJour: {
    nom?: string
    permissions?: Permission[]
    actif?: boolean
  } = {}

  if (typeof corps?.nom === 'string' && corps.nom.trim().length >= 2) {
    misesAJour.nom = corps.nom.trim()
  }

  if (corps?.permissions !== undefined) {
    const permissions = validerPermissions(corps.permissions)
    if (!permissions) {
      return NextResponse.json(
        { erreur: 'Coche au moins une permission pour ce membre.' },
        { status: 400 },
      )
    }
    misesAJour.permissions = permissions
  }

  if (typeof corps?.actif === 'boolean') {
    misesAJour.actif = corps.actif
  }

  if (Object.keys(misesAJour).length === 0) {
    return NextResponse.json(
      { erreur: 'Rien à modifier.' },
      { status: 400 },
    )
  }

  await modifierPersonnel({ id, ...misesAJour })

  return NextResponse.json({ ok: true })
}
