/**
 * Backfill one-shot du mode « decouverte » — exécution MANUELLE, jamais au
 * démarrage de l'app.
 *
 *   node --env-file=.env.local scripts/backfill-decouverte.ts
 *
 * La migration `20260805093000_decouverte.sql` a déjà migré les statuts
 * `essai` → `decouverte` en base. Ce script est le filet de sécurité pour
 * toute base qui aurait contourné la migration : chaque abonnement resté
 * en `essai` passe en `decouverte` avec 3 actions restantes.
 *
 * Idempotent : un abonnement déjà en découverte (ou tout autre statut)
 * n'est jamais touché — relançable sans risque.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? ''
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!URL || !CLE_SERVICE) {
  throw new Error(
    '[alba-backfill-decouverte] SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes ' +
      'dans .env.local. Lance : node --env-file=.env.local scripts/backfill-decouverte.ts',
  )
}

const supabase: SupabaseClient = createClient(URL, CLE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function principal() {
  const { data: abonnements, error: errAbonnements } = await supabase
    .from('abonnements')
    .select('id, restaurant_id, statut')
    .eq('statut', 'essai')
  if (errAbonnements) throw errAbonnements

  const cibles = abonnements ?? []
  if (cibles.length === 0) {
    console.log('[backfill-decouverte] aucun abonnement en « essai » — rien à faire.')
    return
  }

  const lignes = cibles.map((a: { id: string }) => ({
    id: a.id,
    statut: 'decouverte',
    decouverte_actions_restantes: 3,
  }))

  const { error: errMiseAJour } = await supabase
    .from('abonnements')
    .upsert(lignes, { onConflict: 'id' })
  if (errMiseAJour) throw errMiseAJour

  console.log(
    `[backfill-decouverte] ${cibles.length} abonnement(s) basculé(s) « essai » → « decouverte » (3 actions restantes) :`,
  )
  for (const a of cibles) {
    console.log(`       - ${a.id} (${a.restaurant_id})`)
  }
  console.log('[backfill-decouverte] terminé — les autres statuts sont intacts.')
}

principal().catch((erreur) => {
  console.error(
    '[backfill-decouverte] ÉCHEC :',
    erreur instanceof Error ? erreur.message : erreur,
  )
  process.exit(1)
})
