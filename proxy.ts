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
import {
  NOM_COOKIE_SESSION,
  PAGE_ACCES_REFUSE,
  Role,
  ZONE_PAR_PERMISSION,
  zonesStaff,
  type Permission,
} from '@/lib/auth'
import {
  optionsCookie,
  verifierSession,
} from '@/lib/server/auth'
import {
  configurerCacheBdd,
  moduleAutoriseRestaurant,
  trouverUtilisateur,
  verifierAccesRestaurant,
} from '@/lib/server/bdd'

/**
 * Le bundle proxy ne fait que LIRE le store : son cache mémoire vit ici,
 * avec une fraîcheur bornée (3 s) — suffisante pour la sécurité des
 * accès, sans lire le disque à chaque requête.
 */
configurerCacheBdd({ ttlMs: 3_000 })

/** Méthodes qui modifient l'état : exposées à la CSRF. */
const METHODES_MUTATIONS = ['POST', 'PUT', 'PATCH', 'DELETE']

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

/**
 * Modules réservés au palier Pro (et Premium) : /stock, /hygiene, /pilotage.
 * Un abonné Starter ou en essai qui tente d'y accéder est re-conduit :
 * - RESTAURANT_ADMIN → page de mise à niveau (il peut acheter) ;
 * - STAFF → page d'accès refusé (jamais de lien de paiement pour un staff).
 */
const ZONES_MODULES_PRO = ['/stock', '/hygiene', '/pilotage']

/** Zones où la simple appartenance au rôle suffit (gestion de l'abonnement). */
const ZONES_ABONNEMENT = ['/abonnement']

/**
 * Espace personnel « Mon compte » : accessible à tout STAFF et
 * RESTAURANT_ADMIN authentifié, indépendamment de ses permissions métier
 * (ce n'est pas une zone métier, c'est un espace personnel — pointage,
 * absences, changement de mot de passe). Réservé à ces deux rôles :
 * SUPER_ADMIN et CLIENT en sont redirigés.
 */
const ZONE_MON_COMPTE = ['/mon-compte']

const ZONES_SUPER_ADMIN = ['/super-admin']

/** Page « accès refusé » : jamais de redirection vers elle-même. */
const ZONE_ACCES_REFUSE = [PAGE_ACCES_REFUSE]

const PAGES_AUTH = ['/login', '/register']

/** Pages accessibles sans session — liste blanche EXPLICITE (refus par défaut). */
const PAGES_PUBLIQUES = ['/login', '/register']

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

/**
 * Module (permission) couvert par le chemin demandé, si le chemin tombe
 * dans l'une des zones métier — sinon undefined.
 */
