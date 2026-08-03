import { compareSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { destinationPour, Role } from '@/lib/auth'
import {
  abonnementDeRestaurant,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'
import { cookieSession, signerSession } from '@/lib/server/auth'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

/** Connexion : 10 tentatives / minute par IP — coupe court au bruteforce. */
const LIMITE_LOGIN = { fenetreMs: 60_000, max: 10 }

export async function POST(req: NextRequest) {
  const corps = await req.json().catch(() => null)
  const email = typeof corps?.email === 'string' ? corps.email : ''
  const motDePasse = typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''
  const suivant =
    typeof corps?.suivant === 'string' && corps.suivant
      ? corps.suivant
      : null

  if (!requeteAutorisee(req, `login:${email.toLowerCase()}`, LIMITE_LOGIN)) {
    logger('auth', 'warn', 'Trop de tentatives de connexion', { email })
    return reponseTropDeRequetes(
      'Trop de tentatives. Réessaie dans une minute.',
    )
  }

  if (!email || !motDePasse) {
    return NextResponse.json(
      { erreur: 'Email et mot de passe sont requis.' },
      { status: 400 },
    )
  }

  const utilisateur = await trouverUtilisateurParEmail(email)
  if (!utilisateur || !compareSync(motDePasse, utilisateur.password_hash)) {
    logger('auth', 'warn', 'Connexion refusée', { email })
    return NextResponse.json(
      { erreur: 'Email ou mot de passe incorrect.' },
      { status: 401 },
    )
  }
  if (!utilisateur.actif) {
    logger('auth', 'warn', 'Connexion d’un compte désactivé', { email })
    return NextResponse.json(
      { erreur: 'Ce compte a été désactivé. Contacte l’administration.' },
      { status: 403 },
    )
  }

  const token = await signerSession({
    id: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
    restaurantId: utilisateur.restaurantId,
    permissions: utilisateur.permissions ?? [],
  })

  const reponse = NextResponse.json({
    destination: destinationPour(
      utilisateur.role,
      utilisateur.permissions ?? [],
      suivant,
    ),
    utilisateur: {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      role: utilisateur.role,
      restaurantId: utilisateur.restaurantId,
      permissions: utilisateur.permissions ?? [],
    },
  })
  cookieSession(reponse, token)
  return reponse
}
