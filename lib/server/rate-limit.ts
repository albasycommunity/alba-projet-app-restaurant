/**
 * Limiteur de débit en base de données (fenêtre fixe par clé).
 *
 * Remplace l'ancienne Map en mémoire : sur plusieurs instances serverless,
 * chaque instance avait son propre compteur et la limite devenait
 * inefficace. Chaque clé (IP|identifiant) est une ligne de la table
 * `rate_limits`, incrémentée de façon ATOMIQUE côté SQL (RPC
 * `incremente_rate_limit` — une seule UPDATE verrouille la ligne : deux
 * requêtes simultanées ne peuvent pas doubler le compteur).
 *
 * Protège les points sensibles : connexion (bruteforce), inscription
 * (spam), webhook et initiation de paiement (abus).
 */

import 'server-only'
import type { NextRequest } from 'next/server'
import { logger } from '@/lib/server/logger'
import { supabase } from '@/lib/server/supabase'

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
 *
 * En cas d'erreur Supabase (base injoignable, RPC indisponible), la
 * requête est AUTORISÉE (fail-open) : le rate-limiting est un pare-feu
 * de confort — il ne doit jamais bloquer l'app quand l'infra est déjà en
 * panne — mais l'erreur est loggée pour l'observabilité.
 */
export async function requeteAutorisee(
  req: NextRequest,
  identifiant: string,
  { fenetreMs, max }: OptionsLimitation,
): Promise<boolean> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'anonyme'
  const cle = `${ip}|${identifiant}`

  const { data, error } = await supabase.rpc('incremente_rate_limit', {
    p_cle: cle,
    p_fenetre_ms: fenetreMs,
    p_max: max,
  })
  if (error) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error)
    logger('rate-limit', 'warn', 'Rate-limit inaccessible — requête autorisée', {
      detail,
    })
    return true
  }
  return data === 1
}

/** Réponse standard 429. */
export function reponseTropDeRequetes(message: string) {
  return new Response(
    JSON.stringify({ erreur: message }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}
