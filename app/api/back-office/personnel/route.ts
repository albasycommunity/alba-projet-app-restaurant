import { NextRequest, NextResponse } from 'next/server'
import { hashSync } from 'bcryptjs'
import {
  Role,
  TOUTES_LES_PERMISSIONS,
  type Permission,
} from '@/lib/auth'
import {
  creerPersonnel,
  lireBdd,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Gestion du personnel — réservée au RESTAURANT_ADMIN.
 * Un STAFF ne peut jamais appeler ces routes (403), même directement.
 * Le rôle et les permissions sont toujours déterminés côté serveur :
 * un champ `role` ou `permissions` envoyé par le client est ignoré.
 */

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

  const bdd = await lireBdd()
  const personnel = bdd.utilisateurs
    .filter(
      (u) => u.role === Role.STAFF && u.restaurantId === restaurantId,
    )
    .map((u) => ({
      id: u.id,
      email: u.email,
      nom: u.nom,
      role: u.role,
      restaurantId: u.restaurantId,
      actif: u.actif,
      permissions: u.permissions ?? [],
      creeLe: u.creeLe,
    }))

  return NextResponse.json({ personnel })
}

export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const corps = await req.json().catch(() => null)
  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : ''
  const email = typeof corps?.email === 'string' ? corps.email.trim() : ''
  const motDePasse =
    typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''
  const permissions = validerPermissions(corps?.permissions)

  if (nom.length < 2) {
    return NextResponse.json(
      { erreur: 'Indique le nom complet du membre.' },
      { status: 400 },
    )
  }
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json(
      { erreur: 'Adresse email invalide.' },
      { status: 400 },
    )
  }
  if (motDePasse.length < 8) {
    return NextResponse.json(
      { erreur: 'Le mot de passe doit faire au moins 8 caractères.' },
      { status: 400 },
    )
  }
  if (!permissions) {
    return NextResponse.json(
      { erreur: 'Coche au moins une permission pour ce membre.' },
      { status: 400 },
    )
  }

  // Unicité de l'email TOUS rôles confondus : admin, client ou autre STAFF.
  if (await trouverUtilisateurParEmail(email)) {
    return NextResponse.json(
      { erreur: 'Un compte existe déjà avec cet email.' },
      { status: 409 },
    )
  }

  const creation = await creerPersonnel({
    restaurantId,
    nom,
    email,
    motDePasse,
    permissions,
  })

  // VERROU DE PALIER : la limite de STAFF actifs est refusée à l'écriture
  // (grandfathering : rien n'est désactivé, seules les nouvelles créations
  // sont bloquées). L'UI redirige vers la mise à niveau avec la raison.
  if (!creation.ok && creation.raison === 'limite-staff') {
    return NextResponse.json(
      {
        ok: false,
        erreur:
          'Ton abonnement Starter inclut 1 membre du personnel. Passe au plan Pro pour une équipe illimitée.',
        raison: 'limite-staff',
        planRequis: 'pro',
      },
      { status: 403 },
    )
  }

  return NextResponse.json(
    { ok: true, message: `${nom} a rejoint l'équipe.` },
    { status: 201 },
  )
}
