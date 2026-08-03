/**
 * Seed de démonstration — Supabase (exécution MANUELLE, jamais au
 * démarrage de l'app).
 *
 *   node --env-file=.env.local scripts/seed-supabase.ts
 *   (ou : pnpm seed:supabase)
 *
 * Insère les comptes de démo (mots de passe RE-HACHÉS à partir des valeurs
 * en clair connues — même fonction bcryptjs que lib/server/auth.ts pour la
 * connexion, aucun hash du fichier JSON n'est copié), les restaurants, les
 * abonnements (gora@baobabbleu.sn → abonnement expiré), l'historique de
 * paiements, la fidélité du client, le compteur de commandes et les
 * paramètres de paiement (+221 78 48 54 767, NabooPay désactivé — à
 * activer manuellement une fois les vraies clés API disponibles).
 *
 * Idempotent : les données de démo existantes sont d'abord supprimées,
 * puis ré-insérées — le script peut être relancé sans risque.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { hashSync } from 'bcryptjs'

const URL = process.env.SUPABASE_URL ?? ''
const CLE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
if (!URL || !CLE_SERVICE) {
  throw new Error(
    '[alba-seed] SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes ' +
      'dans .env.local. Lance : node --env-file=.env.local scripts/seed-supabase.ts',
  )
}

const supabase: SupabaseClient = createClient(URL, CLE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const maintenant = new Date()
const ilYAJours = (n: number) =>
  new Date(maintenant.getTime() - n * 86_400_000).toISOString()
const dansJours = (n: number) =>
  new Date(maintenant.getTime() + n * 86_400_000).toISOString()

const NUMERO = '+221 78 48 54 767'

type CompteDemo = {
  email: string
  motDePasse: string
  nom: string
  role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN' | 'STAFF' | 'CLIENT'
  restaurantId: string | null
  permissions: string[]
}

const comptes: CompteDemo[] = [
  { email: 'superadmin@alba.sn', motDePasse: 'SuperAlba2026!', nom: 'Super Admin', role: 'SUPER_ADMIN', restaurantId: null, permissions: [] },
  { email: 'chef@chezfatou.sn', motDePasse: 'Fatou2026!', nom: 'Fatou Ndiaye', role: 'RESTAURANT_ADMIN', restaurantId: 'r1', permissions: [] },
  { email: 'gora@baobabbleu.sn', motDePasse: 'Gora2026!', nom: 'Gora Ndiaye', role: 'RESTAURANT_ADMIN', restaurantId: 'r2', permissions: [] },
  { email: 'adama@teranga.sn', motDePasse: 'Adama2026!', nom: 'Adama Ba', role: 'RESTAURANT_ADMIN', restaurantId: 'r3', permissions: [] },
  { email: 'caissiere@chezfatou.sn', motDePasse: 'Caissiere2026!', nom: 'Aïssatou Diallo', role: 'STAFF', restaurantId: 'r1', permissions: ['caisse', 'clients'] },
  { email: 'cuisinier@chezfatou.sn', motDePasse: 'Cuisinier2026!', nom: 'Moussa Sow', role: 'STAFF', restaurantId: 'r1', permissions: ['cuisine'] },
  { email: 'client@demo.sn', motDePasse: 'Client2026!', nom: 'Aminata Diallo', role: 'CLIENT', restaurantId: null, permissions: [] },
]

const restaurants = [
  { id: 'r1', nom: 'Chez Fatou', quartier: 'Ngor, Dakar', gerant: 'Fatou Ndiaye', actif: true, cree_le: ilYAJours(220) },
  { id: 'r2', nom: 'Le Baobab Bleu', quartier: 'Pointe des Almadies', gerant: 'Gora Ndiaye', actif: true, cree_le: ilYAJours(140) },
  { id: 'r3', nom: 'Teranga Grill', quartier: 'Plateau, Dakar', gerant: 'Adama Ba', actif: true, cree_le: ilYAJours(65) },
]

const abonnements = [
  { id: 'a1', restaurant_id: 'r1', plan: 'mensuel', palier: 'pro', statut: 'actif', date_debut: ilYAJours(20), date_fin: dansJours(17), montant: 35_000 },
  { id: 'a2', restaurant_id: 'r2', plan: 'mensuel', palier: 'starter', statut: 'expire', date_debut: ilYAJours(55), date_fin: ilYAJours(5), montant: 15_000 },
  { id: 'a3', restaurant_id: 'r3', plan: 'annuel', palier: 'starter', statut: 'actif', date_debut: ilYAJours(30), date_fin: dansJours(182), montant: 150_000 },
]

const paiements = [
  { id: 'p1', abonnement_id: 'a1', restaurant_id: 'r1', restaurant_nom: 'Chez Fatou', montant: 25_000, mode: 'Wave', motif: 'Abonnement mensuel', date: ilYAJours(20) },
  { id: 'p2', abonnement_id: 'a3', restaurant_id: 'r3', restaurant_nom: 'Teranga Grill', montant: 250_000, mode: 'Orange Money', motif: 'Abonnement annuel', date: ilYAJours(30) },
  { id: 'p3', abonnement_id: 'a1', restaurant_id: 'r1', restaurant_nom: 'Chez Fatou', montant: 25_000, mode: 'Wave', motif: 'Abonnement mensuel', date: ilYAJours(50) },
  { id: 'p4', abonnement_id: 'a2', restaurant_id: 'r2', restaurant_nom: 'Le Baobab Bleu', montant: 25_000, mode: 'Free Money', motif: 'Abonnement mensuel', date: ilYAJours(55) },
]

async function viderDonneesDemo() {
  const emails = comptes.map((c) => c.email)
  const { data: utilisateurs, error: errUtilisateurs } = await supabase
    .from('utilisateurs')
    .select('id, email')
    .in('email', emails)
  if (errUtilisateurs) throw errUtilisateurs

  const idsUtilisateurs = (utilisateurs ?? []).map((u: { id: string }) => u.id)

  const supprimer = async (
    table: string,
    colonne: string,
    valeurs: string[],
  ) => {
    if (valeurs.length === 0) return
    const { error } = await supabase.from(table).delete().in(colonne, valeurs)
    if (error) throw error
  }

  // Enfants d'abord (FK). Les webhooks ne référencent rien : on les vide
  // pour repartir d'un journal de démo propre.
  const { data: webhooks } = await supabase.from('webhooks_paiement').select('id')
  await supprimer('webhooks_paiement', 'id', (webhooks ?? []).map((w: { id: string }) => w.id))
  await supprimer('transactions_paiement', 'restaurant_id', ['r1', 'r2', 'r3'])
  await supprimer('commandes_clients', 'restaurant_id', ['r1', 'r2', 'r3'])
  await supprimer('paiements', 'abonnement_id', ['a1', 'a2', 'a3'])
  await supprimer('fidelite', 'user_id', idsUtilisateurs)
  await supprimer('abonnements', 'id', ['a1', 'a2', 'a3'])
  await supprimer('utilisateurs', 'email', emails)
  await supprimer('restaurants', 'id', ['r1', 'r2', 'r3'])
  console.log(
    `[seed] données de démo supprimées (${idsUtilisateurs.length} comptes, webhooks, transactions, paiements, commandes)`,
  )
}

async function insérer() {
  const { error: errRestaurants } = await supabase.from('restaurants').upsert(restaurants, { onConflict: 'id' })
  if (errRestaurants) throw errRestaurants

  // Mots de passe RE-HACHÉS depuis les valeurs en clair connues — même
  // fonction (bcryptjs, coût 10) que la connexion de lib/server/auth.ts.
  const utilisateurs = comptes.map((c) => ({
    id: `u-${c.email.split('@')[0]}`,
    email: c.email,
    password_hash: hashSync(c.motDePasse, 10),
    nom: c.nom,
    role: c.role,
    restaurant_id: c.restaurantId,
    actif: true,
    permissions: c.permissions,
    cree_le: ilYAJours(220),
  }))
  const { error: errUtilisateurs } = await supabase.from('utilisateurs').upsert(utilisateurs, { onConflict: 'id' })
  if (errUtilisateurs) throw errUtilisateurs

  const { error: errAbonnements } = await supabase.from('abonnements').upsert(abonnements, { onConflict: 'id' })
  if (errAbonnements) throw errAbonnements

  const { error: errPaiements } = await supabase.from('paiements').upsert(paiements, { onConflict: 'id' })
  if (errPaiements) throw errPaiements

  const client = utilisateurs.find((u) => u.email === 'client@demo.sn')!
  const { error: errFidelite } = await supabase.from('fidelite').upsert(
    [{ user_id: client.id, points: 1240, visites: 34, panier_moyen: 6200 }],
    { onConflict: 'user_id' },
  )
  if (errFidelite) throw errFidelite

  const { error: errCompteur } = await supabase.from('compteurs').upsert(
    [{ cle: 'commandes', valeur: 400 }],
    { onConflict: 'cle' },
  )
  if (errCompteur) throw errCompteur

  const { error: errParametres } = await supabase.from('parametres_paiement').upsert(
    [{
      id: 1,
      numeros_mobile_money: { Wave: NUMERO, 'Orange Money': NUMERO, 'Free Money': NUMERO },
      naboopay_actif: false,
      naboopay_api_key: '',
      naboopay_webhook_secret: '',
    }],
    { onConflict: 'id' },
  )
  if (errParametres) throw errParametres
}

async function vérifier() {
  const { data: utilisateurs } = await supabase.from('utilisateurs').select('email, actif, role, restaurant_id')
  console.log(`[seed] ${utilisateurs?.length ?? 0} comptes en base :`)
  for (const u of utilisateurs ?? []) {
    console.log(`       - ${u.email} (${u.role}${u.restaurant_id ? `, ${u.restaurant_id}` : ''}, actif=${u.actif})`)
  }
  const { data: parametres } = await supabase.from('parametres_paiement').select('id').eq('id', 1).maybeSingle()
  console.log(`[seed] parametres_paiement : ${parametres ? 'ok (ligne id=1)' : 'ABSENT'}`)
}

async function principal() {
  console.log('[seed] démarrage…')
  await viderDonneesDemo()
  await insérer()
  await vérifier()
  console.log('[seed] terminé — comptes de démo fonctionnels (mots de passe re-hachés).')
  console.log('[seed] Rappel : NabooPay est DÉSACTIVÉ (naboopay_actif=false) — à activer via le panel super admin une fois les vraies clés API disponibles.')
}

principal().catch((erreur) => {
  console.error('[seed] ÉCHEC :', erreur instanceof Error ? erreur.message : erreur)
  process.exit(1)
})
