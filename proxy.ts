/**
 * Proxy (Next.js 16, ex-middleware) : barrière d'accès par rôle ET par
 * permission, re-vérifiés depuis le store à chaque requête (aucune
 * confiance accordée au cookie seul).
 *
 * Runtime : NODE.js (pas Edge) — il importe déjà `lib/server/bdd` et
 * `lib/server/auth` qui lisent le fichier de données à chaque appel,
 * donc une vérification stricte est possible ici. Les routes API
 * re-vérifient quand même de leur côté : le proxy n'est jamais le seul
 * rempart.
 *
 * - SUPER_ADMIN      → /super-admin
 * - RESTAURANT_ADMIN → /back-office, /pilotage, /caisse, /cuisine, /stock,
 *                      /hygiene, /equipe, /clients — uniquement si son
 *                      abonnement est actif, sinon /abonnement/renouveler
 * - STAFF            → uniquement les zones couvertes par ses permissions
 *                      (fraîches depuis le store), jamais /back-office ni
 *                      /abonnement. Sans permission → /acces-refuse.
 * - CLIENT           → accueil client (/) — pas de zone réservée
 */

import { NextResponse, type NextRequest } from 'next/server'
import { NOM_COOKIE_SESSION, PAGE_ACCES_REFUSE, Role, zonesStaff } from '@/lib/auth'
import {
  optionsCookie,
  verifierSession,
} from '@/lib/server/auth'
import { trouverUtilisateur, verifierAccesRestaurant } from '@/lib/server/bdd'

/** Zones réservées au back-office du restaurant : abonnement obligatoire. */
const ZONES_BACK_OFFICE = [
  '/back-office',
  '/pilotage',
  '/caisse',
  '/cuisine',
  '/stock',
  '/hygiene',
  '/equipe',
  '/clients',
]

/** Zones où la simple appartenance au rôle suffit (gestion de l'abonnement). */
const ZONES_ABONNEMENT = ['/abonnement']

const ZONES_SUPER_ADMIN = ['/super-admin']

/** Page « accès refusé » : jamais de redirection vers elle-même. */
const ZONE_ACCES_REFUSE = [PAGE_ACCES_REFUSE]

const PAGES_AUTH = ['/login', '/register']

function estDans(pathname: string, zones: string[]) {
  return zones.some(
    (z) => pathname === z || pathname.startsWith(`${z}/`),
  )
}

function rediriger(
  request: NextRequest,
  destination: string,
  avecSuivant = false,
) {
  // Garde anti-boucle : on ne se redirige jamais vers la page où l'on est
  // déjà — sinon deux routes qui se renvoient la balle bouclent à l'infini
  // (ex. /login → /login pour un compte invalide).
  if (request.nextUrl.pathname === destination) {
    return NextResponse.next()
  }
  const url = new URL(destination, request.url)
  if (avecSuivant) {
    url.searchParams.set('suivant', request.nextUrl.pathname)
  }
  return NextResponse.redirect(url)
}

/**
 * Compte inexistant ou désactivé : la session est DÉTRUITE (cookie expiré)
 * avant la redirection. Sans cela, le cookie fantôme reste valide à chaque
 * requête et le proxy re-redirige indéfiniment vers /login.
 */
function fermerSessionEtRediriger(request: NextRequest, destination: string) {
  const reponse = rediriger(request, destination)
  reponse.cookies.set(NOM_COOKIE_SESSION, '', {
    ...optionsCookie(),
    maxAge: 0,
  })
  return reponse
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const zoneBackOffice = estDans(pathname, ZONES_BACK_OFFICE)
  const zoneAbonnement = estDans(pathname, ZONES_ABONNEMENT)
  const zoneSuperAdmin = estDans(pathname, ZONES_SUPER_ADMIN)
  const zoneAccesRefuse = estDans(pathname, ZONE_ACCES_REFUSE)
  const pageAuth = estDans(pathname, PAGES_AUTH)

  const token = request.cookies.get('alba_session')?.value
  const session = token ? await verifierSession(token) : null

  /* ----------------------- non connecté ----------------------- */
  if (!session) {
    if (
      zoneBackOffice ||
      zoneAbonnement ||
      zoneSuperAdmin ||
      zoneAccesRefuse
    ) {
      return rediriger(request, '/login', true)
    }
    return NextResponse.next()
  }

  const compteActif = await verifierAccesRestaurant(
    session.restaurantId,
    session.uid,
  )

  /* ------------------------- SUPER_ADMIN ------------------------ */
  if (session.role === Role.SUPER_ADMIN) {
    if (!compteActif.compteActif) {
      return fermerSessionEtRediriger(request, '/login')
    }
    if (zoneSuperAdmin) return NextResponse.next()
    if (pageAuth) return rediriger(request, '/super-admin')
    return NextResponse.next()
  }

  /* ---------------------- RESTAURANT_ADMIN ---------------------- */
  if (session.role === Role.RESTAURANT_ADMIN) {
    if (!compteActif.compteActif) {
      return fermerSessionEtRediriger(request, '/login')
    }
    if (zoneSuperAdmin) return rediriger(request, '/back-office')
    if (zoneAbonnement) return NextResponse.next()
    if (zoneBackOffice) {
      if (!compteActif.abonnementActif) {
        return rediriger(request, '/abonnement/renouveler')
      }
      return NextResponse.next()
    }
    if (pageAuth) return rediriger(request, '/back-office')
    return NextResponse.next()
  }

  /* --------------------------- STAFF --------------------------- */
  if (session.role === Role.STAFF) {
    // Vérification FRAÎCHE depuis le store : si la gérante retire une
    // permission (ou désactive le compte) pendant qu'il est connecté,
    // l'accès change à la requête suivante — pas à la reconnexion.
    const utilisateur = await trouverUtilisateur(session.uid)
    if (!utilisateur || !utilisateur.actif) {
      return fermerSessionEtRediriger(request, '/login')
    }
    const zonesAutorisees = zonesStaff(utilisateur.permissions ?? [])
    const premiereZone = zonesAutorisees[0]

    if (zoneAccesRefuse) return NextResponse.next()

    // Zone réellement autorisée → laisser passer.
    if (zonesAutorisees.some((z) => estDans(pathname, [z]))) {
      return NextResponse.next()
    }

    // Zones de gestion : jamais accessibles à un STAFF, même avec une
    // autre permission. On ramène vers sa première zone autorisée (ou la
    // page d'accès refusé si plus aucune permission).
    if (zoneSuperAdmin || zoneBackOffice || zoneAbonnement) {
      return rediriger(request, premiereZone ?? PAGE_ACCES_REFUSE)
    }
    if (pageAuth) return rediriger(request, premiereZone ?? PAGE_ACCES_REFUSE)
    return NextResponse.next()
  }

  /* --------------------------- CLIENT --------------------------- */
  if (!compteActif.compteActif) {
    return fermerSessionEtRediriger(request, '/login')
  }
  if (zoneBackOffice || zoneAbonnement || zoneSuperAdmin) {
    return rediriger(request, '/login')
  }
  if (pageAuth) return rediriger(request, '/')
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/back-office/:path*',
    '/pilotage/:path*',
    '/caisse/:path*',
    '/cuisine/:path*',
    '/stock/:path*',
    '/hygiene/:path*',
    '/equipe/:path*',
    '/clients/:path*',
    '/abonnement/:path*',
    '/super-admin/:path*',
    '/acces-refuse',
    '/login',
    '/register',
  ],
}
