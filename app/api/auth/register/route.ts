import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { Role, dateIso, destinationPour, nouveauId } from '@/lib/auth'
import {
  creerRestaurantEnDecouverte,
  muterBdd,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'
import { cookieSession, signerSession } from '@/lib/server/auth'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

/** Inscription : 5 comptes / heure par IP — freine le spam de comptes. */
const LIMITE_INSCRIPTION = { fenetreMs: 3_600_000, max: 5 }

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const corps = await req.json().catch(() => null)

  if (!(await requeteAutorisee(req, 'register', LIMITE_INSCRIPTION))) {
    logger('auth', 'warn', 'Trop d’inscriptions')
    return reponseTropDeRequetes(
      'Trop d’inscriptions depuis cette adresse. Réessaie plus tard.',
    )
  }

  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : ''
  const email = typeof corps?.email === 'string' ? corps.email.trim() : ''
  const motDePasse =
    typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''
  const nomRestaurant =
    typeof corps?.nomRestaurant === 'string' ? corps.nomRestaurant.trim() : ''
  const quartier =
    typeof corps?.quartier === 'string' ? corps.quartier.trim() : ''
  // Type de compte explicite : `restaurant` (back-office) ou `client`
  // (Carte de Fidélité). Défaut `client` — comportement historique conservé.
  const typeCompte: 'restaurant' | 'client' =
    corps?.type === 'restaurant' ? 'restaurant' : 'client'
  const suivant =
    typeof corps?.suivant === 'string' && corps.suivant
      ? corps.suivant
      : null

  if (nom.length < 2 || nom.length > 100) {
    return NextResponse.json(
      { erreur: 'Indique ton nom complet (2 à 100 caractères).' },
      { status: 400 },
    )
  }
  if (email.length > 254) {
    return NextResponse.json(
      { erreur: 'Adresse email invalide.' },
      { status: 400 },
    )
  }
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json(
      { erreur: 'Adresse email invalide.' },
      { status: 400 },
    )
  }
  if (motDePasse.length < 8 || motDePasse.length > 128) {
    return NextResponse.json(
      { erreur: 'Le mot de passe doit faire entre 8 et 128 caractères.' },
      { status: 400 },
    )
  }
  if (await trouverUtilisateurParEmail(email)) {
    return NextResponse.json(
      { erreur: 'Un compte existe déjà avec cet email.' },
      { status: 409 },
    )
  }

  // Inscription gérant : le restaurant démarre en MODE DÉCOUVERTE (accès
  // complet, sans paiement ni échéance). La session est créée immédiatement
  // — le gérant arrive directement dans son back-office, sans étape de
  // connexion séparée.
  if (typeCompte === 'restaurant') {
    if (nomRestaurant.length < 2 || nomRestaurant.length > 120) {
      return NextResponse.json(
        { erreur: 'Indique le nom de ton restaurant (2 à 120 caractères).' },
        { status: 400 },
      )
    }
    if (quartier.length > 120) {
      return NextResponse.json(
        { erreur: 'Quartier trop long (120 caractères maximum).' },
        { status: 400 },
      )
    }
    const { admin } = await creerRestaurantEnDecouverte({
      nom: nomRestaurant,
      quartier: quartier || 'Dakar',
      gerant: nom,
      email,
      motDePasse,
    })
    const token = await signerSession({
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      role: admin.role,
      restaurantId: admin.restaurantId,
      permissions: admin.permissions ?? [],
    })
    const reponse = NextResponse.json(
      {
        ok: true,
        compte: 'restaurant',
        destination: destinationPour(
          admin.role,
          admin.permissions ?? [],
          suivant,
        ),
      },
      { status: 201 },
    )
    cookieSession(reponse, token)
    return reponse
  }

  // Inscription client (Carte de Fidélité) — comportement historique.
  const utilisateur = {
    id: nouveauId('u'),
    email: email.toLowerCase(),
    password_hash: hashSync(motDePasse, 10),
    nom,
    role: Role.CLIENT,
    restaurantId: null,
    actif: true,
    permissions: [],
    creeLe: dateIso(new Date()),
  }

  await muterBdd((bdd) => {
    bdd.utilisateurs.push(utilisateur)
    bdd.fidelite.push({
      userId: utilisateur.id,
      points: 0,
      visites: 0,
      panierMoyen: 0,
    })
  })

  return NextResponse.json({ ok: true, compte: 'client' }, { status: 201 })
}
