/**
 * Proxy (Next.js 16, ex-middleware) : barrière d'accès par rôle.
 *
 * S'exécute en runtime Node.js : il re-vérifie l'utilisateur ET l'abonnement
 * depuis le store à chaque requête (aucune confiance accordée au cookie seul).
 *
 * - SUPER_ADMIN      → /super-admin
 * - RESTAURANT_ADMIN → /back-office, /pilotage, /caisse, /cuisine, /stock,
 *                      /hygiene, /equipe, /clients — uniquement si son
 *                      abonnement est actif, sinon /abonnement/renouveler
 * - CLIENT           → accueil client (/) — pas de zone réservée
 */

import { NextResponse, type NextRequest } from 'next/server'
import { Role } from '@/lib/auth'
import { verifierSession } from '@/lib/server/auth'
import { verifierAccesRestaurant } from '@/lib/server/bdd'

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
  const url = new URL(destination, request.url)
  if (avecSuivant) {
    url.searchParams.set('suivant', request.nextUrl.pathname)
  }
  return NextResponse.redirect(url)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const zoneBackOffice = estDans(pathname, ZONES_BACK_OFFICE)
  const zoneAbonnement = estDans(pathname, ZONES_ABONNEMENT)
  const zoneSuperAdmin = estDans(pathname, ZONES_SUPER_ADMIN)
  const pageAuth = estDans(pathname, PAGES_AUTH)

  const token = request.cookies.get('alba_session')?.value
  const session = token ? await verifierSession(token) : null

  /* ----------------------- non connecté ----------------------- */
  if (!session) {
    if (zoneBackOffice || zoneAbonnement || zoneSuperAdmin) {
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
    if (zoneSuperAdmin) return NextResponse.next()
    if (pageAuth) return rediriger(request, '/super-admin')
    return NextResponse.next()
  }

  /* ---------------------- RESTAURANT_ADMIN ---------------------- */
  if (session.role === Role.RESTAURANT_ADMIN) {
    if (!compteActif.compteActif) {
      return rediriger(request, '/login')
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

  /* --------------------------- CLIENT --------------------------- */
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
    '/login',
    '/register',
  ],
}