function moduleDuChemin(pathname: string): Permission | undefined {
  return (
    Object.entries(ZONE_PAR_PERMISSION).find(([, zone]) =>
      estDans(pathname, [zone]),
    )?.[0] as Permission | undefined
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Défense CSRF par couche : les API de mutation sont rejetées dès le
  // proxy si la requête vient d'un site tiers (`Sec-Fetch-Site` annoncé
  // par le navigateur). Un POST cross-site ne peut donc pas porter le
  // cookie httpOnly de session vers une action d'état. Les clients sans
  // en-tête (curl, outils) passent — c'est le navigateur qu'on protège.
  if (pathname.startsWith('/api/') && METHODES_MUTATIONS.includes(request.method)) {
    const site = request.headers.get('sec-fetch-site')
    if (site === 'cross-site') {
      return NextResponse.json(
        { erreur: 'Origine non autorisée.' },
        { status: 403 },
      )
    }
    // Les API gèrent elles-mêmes leur authentification : le proxy n'ajoute
    // rien (pas de redirection d'un appel JSON vers une page de login).
    return NextResponse.next()
  }

  const zoneBackOffice = estDans(pathname, ZONES_BACK_OFFICE)
  const zoneAbonnement = estDans(pathname, ZONES_ABONNEMENT)
  const zoneMonCompte = estDans(pathname, ZONE_MON_COMPTE)
  const zoneSuperAdmin = estDans(pathname, ZONES_SUPER_ADMIN)
  const zoneAccesRefuse = estDans(pathname, ZONE_ACCES_REFUSE)
  const pageAuth = estDans(pathname, PAGES_AUTH)
  const pagePublique =
    pathname === '/' || estDans(pathname, PAGES_PUBLIQUES)

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
    // REFUS PAR DÉFAUT : toute route de page hors liste blanche publique
    // (et hors /api, qui s'autogarde) exige une session. Une page ajoutée
    // au projet plus tard est donc protégée par défaut, sans aucune action.
    if (!pathname.startsWith('/api/') && !pagePublique) {
      return rediriger(request, '/login', true)
    }
    return NextResponse.next()
  }

  // Anti-escalade : le restaurant d'appartenance est rechargé depuis le
  // store, jamais pris au vol dans le JWT (un compte déplacé entre
  // restaurants ne garde pas l'ancien restaurantId en cours de session).
  const utilisateur = await trouverUtilisateur(session.uid)
  const restaurantId = utilisateur?.restaurantId ?? null
  const compteActif = await verifierAccesRestaurant(
    restaurantId,
    session.uid,
  )

  /* ------------------------- SUPER_ADMIN ------------------------ */
  if (session.role === Role.SUPER_ADMIN) {
    if (!compteActif.compteActif) {
      return fermerSessionEtRediriger(request, '/login')
    }
    if (zoneSuperAdmin) return NextResponse.next()
    if (zoneMonCompte) return rediriger(request, '/super-admin')
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
    // Espace personnel : accessible même si l'abonnement est expiré
    // (comme /abonnement) — ce n'est pas une zone métier.
    if (zoneMonCompte) return NextResponse.next()
    if (zoneBackOffice) {
      if (!compteActif.abonnementActif) {
        return rediriger(request, '/abonnement/renouveler')
      }
      // Verrou de palier : les modules Pro sont bloqués pour un Starter.
      const module = moduleDuChemin(pathname)
      if (
        module &&
        estDans(pathname, ZONES_MODULES_PRO) &&
        restaurantId &&
        !(await moduleAutoriseRestaurant(restaurantId, module))
      ) {
        return rediriger(
          request,
          '/abonnement/renouveler?plan=pro&raison=module-verrouille',
        )
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
    if (!utilisateur || !utilisateur.actif) {
      return fermerSessionEtRediriger(request, '/login')
    }
    const zonesAutorisees = zonesStaff(utilisateur.permissions ?? [])
    const premiereZone = zonesAutorisees[0]

    if (zoneAccesRefuse) return NextResponse.next()

    // Espace personnel « Mon compte » : ouvert à tout STAFF authentifié,
    // sans aucune permission métier requise.
    if (zoneMonCompte) return NextResponse.next()

    // Zone réellement autorisée → laisser passer, sauf si le palier du
    // restaurant ne couvre pas le module (ex. permission Stock d'un
    // Starter) : un STAFF ne voit jamais de lien de paiement, il est
    // renvoyé vers la page « Accès refusé ».
    if (zonesAutorisees.some((z) => estDans(pathname, [z]))) {
      const module = moduleDuChemin(pathname)
      if (
        module &&
        estDans(pathname, ZONES_MODULES_PRO) &&
        utilisateur.restaurantId &&
        !(await moduleAutoriseRestaurant(utilisateur.restaurantId, module))
      ) {
        return rediriger(request, PAGE_ACCES_REFUSE)
      }
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
  if (zoneBackOffice || zoneAbonnement || zoneSuperAdmin || zoneMonCompte) {
    return rediriger(request, '/login')
  }
  if (pageAuth) return rediriger(request, '/')
  return NextResponse.next()
}

export const config = {
  // Catch-all (hors actifs statiques et outils internes de Next) : le
  // refus par défaut ci-dessus s'applique donc à toute nouvelle route.
  matcher: [
    '/((?!_next|_vercel|__nextjs|__turbopack|.*\\..*).*)',
  ],
}
