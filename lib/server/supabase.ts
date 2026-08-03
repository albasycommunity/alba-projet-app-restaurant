/**
 * Client Supabase — côté SERVEUR uniquement (lib/server/).
 *
 * - `server-only` : jamais importé depuis un composant client.
 * - Clé `service_role` : contourne RLS (l'app fait toute la vérification
 *   d'autorisation en amont, dans les routes API et le proxy).
 * - Fail-fast au démarrage, comme pour JWT_SECRET : si les variables
 *   d'environnement manquent, l'app échoue immédiatement avec un message
 *   clair — jamais un client mal configuré qui tourne silencieusement.
 */

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? ''
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!URL || !CLE_SERVICE) {
  throw new Error(
    '[alba] SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes. ' +
      'Ajoute-les dans .env.local (jamais avec le préfixe NEXT_PUBLIC_, ' +
      'et jamais importées dans un composant client). ' +
      'Clés : Settings → API → Project URL / service_role key.',
  )
}

export const supabase: SupabaseClient = createClient(URL, CLE_SERVICE, {
  auth: {
    // Aucune session utilisateur : client serveur, accès via la clé
    // service_role uniquement. Ne rien persister ni rafraîchir.
    persistSession: false,
    autoRefreshToken: false,
  },
})
