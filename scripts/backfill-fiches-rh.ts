/**
 * Backfill one-shot des fiches RH — exécution MANUELLE, jamais au
 * démarrage de l'app.
 *
 *   node --env-file=.env.local scripts/backfill-fiches-rh.ts
 *   (ou : pnpm backfill:rh)
 *
 * La migration `fiches_rh` a été appliquée APRÈS la création des comptes
 * de démo : caissière et cuisinier n'ont pas de fiche. Ce script crée une
 * fiche minimale (poste générique « Équipe », date d'embauche =
 * aujourd'hui) pour chaque utilisateur STAFF / RESTAURANT_ADMIN qui n'en
 * a pas encore — sans jamais toucher aux fiches existantes.
 *
 * Idempotent : relançable sans risque.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL ?? ''
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!URL || !CLE_SERVICE) {
  throw new Error(
    '[alba-backfill-rh] SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes ' +
      'dans .env.local. Lance : node --env-file=.env.local scripts/backfill-fiches-rh.ts',
  )
}

const supabase: SupabaseClient = createClient(URL, CLE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function principal() {
  const { data: utilisateurs, error: errUtilisateurs } = await supabase
    .from('utilisateurs')
    .select('id, nom, role')
    .in('role', ['STAFF', 'RESTAURANT_ADMIN'])
  if (errUtilisateurs) throw errUtilisateurs

  const cibles = utilisateurs ?? []
  if (cibles.length === 0) {
    console.log('[backfill-rh] aucun compte STAFF/RESTAURANT_ADMIN — rien à faire.')
    return
  }

  const ids = cibles.map((u: { id: string }) => u.id)
  const { data: fiches, error: errFiches } = await supabase
    .from('fiches_rh')
    .select('utilisateur_id')
    .in('utilisateur_id', ids)
  if (errFiches) throw errFiches

  const dejaRenseignes = new Set(
    (fiches ?? []).map((f: { utilisateur_id: string }) => f.utilisateur_id),
  )
  const manquants = cibles.filter(
    (u: { id: string }) => !dejaRenseignes.has(u.id),
  )

  if (manquants.length === 0) {
    console.log(
      `[backfill-rh] rien à faire : les ${ids.length} comptes ont déjà une fiche RH.`,
    )
    return
  }

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const lignes = manquants.map((u: { id: string }) => ({
    utilisateur_id: u.id,
    poste: 'Équipe',
    date_embauche: aujourdhui,
  }))

  const { error: errInsertion } = await supabase
    .from('fiches_rh')
    .upsert(lignes, { onConflict: 'utilisateur_id' })
  if (errInsertion) throw errInsertion

  console.log(
    `[backfill-rh] ${manquants.length} fiche(s) créée(s) (poste « Équipe », embauche aujourd'hui) :`,
  )
  for (const u of manquants) {
    console.log(`       - ${(u as { nom: string }).nom} (${(u as { id: string }).id})`)
  }
  console.log('[backfill-rh] terminé — les routes RH gèrent de toute façon les fiches absentes.')
}

principal().catch((erreur) => {
  console.error(
    '[backfill-rh] ÉCHEC :',
    erreur instanceof Error ? erreur.message : erreur,
  )
  process.exit(1)
})
