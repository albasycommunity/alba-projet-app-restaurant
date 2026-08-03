/**
 * Limiteur de débit en mémoire (fenêtre glissante par clé).
 *
 * Protège les points sensibles : connexion (bruteforce), inscription
 * (spam), webhook et initiation de paiement (abus). En mémoire = parfait
 * pour une instance unique ; sur plusieurs instances, le compteur est
 * local à chacune — acceptable en l'état, un store partagé (Redis) est le
 * remplacement naturel quand on sortira du mono-instance.
 */

import 'server-only'
import type { NextRequest } from 'next/server'

type Fenetre = {
  compte: number
  reinitialiseA: number
}

const fenetres = new Map<string, Fenetre>()

export type OptionsLimitation = {
  /** Largeur de la fenêtre (ms). */
  fenetreMs: number
  /** Nombre maximum de requêtes autorisées dans la fenêtre. */
  max: number
}

/**
 * Retourne `true` si la requête est autorisée, `false` si elle dépasse
 * le quota. La clé combine l'IP (premier hop de X-Forwarded-For, posé par
 * le proxy/reverse) et l'identifiant métier (email, route).
 */
export function requeteAutorisee(
  req: NextRequest,
  identifiant: string,
  { fenetreMs, max }: OptionsLimitation,
): boolean {
  const maintenant = Date.now()
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonyme'
  const cle = `${ip}|${identifiant}`

  let fenetre = fenetres.get(cle)
  if (!fenetre || maintenant - fenetre.reinitialiseA >= fenetreMs) {
    fenetre = { compte: 0, reinitialiseA: maintenant }
    fenetres.set(cle, fenetre)
  }
  fenetre.compte += 1

  // Entretien : on purge les fenêtres mortes pour ne pas faire grossir la
  // table sans limite (bornes basses, mémoire négligeable).
  if (fenetres.size > 10_000) {
    for (const [k, v] of fenetres) {
      if (maintenant - v.reinitialiseA >= fenetreMs) fenetres.delete(k)
    }
  }

  return fenetre.compte <= max
}

/** Réponse standard 429. */
export function reponseTropDeRequetes(message: string) {
  return new Response(
    JSON.stringify({ erreur: message }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}
