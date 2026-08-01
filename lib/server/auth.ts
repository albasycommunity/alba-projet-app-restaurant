/**
 * Authentification côté serveur : JWT signé (jose) stocké dans un cookie
 * httpOnly, vérifié dans proxy.ts et revalidé à chaque appel d'API.
 *
 * Le proxy ne fait que vérifier la signature ; chaque route API re-charge
 * l'utilisateur et l'abonnement depuis le store — jamais seulement l'UI.
 */

import 'server-only'
import { jwtVerify, SignJWT } from 'jose'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  NOM_COOKIE_SESSION,
  Role,
  type SessionUtilisateur,
} from '@/lib/auth'
import {
  lireBdd,
  trouverUtilisateur,
  verifierAccesRestaurant,
} from '@/lib/server/bdd'

const SECRET_TEXTE = process.env.JWT_SECRET ?? ''
if (!SECRET_TEXTE) {
  console.warn(
    '[alba] JWT_SECRET absent des variables d’environnement : la session ne fonctionnera pas.',
  )
}
const SECRET = new TextEncoder().encode(SECRET_TEXTE)

/** Durée de vie de la session (24 h) — au-delà, reconnexion. */
export const DUREE_SESSION = 60 * 60 * 24

export type JwtAlba = {
  uid: string
  email: string
  nom: string
  role: Role
  restaurantId: string | null
}

export function sessionPour(utilisateur: SessionUtilisateur): JwtAlba {
  return {
    uid: utilisateur.id,
    email: utilisateur.email,
    nom: utilisateur.nom,
    role: utilisateur.role,
    restaurantId: utilisateur.restaurantId,
  }
}

export async function signerSession(utilisateur: SessionUtilisateur) {
  return new SignJWT(sessionPour(utilisateur))
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DUREE_SESSION}s`)
    .sign(SECRET)
}

export async function verifierSession(token: string): Promise<JwtAlba | null> {
  if (!SECRET_TEXTE) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (
      typeof payload.uid !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return {
      uid: payload.uid,
      email: typeof payload.email === 'string' ? payload.email : '',
      nom: typeof payload.nom === 'string' ? payload.nom : '',
      role: payload.role as Role,
      restaurantId:
        typeof payload.restaurantId === 'string' ? payload.restaurantId : null,
    }
  } catch {
    return null
  }
}

/** En-têtes du cookie de session : httpOnly, jamais exposé au JS client. */
export function optionsCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DUREE_SESSION,
  }
}

export function cookieSession(reponse: NextResponse, token: string) {
  reponse.cookies.set(NOM_COOKIE_SESSION, token, optionsCookie())
  return reponse
}

export function cookieVide(reponse: NextResponse) {
  reponse.cookies.set(NOM_COOKIE_SESSION, '', {
    ...optionsCookie(),
    maxAge: 0,
  })
  return reponse
}

/**
 * Reconstruit la session depuis le cookie en rechargeant l'utilisateur
 * depuis le store : le rôle et l'activité du compte sont toujours frais.
 */
export async function sessionDepuisRequete(req: NextRequest) {
  const token = req.cookies.get(NOM_COOKIE_SESSION)?.value
  if (!token) return null
  const jwt = await verifierSession(token)
  if (!jwt) return null
  const utilisateur = await trouverUtilisateur(jwt.uid)
  if (!utilisateur || !utilisateur.actif) return null
  return {
    utilisateur,
    abonnement: utilisateur.restaurantId
      ? await verifierAccesRestaurant(utilisateur.restaurantId)
      : { compteActif: true, abonnementActif: true },
  }
}

type Garde = {
  ok: true
  utilisateur: NonNullable<Awaited<ReturnType<typeof sessionDepuisRequete>>>['utilisateur']
  abonnement: Awaited<ReturnType<typeof sessionDepuisRequete>> extends null
    ? never
    : NonNullable<
        Awaited<ReturnType<typeof sessionDepuisRequete>>
      >['abonnement']
} | {
  ok: false
  reponse: NextResponse
}

/**
 * Garde commune à toutes les routes API protégées :
 * 1. session valide ?
 * 2. rôle autorisé ?
 * 3. pour un RESTAURANT_ADMIN : compte actif + abonnement actif ?
 *    (revalidé depuis le store, jamais depuis le cookie)
 */
export async function exigerRole(
  req: NextRequest,
  roles: Role[],
  options: { verifierAbonnement?: boolean } = {},
): Promise<Garde> {
  const session = await sessionDepuisRequete(req)
  if (!session) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { erreur: 'Non connecté' },
        { status: 401 },
      ),
    }
  }
  if (!roles.includes(session.utilisateur.role)) {
    return {
      ok: false,
      reponse: NextResponse.json(
        { erreur: 'Accès refusé pour ce rôle' },
        { status: 403 },
      ),
    }
  }
  if (
    options.verifierAbonnement &&
    session.utilisateur.role === Role.RESTAURANT_ADMIN
  ) {
    if (!session.abonnement.compteActif) {
      return {
        ok: false,
        reponse: NextResponse.json(
          { erreur: 'Compte restaurant désactivé' },
          { status: 403 },
        ),
      }
    }
    if (!session.abonnement.abonnementActif) {
      return {
        ok: false,
        reponse: NextResponse.json(
          { erreur: 'Abonnement inactif ou expiré' },
          { status: 403 },
        ),
      }
    }
  }
  return {
    ok: true,
    utilisateur: session.utilisateur,
    abonnement: session.abonnement,
  }
}

export async function lireBddEtVerifierRestaurant(restaurantId: string) {
  const bdd = await lireBdd()
  return {
    bdd,
    abonnement: bdd.abonnements
      .filter((a) => a.restaurantId === restaurantId)
      .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0],
  }
}
