/**
 * Couche de données serveur — Supabase (Postgres) côté serveur via la clé
 * `service_role` (contourne RLS : toute l'autorisation est faite dans les
 * routes API et le proxy). Les fonctions sont `server-only` : jamais
 * importées depuis le client.
 *
 * L'API exportée est IDENTIQUE à l'ancienne version fichier JSON : aucune
 * route API n'a été modifiée pour la migration.
 *
 * Lectures : cache mémoire court (ttlCacheMs), comme avant — une écriture
 * faite par une autre instance est vue au plus tard après ce TTL.
 * Écritures : `muterBdd` relit l'état FRAIS depuis Postgres, applique la
 * mutation, puis synchronise par table SEULEMENT les tables réellement
 * modifiées (comparaison ordre-indépendante) — jamais de réécriture
 * complète pour une petite mutation.
 * Compteur de commandes : incrément ATOMIQUE côté SQL (RPC
 * `incrementer_compteur`, UPDATE ... RETURNING) — pas de lire-puis-écrire,
 * donc pas de race condition entre instances serverless.
 * Erreurs : jamais de détail Postgres vers le client — tout est loggé
 * côté serveur (logger), le client reçoit un message générique.
 */

import 'server-only'
import { hashSync } from 'bcryptjs'
import {
  PLANS_ABONNEMENT,
  Permission,
  Role,
  dateDans,
  dateIso,
  estAbonnementAccessible,
  moduleAutorise,
  nouveauId,
  palierValide,
  parametresPaiementParDefaut,
  type Abonnement,
  type CommandeClient,
  type FideliteClient,
  type ModePaiementAbonnement,
  type NumerosMobileMoney,
  type Paiement,
  type PalierAbonnement,
  type ParametresPaiement,
  type PlanAbonnement,
  type Restaurant,
  type StatutAbonnement,
  type TransactionPaiement,
  type Utilisateur,
  type WebhookJournal,
} from '@/lib/auth'
import { logger } from '@/lib/server/logger'
import { supabase } from '@/lib/server/supabase'

/** Version du format de données (historique, conservée pour compatibilité). */
const VERSION_BDD = 3

export type Bdd = {
  version: number
  restaurants: Restaurant[]
  utilisateurs: Utilisateur[]
  abonnements: Abonnement[]
  paiements: Paiement[]
  fidelite: FideliteClient[]
  commandesClients: CommandeClient[]
  compteurCommandes: number
  /** Configuration paiement (numéros + fournisseurs). Clés côté serveur. */
  parametresPaiement: ParametresPaiement
  /** Transactions agrégateur en attente de confirmation webhook. */
  transactionsPaiement: TransactionPaiement[]
  /** Journal des webhooks reçus, même rejetés. */
  webhooksPaiement: WebhookJournal[]
}

/* ------------------------- comptes de démonstration ------------------------- */

export const COMPTES_DEMO: {
  role: Role
  email: string
  motDePasse: string
  nom: string
  restaurantId?: string
  fidelite?: { points: number; visites: number; panierMoyen: number }
  permissions?: Permission[]
}[] = [
  {
    role: Role.SUPER_ADMIN,
    email: 'superadmin@alba.sn',
    motDePasse: 'SuperAlba2026!',
    nom: 'Super Admin',
  },
  {
    role: Role.RESTAURANT_ADMIN,
    email: 'chef@chezfatou.sn',
    motDePasse: 'Fatou2026!',
    nom: 'Fatou Ndiaye',
    restaurantId: 'r1',
  },
  {
    role: Role.RESTAURANT_ADMIN,
    email: 'gora@baobabbleu.sn',
    motDePasse: 'Gora2026!',
    nom: 'Gora Ndiaye',
    restaurantId: 'r2',
  },
  {
    role: Role.RESTAURANT_ADMIN,
    email: 'adama@teranga.sn',
    motDePasse: 'Adama2026!',
    nom: 'Adama Ba',
    restaurantId: 'r3',
  },
  {
    role: Role.STAFF,
    email: 'caissiere@chezfatou.sn',
    motDePasse: 'Caissiere2026!',
    nom: 'Aïssatou Diallo',
    restaurantId: 'r1',
    permissions: [Permission.CAISSE, Permission.CLIENTS],
  },
  {
    role: Role.STAFF,
    email: 'cuisinier@chezfatou.sn',
    motDePasse: 'Cuisinier2026!',
    nom: 'Moussa Sow',
    restaurantId: 'r1',
    permissions: [Permission.CUISINE],
  },
  {
    role: Role.CLIENT,
    email: 'client@demo.sn',
    motDePasse: 'Client2026!',
    nom: 'Aminata Diallo',
    fidelite: { points: 1240, visites: 34, panierMoyen: 6200 },
  },
]

/* ------------------------------ client Supabase ------------------------------ */

/** Timestamptz → ISO normalisé (format Z), stable pour les comparaisons. */
function iso(valeur: string | null | undefined): string | undefined {
  if (valeur === null || valeur === undefined) return undefined
  return new Date(valeur).toISOString()
}

/** Message lisible d'une erreur Supabase (PostgrestError n'est pas une Error). */
function messageErreur(erreur: unknown): string {
  if (erreur instanceof Error) return erreur.message
  if (typeof erreur === 'object' && erreur !== null) {
    const e = erreur as { message?: unknown; details?: unknown; code?: unknown }
    const morceaux = [e.message, e.details, e.code]
      .filter((m) => typeof m === 'string' && m)
    if (morceaux.length > 0) return morceaux.join(' | ')
  }
  return String(erreur)
}

/** Erreur Supabase : loggée côté serveur, jamais renvoyée au client. */
function erreurBdd(operation: string, erreur: unknown): never {
  logger('bdd', 'erreur', 'Erreur Supabase', {
    operation,
    detail: messageErreur(erreur),
  })
  throw new Error('Erreur interne de la base de données.')
}

/* ------------------------------ mapping lignes ------------------------------ */

type Ligne = Record<string, unknown>

function restaurantVersLigne(r: Restaurant): Ligne {
  return { id: r.id, nom: r.nom, quartier: r.quartier, gerant: r.gerant, actif: r.actif, cree_le: r.creeLe, onboarding_masque: r.onboarding_masque, onboarding_stats_consultees: r.onboarding_stats_consultees }
}
function restaurantDepuisLigne(l: Record<string, unknown>): Restaurant {
  return { id: String(l.id), nom: String(l.nom), quartier: String(l.quartier), gerant: String(l.gerant), actif: Boolean(l.actif), creeLe: iso(String(l.cree_le))!, onboarding_masque: l.onboarding_masque !== undefined ? Boolean(l.onboarding_masque) : true, onboarding_stats_consultees: l.onboarding_stats_consultees !== undefined ? Boolean(l.onboarding_stats_consultees) : false }
}
function utilisateurVersLigne(u: Utilisateur): Ligne {
  return { id: u.id, email: u.email, password_hash: u.password_hash, nom: u.nom, role: u.role, restaurant_id: u.restaurantId, actif: u.actif, permissions: u.permissions, cree_le: u.creeLe }
}
function utilisateurDepuisLigne(l: Record<string, unknown>): Utilisateur {
  return { id: String(l.id), email: String(l.email), password_hash: String(l.password_hash), nom: String(l.nom), role: l.role as Role, restaurantId: (l.restaurant_id as string | null) ?? null, actif: Boolean(l.actif), permissions: Array.isArray(l.permissions) ? (l.permissions as Permission[]) : [], creeLe: iso(String(l.cree_le))! }
}
function abonnementVersLigne(a: Abonnement): Ligne {
  return { id: a.id, restaurant_id: a.restaurantId, plan: a.plan, palier: a.palier ?? null, statut: a.statut, date_debut: a.dateDebut, date_fin: a.dateFin, montant: a.montant, decouverte_actions_restantes: a.decouverteActionsRestantes ?? 3 }
}
function abonnementDepuisLigne(l: Record<string, unknown>): Abonnement {
  return { id: String(l.id), restaurantId: String(l.restaurant_id), plan: l.plan as PlanAbonnement, palier: palierValide(l.palier) ? l.palier : undefined, statut: l.statut as StatutAbonnement, dateDebut: iso(String(l.date_debut))!, dateFin: iso(String(l.date_fin))!, montant: Number(l.montant), decouverteActionsRestantes: typeof l.decouverte_actions_restantes === 'number' ? l.decouverte_actions_restantes : 3 }
}
function paiementVersLigne(p: Paiement): Ligne {
  return { id: p.id, abonnement_id: p.abonnementId, restaurant_id: p.restaurantId, restaurant_nom: p.restaurantNom, montant: p.montant, mode: p.mode, motif: p.motif, date: p.date }
}
function paiementDepuisLigne(l: Record<string, unknown>): Paiement {
  return { id: String(l.id), abonnementId: String(l.abonnement_id), restaurantId: String(l.restaurant_id), restaurantNom: String(l.restaurant_nom), montant: Number(l.montant), mode: l.mode as ModePaiementAbonnement, motif: String(l.motif), date: iso(String(l.date))! }
}
function fideliteVersLigne(f: FideliteClient): Ligne {
  return { user_id: f.userId, points: f.points, visites: f.visites, panier_moyen: f.panierMoyen }
}
function fideliteDepuisLigne(l: Record<string, unknown>): FideliteClient {
  return { userId: String(l.user_id), points: Number(l.points), visites: Number(l.visites), panierMoyen: Number(l.panier_moyen) }
}
function commandeVersLigne(c: CommandeClient): Ligne {
  return { id: c.id, ref: c.ref, client_id: c.clientId, client_nom: c.clientNom, restaurant_id: c.restaurantId, lignes: c.lignes, total: c.total, cree_a: c.creeA }
}
function commandeDepuisLigne(l: Record<string, unknown>): CommandeClient {
  return { id: String(l.id), ref: String(l.ref), clientId: String(l.client_id), clientNom: String(l.client_nom), restaurantId: String(l.restaurant_id), lignes: l.lignes as CommandeClient['lignes'], total: Number(l.total), creeA: iso(String(l.cree_a))! }
}
function transactionVersLigne(t: TransactionPaiement): Ligne {
  return { id: t.id, fournisseur: t.fournisseur, order_id: t.orderId, abonnement_id: t.abonnementId, restaurant_id: t.restaurantId, plan: t.plan, palier: t.palier ?? null, montant: t.montant, statut: t.statut, cree_le: t.creeLe, paye_le: t.payeLe ?? null, methode: t.methode ?? null, frais: t.frais ?? null }
}
function transactionDepuisLigne(l: Record<string, unknown>): TransactionPaiement {
  return { id: String(l.id), fournisseur: 'naboopay', orderId: String(l.order_id), abonnementId: String(l.abonnement_id), restaurantId: String(l.restaurant_id), plan: l.plan as PlanAbonnement, palier: palierValide(l.palier) ? l.palier : undefined, montant: Number(l.montant), statut: l.statut as TransactionPaiement['statut'], creeLe: iso(String(l.cree_le))!, payeLe: l.paye_le ? iso(String(l.paye_le)) : undefined, methode: l.methode !== null && l.methode !== undefined ? String(l.methode) : undefined, frais: l.frais !== null && l.frais !== undefined ? Number(l.frais) : undefined }
}
function webhookVersLigne(w: WebhookJournal): Ligne {
  return { id: w.id, fournisseur: w.fournisseur, recu_le: w.recuLe, signature_valide: w.signatureValide, statut: w.statut, ordre_id: w.ordreId ?? null, detail: w.detail ?? null, corps: w.corps }
}
function webhookDepuisLigne(l: Record<string, unknown>): WebhookJournal {
  return { id: String(l.id), fournisseur: 'naboopay', recuLe: iso(String(l.recu_le))!, signatureValide: Boolean(l.signature_valide), statut: l.statut as WebhookJournal['statut'], ordreId: l.ordre_id !== null && l.ordre_id !== undefined ? String(l.ordre_id) : undefined, detail: l.detail !== null && l.detail !== undefined ? String(l.detail) : undefined, corps: String(l.corps ?? '') }
}
function parametresVersLigne(p: ParametresPaiement): Ligne {
  return { id: 1, numeros_mobile_money: p.numerosMobileMoney, naboopay_actif: p.naboopay.actif, naboopay_api_key: p.naboopay.apiKey, naboopay_webhook_secret: p.naboopay.webhookSecret }
}
function parametresDepuisLigne(l: Record<string, unknown> | null): ParametresPaiement {
  const defaut = parametresPaiementParDefaut()
  if (!l) return defaut
  const numeros = l.numeros_mobile_money as Partial<NumerosMobileMoney> | null
  return {
    numerosMobileMoney: {
      Wave: String(numeros?.Wave ?? defaut.numerosMobileMoney.Wave),
      'Orange Money': String(numeros?.['Orange Money'] ?? defaut.numerosMobileMoney['Orange Money']),
      'Free Money': String(numeros?.['Free Money'] ?? defaut.numerosMobileMoney['Free Money']),
    },
    naboopay: {
      actif: Boolean(l.naboopay_actif),
      apiKey: String(l.naboopay_api_key ?? ''),
      webhookSecret: String(l.naboopay_webhook_secret ?? ''),
    },
  }
}

/* ------------------------------- cache mémoire ------------------------------- */

/**
 * Cache mémoire — mêmes règles que l'ancienne version fichier :
 * - le bundle des routes API ÉCRIT : cache invalidé en write-through
 *   (toute écriture incrémente `versionEcritures` et remplace l'objet
 *   caché) ;
 * - le bundle proxy (Next 16 bundlé séparément) ne fait que LIRE :
 *   fraîcheur bornée par `ttlMs` (configuré via configurerCacheBdd) ;
 * - `ttlMs` sert de filet entre instances : une écriture faite ailleurs
 *   est vue au plus tard après `ttlMs`.
 */
type CacheBdd = {
  bdd: Bdd
  version: number
  chargeA: number
}

let cache: CacheBdd | null = null
let chargementEnCours: Promise<Bdd> | null = null
let versionEcritures = 0
let ttlCacheMs = 1_000

/** Fixe la durée de vie du cache (appelé par le proxy, bundle lecture seule). */
export function configurerCacheBdd({ ttlMs }: { ttlMs: number }) {
  if (ttlMs >= 0) ttlCacheMs = ttlMs
  cache = null
}

/* --------------------------- chargement depuis Supabase --------------------------- */

async function chargerRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase.from('restaurants').select('*').order('id')
  if (error) erreurBdd('lecture restaurants', error)
  return (data ?? []).map((l) => restaurantDepuisLigne(l as Record<string, unknown>))
}

async function chargerUtilisateurs(): Promise<Utilisateur[]> {
  const { data, error } = await supabase.from('utilisateurs').select('*').order('id')
  if (error) erreurBdd('lecture utilisateurs', error)
  return (data ?? []).map((l) => utilisateurDepuisLigne(l as Record<string, unknown>))
}

async function chargerAbonnements(): Promise<Abonnement[]> {
  const { data, error } = await supabase.from('abonnements').select('*').order('id')
  if (error) erreurBdd('lecture abonnements', error)
  return (data ?? []).map((l) => abonnementDepuisLigne(l as Record<string, unknown>))
}

async function chargerPaiements(): Promise<Paiement[]> {
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .order('date', { ascending: false })
    .order('id', { ascending: false })
  if (error) erreurBdd('lecture paiements', error)
  return (data ?? []).map((l) => paiementDepuisLigne(l as Record<string, unknown>))
}

async function chargerFidelite(): Promise<FideliteClient[]> {
  const { data, error } = await supabase.from('fidelite').select('*').order('user_id')
  if (error) erreurBdd('lecture fidelite', error)
  return (data ?? []).map((l) => fideliteDepuisLigne(l as Record<string, unknown>))
}

async function chargerCommandesClients(): Promise<CommandeClient[]> {
  const { data, error } = await supabase
    .from('commandes_clients')
    .select('*')
    .order('cree_a', { ascending: false })
    .order('id', { ascending: false })
  if (error) erreurBdd('lecture commandes_clients', error)
  return (data ?? []).map((l) => commandeDepuisLigne(l as Record<string, unknown>))
}

async function chargerCompteur(): Promise<number> {
  const { data, error } = await supabase.from('compteurs').select('valeur').eq('cle', 'commandes').maybeSingle()
  if (error) erreurBdd('lecture compteurs', error)
  return typeof data?.valeur === 'number' ? data.valeur : 0
}

async function chargerParametres(): Promise<ParametresPaiement> {
  const { data, error } = await supabase.from('parametres_paiement').select('*').eq('id', 1).maybeSingle()
  if (error) erreurBdd('lecture parametres_paiement', error)
  return parametresDepuisLigne((data as Record<string, unknown> | null) ?? null)
}

async function chargerTransactions(): Promise<TransactionPaiement[]> {
  const { data, error } = await supabase
    .from('transactions_paiement')
    .select('*')
    .order('cree_le', { ascending: false })
    .order('id', { ascending: false })
  if (error) erreurBdd('lecture transactions_paiement', error)
  return (data ?? []).map((l) => transactionDepuisLigne(l as Record<string, unknown>))
}

async function chargerWebhooks(): Promise<WebhookJournal[]> {
  const { data, error } = await supabase
    .from('webhooks_paiement')
    .select('*')
    .order('recu_le', { ascending: false })
    .order('id', { ascending: false })
  if (error) erreurBdd('lecture webhooks_paiement', error)
  return (data ?? []).map((l) => webhookDepuisLigne(l as Record<string, unknown>))
}

/** Charge l'état complet DEPUIS POSTGRES — jamais le cache. */
async function chargerBdd(): Promise<Bdd> {
  const [restaurants, utilisateurs, abonnements, paiements, fidelite, commandesClients, compteurCommandes, parametresPaiement, transactionsPaiement, webhooksPaiement] =
    await Promise.all([
      chargerRestaurants(),
      chargerUtilisateurs(),
      chargerAbonnements(),
      chargerPaiements(),
      chargerFidelite(),
      chargerCommandesClients(),
      chargerCompteur(),
      chargerParametres(),
      chargerTransactions(),
      chargerWebhooks(),
    ])
  return {
    version: VERSION_BDD,
    restaurants,
    utilisateurs,
    abonnements,
    paiements,
    fidelite,
    commandesClients,
    compteurCommandes,
    parametresPaiement,
    transactionsPaiement,
    webhooksPaiement,
  }
}

export async function lireBdd(): Promise<Bdd> {
  if (cache) {
    const coherent = cache.version === versionEcritures
    const dansTtl = Date.now() - cache.chargeA < ttlCacheMs
    if (coherent && dansTtl) return cache.bdd
  }
  if (!chargementEnCours) {
    chargementEnCours = chargerBdd().finally(() => {
      chargementEnCours = null
    })
  }
  const bdd = await chargementEnCours
  cache = { bdd, version: versionEcritures, chargeA: Date.now() }
  return bdd
}

/* ----------------------------- synchronisation SQL ----------------------------- */

type Lignes = Record<string, Ligne[]>

/** Lignes dérivées de l'état mémoire (clés = NOMS RÉELS des tables). */
function lignesPour(bdd: Bdd): Lignes {
  return {
    restaurants: bdd.restaurants.map(restaurantVersLigne),
    utilisateurs: bdd.utilisateurs.map(utilisateurVersLigne),
    abonnements: bdd.abonnements.map(abonnementVersLigne),
    paiements: bdd.paiements.map(paiementVersLigne),
    fidelite: bdd.fidelite.map(fideliteVersLigne),
    commandes_clients: bdd.commandesClients.map(commandeVersLigne),
    compteurs: [{ cle: 'commandes', valeur: bdd.compteurCommandes }],
    parametres_paiement: [parametresVersLigne(bdd.parametresPaiement)],
    transactions_paiement: bdd.transactionsPaiement.map(transactionVersLigne),
    webhooks_paiement: bdd.webhooksPaiement.map(webhookVersLigne),
  }
}

const CONFLIT_PAR_TABLE: Record<string, string> = {
  restaurants: 'id',
  utilisateurs: 'id',
  abonnements: 'id',
  paiements: 'id',
  fidelite: 'user_id',
  commandes_clients: 'id',
  compteurs: 'cle',
  parametres_paiement: 'id',
  transactions_paiement: 'id',
  webhooks_paiement: 'id',
}

// Parents d'abord (les enfants référencent leurs parents par FK).
const ORDRE_UPSERT = [
  'restaurants',
  'utilisateurs',
  'abonnements',
  'paiements',
  'fidelite',
  'commandes_clients',
  'transactions_paiement',
  'webhooks_paiement',
  'compteurs',
  'parametres_paiement',
]
// Enfants d'abord (inverse : une FK parent → enfant n'est jamais violée).
const ORDRE_SUPPRESSION = [...ORDRE_UPSERT].reverse()

/**
 * Compare les états par table (ordre de lignes ignoré) et synchronise en
 * base UNIQUEMENT les tables modifiées : upsert des lignes nouvelles/
 * changées, suppression des lignes disparues.
 */
async function synchroniser(bdd: Bdd, avant: Lignes) {
  const apres = lignesPour(bdd)
  const modifiees: Record<string, { nouvelles: Ligne[]; avant: Ligne[] }> = {}

  for (const table of Object.keys(CONFLIT_PAR_TABLE)) {
    const anciennes = avant[table] ?? []
    const nouvelles = apres[table] ?? []
    if (cartesEgales(anciennes, nouvelles)) continue
    modifiees[table] = { nouvelles, avant: anciennes }
  }

  if (Object.keys(modifiees).length === 0) return

  // Upsert — parents d'abord.
  for (const table of ORDRE_UPSERT) {
    const mod = modifiees[table]
    if (!mod || mod.nouvelles.length === 0) continue
    const { error } = await supabase
      .from(table)
      .upsert(mod.nouvelles, { onConflict: CONFLIT_PAR_TABLE[table] })
    if (error) erreurBdd(`écriture ${table}`, error)
  }

  // Suppressions — enfants d'abord.
  for (const table of ORDRE_SUPPRESSION) {
    const mod = modifiees[table]
    if (!mod) continue
    const idsAnciens = new Set(mod.avant.map((l) => String(l[CONFLIT_PAR_TABLE[table]])))
    const idsNouveaux = new Set(mod.nouvelles.map((l) => String(l[CONFLIT_PAR_TABLE[table]])))
    const supprimes = [...idsAnciens].filter((id) => !idsNouveaux.has(id))
    if (supprimes.length === 0) continue
    const { error } = await supabase
      .from(table)
      .delete()
      .in(CONFLIT_PAR_TABLE[table], supprimes)
    if (error) erreurBdd(`suppression ${table}`, error)
  }
}

function cartesEgales(a: Ligne[], b: Ligne[]): boolean {
  if (a.length !== b.length) return false
  const aTri = [...a].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)))
  const bTri = [...b].sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)))
  for (let i = 0; i < aTri.length; i++) {
    if (JSON.stringify(aTri[i]) !== JSON.stringify(bTri[i])) return false
  }
  return true
}

/**
 * Écriture complète de l'état (remplace l'ancienne écriture fichier) :
 * synchronise TOUTES les tables depuis l'état fourni. Utilisée par
 * `sauverBdd` (compatibilité) — `muterBdd` fait mieux (diff par table).
 */
export async function sauverBdd(bdd: Bdd) {
  await synchroniser(bdd, videLignes())
  versionEcritures += 1
  cache = { bdd, version: versionEcritures, chargeA: Date.now() }
}

function videLignes(): Lignes {
  const lignes = lignesPour({
    version: VERSION_BDD,
    restaurants: [],
    utilisateurs: [],
    abonnements: [],
    paiements: [],
    fidelite: [],
    commandesClients: [],
    compteurCommandes: 0,
    parametresPaiement: parametresPaiementParDefaut(),
    transactionsPaiement: [],
    webhooksPaiement: [],
  })
  for (const cle of Object.keys(lignes)) lignes[cle] = []
  return lignes
}

/**
 * File d'attente des mutations : sérialise les mutations du processus
 * (lecture fraîche → mutation → synchronisation), comme l'ancien verrou
 * du fichier JSON.
 */
let chaineEcriture: Promise<unknown> = Promise.resolve()

function serialiser<T>(fn: () => Promise<T>): Promise<T> {
  const suivant = chaineEcriture.then(fn, fn)
  chaineEcriture = suivant.catch(() => undefined)
  return suivant
}

/** Met à jour la base par mutation puis synchronise les tables modifiées. */
export async function muterBdd(
  fn: (bdd: Bdd) => void | Promise<void>,
): Promise<Bdd> {
  return serialiser(async () => {
    const bdd = await chargerBdd()
    const avant = lignesPour(bdd)
    await fn(bdd)
    await synchroniser(bdd, avant)
    versionEcritures += 1
    cache = { bdd, version: versionEcritures, chargeA: Date.now() }
    return bdd
  })
}

/** Métadonnées du store, pour le point de santé / observabilité. */
export async function etatDuStore() {
  const bdd = await lireBdd()
  return {
    version: VERSION_BDD,
    restaurants: bdd.restaurants.length,
    utilisateurs: bdd.utilisateurs.length,
    abonnements: bdd.abonnements.length,
    enCache: cache !== null,
    ttlCacheMs,
  }
}

/* ------------------------------- lectures --------------------------------- */

/**
 * Palier commercial EFFECTIF d'un restaurant — SOURCE UNIQUE DE VÉRITÉ,
 * relue à chaque requête sensible (jamais mis en cache dans le JWT).
 *
 * Règles :
 * - mode « decouverte » : palier effectif `pro`, quelle que soit la
 *   valeur du champ `palier` — pendant la découverte, tous les modules
 *   (Stock, Hygiène, Pilotage) sont visibles : démonstration complète de
 *   la valeur ;
 * - l'enregistrement d'abonnement fait foi (`palier` écrit lors du
 *   renouvellement / de l'inscription) — anti-escalade : jamais de valeur
 *   envoyée par le client ;
 * - abonnement absent ou `palier` absent → défaut à la lecture, sans
 *   écriture (une vérification reste une lecture pure) ;
 * - fail-closed : défaut Starter, sauf exception démo explicite
 *   (chef@chezfatou.sn → Pro, cohérent avec ses 2 comptes STAFF déjà
 *   actifs).
 */
export async function palierDeRestaurant(
  restaurantId: string,
): Promise<PalierAbonnement> {
  const bdd = await lireBdd()
  return palierEffectifBdd(bdd, restaurantId)
}

function palierEffectifBdd(
  bdd: Bdd,
  restaurantId: string,
): PalierAbonnement {
  const abonnement = bdd.abonnements
    .filter((a) => a.restaurantId === restaurantId)
    .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0]
  if (!abonnement) return 'starter'
  if (abonnement.statut === 'decouverte') return 'pro'
  if (palierValide(abonnement.palier)) return abonnement.palier
  const admin = bdd.utilisateurs.find(
    (u) =>
      u.role === Role.RESTAURANT_ADMIN && u.restaurantId === restaurantId,
  )
  if (admin?.email === EMAIL_DEMO_PRO) return 'pro'
  return 'starter'
}

const EMAIL_DEMO_PRO = 'chef@chezfatou.sn'

/** Un module (permission) est-il couvert par le palier du restaurant ? (lecture pure) */
export async function moduleAutoriseRestaurant(
  restaurantId: string,
  permission: Permission,
): Promise<boolean> {
  return moduleAutorise(await palierDeRestaurant(restaurantId), permission)
}

export async function trouverUtilisateurParEmail(email: string) {
  const bdd = await lireBdd()
  return bdd.utilisateurs.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
}

export async function trouverUtilisateur(id: string) {
  const bdd = await lireBdd()
  return bdd.utilisateurs.find((u) => u.id === id)
}

export async function abonnementDeRestaurant(restaurantId: string) {
  const bdd = await lireBdd()
  return (
    bdd.abonnements
      .filter((a) => a.restaurantId === restaurantId)
      .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0] ?? null
  )
}

export async function fideliteDeClient(userId: string) {
  const bdd = await lireBdd()
  return bdd.fidelite.find((f) => f.userId === userId) ?? null
}

/**
 * Vérification autoritaire pour un RESTAURANT_ADMIN :
 * le compte utilisateur doit être actif ET l'abonnement de son restaurant
 * accessible (payé « actif » ou mode « decouverte » en cours).
 * Réappliquée à chaque requête (proxy + API), jamais seulement côté UI.
 */
export async function verifierAccesRestaurant(
  restaurantId: string | null,
  utilisateurId?: string,
) {
  const bdd = await lireBdd()
  const compteActif = utilisateurId
    ? (bdd.utilisateurs.find((u) => u.id === utilisateurId)?.actif ?? false)
    : !!restaurantId
  if (!restaurantId) return { compteActif, abonnementActif: false }
  const abonnement = bdd.abonnements
    .filter((a) => a.restaurantId === restaurantId)
    .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0]
  const abonnementActif = estAbonnementAccessible(abonnement)
  return { compteActif, abonnementActif }
}

/* -------------------------------- écritures -------------------------------- */

/** Crée un restaurant, son compte admin et son abonnement (un seul geste). */
export async function creerRestaurantAvecAbonnement(input: {
  nom: string
  quartier: string
  gerant: string
  email: string
  motDePasse: string
  plan: PlanAbonnement
  palier: PalierAbonnement
  montant: number
}) {
  const maintenant = new Date()
  return muterBdd((bdd) => {
    const restaurant: Restaurant = {
      id: nouveauId('r'),
      nom: input.nom,
      quartier: input.quartier,
      gerant: input.gerant,
      actif: true,
      creeLe: dateIso(maintenant),
      // Payant et actif : jamais d'onboarding — l'accompagnement découverte
      // est réservé au mode découverte (et le défaut SQL `true` masque
      // déjà l'existant, fail-closed).
      onboarding_masque: true,
      onboarding_stats_consultees: false,
    }
    const admin: Utilisateur = {
      id: nouveauId('u'),
      email: input.email.trim().toLowerCase(),
      password_hash: hashSync(input.motDePasse, 10),
      nom: input.gerant,
      role: Role.RESTAURANT_ADMIN,
      restaurantId: restaurant.id,
      actif: true,
      permissions: [],
      creeLe: dateIso(maintenant),
    }
    const abonnement: Abonnement = {
      id: nouveauId('a'),
      restaurantId: restaurant.id,
      plan: input.plan,
      palier: input.palier,
      statut: 'actif',
      dateDebut: dateIso(maintenant),
      dateFin: dateDans(input.plan === 'annuel' ? 365 : 30),
      montant: input.montant,
    }
    bdd.restaurants.push(restaurant)
    bdd.utilisateurs.push(admin)
    bdd.abonnements.push(abonnement)
  })
}

/**
 * Auto-inscription depuis la vitrine : le restaurant, son compte gérant et
 * un abonnement en MODE DÉCOUVERTE (statut `decouverte`, montant 0,
 * découverte_actions_restantes = 3) sont créés d'un seul geste.
 * Renvoie l'admin créé pour que la route d'inscription puisse signer la
 * session immédiatement (aucune étape de connexion séparée).
 */
export async function creerRestaurantEnDecouverte(input: {
  nom: string
  quartier: string
  gerant: string
  email: string
  motDePasse: string
}) {
  const maintenant = new Date()
  let cree: { admin: Utilisateur; restaurant: Restaurant } | null = null
  await muterBdd((bdd) => {
    const restaurant: Restaurant = {
      id: nouveauId('r'),
      nom: input.nom,
      quartier: input.quartier,
      gerant: input.gerant,
      actif: true,
      creeLe: dateIso(maintenant),
      // UNIQUE point de naissance de l'onboarding (Sprint 5) : un compte
      // découverte arrive avec `onboarding_masque: false` — partout
      // ailleurs le défaut `true` garde l'existant invisible. Ne jamais
      // forcer `false` depuis un autre chemin.
      onboarding_masque: false,
      onboarding_stats_consultees: false,
    }
    const admin: Utilisateur = {
      id: nouveauId('u'),
      email: input.email.trim().toLowerCase(),
      password_hash: hashSync(input.motDePasse, 10),
      nom: input.gerant,
      role: Role.RESTAURANT_ADMIN,
      restaurantId: restaurant.id,
      actif: true,
      permissions: [],
      creeLe: dateIso(maintenant),
    }
    const abonnement: Abonnement = {
      id: nouveauId('a'),
      restaurantId: restaurant.id,
      plan: 'mensuel',
      statut: 'decouverte',
      // Échéance lointaine : jamais vérifiée en découverte (illimitée dans
      // le temps) — le type exige une chaîne, on garde une compatibilité.
      dateDebut: dateIso(maintenant),
      dateFin: dateDans(3650),
      montant: 0,
      decouverteActionsRestantes: 3,
    }
    bdd.restaurants.push(restaurant)
    bdd.utilisateurs.push(admin)
    bdd.abonnements.push(abonnement)
    cree = { admin, restaurant }
  })
  return cree!
}

/**
 * Compteur d'actions de découverte restantes d'un restaurant — lu FRAIS
 * (mutation sans écriture), `null` si l'abonnement n'est pas en découverte.
 */
export async function decouverteActionsRestantes(
  restaurantId: string,
): Promise<number | null> {
  let restantes: number | null = null
  await muterBdd((bdd) => {
    const abonnement = bdd.abonnements
      .filter((a) => a.restaurantId === restaurantId)
      .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0]
    if (!abonnement || abonnement.statut !== 'decouverte') return
    restantes = abonnement.decouverteActionsRestantes ?? 3
  })
  return restantes
}

/**
 * Consomme une action de découverte (décrément atomique dans la mutation) :
 * ne passe jamais sous 0. Refuse si le compteur est déjà épuisé ou si
 * l'abonnement n'est pas en découverte.
 */
export async function consommerActionDecouverte(restaurantId: string): Promise<
  { ok: true; restantes: number } | { ok: false }
> {
  let resultat: { ok: true; restantes: number } | { ok: false } = { ok: false }
  await muterBdd((bdd) => {
    const abonnement = bdd.abonnements
      .filter((a) => a.restaurantId === restaurantId)
      .sort((a, b) => b.dateFin.localeCompare(a.dateFin))[0]
    if (!abonnement || abonnement.statut !== 'decouverte') return
    const restantes = abonnement.decouverteActionsRestantes ?? 3
    if (restantes <= 0) return
    abonnement.decouverteActionsRestantes = restantes - 1
    resultat = { ok: true, restantes: restantes - 1 }
  })
  return resultat
}

/**
 * Onboarding (Sprint 5) : bascule le masquage du parcours pour un
 * restaurant. Les deux sorties permanentes (« Je connais déjà » et
 * « Ne plus afficher ») passent ici — et uniquement ici. Ne jamais
 * réactiver le parcours pour un compte payant : hors découverte, rien
 * ne doit rouvrir le guide.
 */
export async function marquerOnboardingMasque(
  restaurantId: string,
  masque: boolean,
) {
  await muterBdd((bdd) => {
    const restaurant = bdd.restaurants.find((r) => r.id === restaurantId)
    if (restaurant) restaurant.onboarding_masque = masque
  })
}

/**
 * Étape 5 du parcours : les stats ont-elles été consultées ? Seule étape
 * non déductible des données (déclencheur : la visite réelle de la page
 * Pilotage, signalée par le client — jamais auto-déclarée à la volée).
 */
export async function marquerPilotageConsulte(restaurantId: string) {
  await muterBdd((bdd) => {
    const restaurant = bdd.restaurants.find((r) => r.id === restaurantId)
    if (restaurant) restaurant.onboarding_stats_consultees = true
  })
}

/**
 * Crée un membre du personnel (STAFF) rattaché au restaurant de la gérante.
 * VERROU DE PALIER (limite STAFF) : vérifié DANS la mutation (lecture-
 * modification-écriture sérialisée — deux créations quasi simultanées ne
 * peuvent pas passer toutes les deux). Grandfathering : seuls les comptes
 * ACTIFS comptent pour la limite, rien n'est désactivé rétroactivement.
 */
export async function creerPersonnel(input: {
  restaurantId: string
  nom: string
  email: string
  motDePasse: string
  permissions: Permission[]
}): Promise<{ ok: true; id: string } | { ok: false; raison: 'limite-staff' }> {
  let resultat: { ok: true; id: string } | { ok: false; raison: 'limite-staff' } = {
    ok: false,
    raison: 'limite-staff',
  }
  await muterBdd((bdd) => {
    const palier = palierEffectifBdd(bdd, input.restaurantId)
    const limite = PLANS_ABONNEMENT[palier].verrous.limiteStaff
    if (limite !== null) {
      const actifs = bdd.utilisateurs.filter(
        (u) =>
          u.role === Role.STAFF &&
          u.restaurantId === input.restaurantId &&
          u.actif,
      ).length
      if (actifs >= limite) return
    }
    const id = nouveauId('u')
    bdd.utilisateurs.push({
      id,
      email: input.email.trim().toLowerCase(),
      password_hash: hashSync(input.motDePasse, 10),
      nom: input.nom.trim(),
      role: Role.STAFF,
      restaurantId: input.restaurantId,
      actif: true,
      permissions: input.permissions,
      creeLe: dateIso(new Date()),
    })
    resultat = { ok: true, id }
  })
  return resultat
}

/**
 * Modifie un membre du personnel : nom, permissions, désactivation logique.
 * Ne touche jamais au rôle (un STAFF reste STAFF).
 */
export async function modifierPersonnel(input: {
  id: string
  nom?: string
  permissions?: Permission[]
  actif?: boolean
}) {
  return muterBdd((bdd) => {
    const cible = bdd.utilisateurs.find((u) => u.id === input.id)
    if (!cible) return
    if (input.nom !== undefined) cible.nom = input.nom.trim()
    if (input.permissions !== undefined) cible.permissions = input.permissions
    if (input.actif !== undefined) cible.actif = input.actif
  })
}

export async function reinitialiserMotDePasse(
  utilisateur: Utilisateur,
  motDePasse?: string,
) {
  const genere = motDePasse ?? genereMotDePasse()
  await muterBdd((bdd) => {
    const cible = bdd.utilisateurs.find((u) => u.id === utilisateur.id)
    if (cible) cible.password_hash = hashSync(genere, 10)
  })
  return genere
}

function genereMotDePasse() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let mot = ''
  for (let i = 0; i < 10; i++) {
    mot += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return mot + '!'
}

/** Demande de renouvellement : l'abonnement passe en attente, un paiement est enregistré. */
export async function demanderRenouvellement(input: {
  abonnement: Abonnement
  plan: PlanAbonnement
  palier: PalierAbonnement
  mode: ModePaiementAbonnement
  montant: number
}) {
  await muterBdd((bdd) => {
    const cible = bdd.abonnements.find((a) => a.id === input.abonnement.id)
    if (cible) {
      cible.plan = input.plan
      cible.palier = input.palier
      cible.montant = input.montant
      cible.statut = 'en_attente'
    }
    const restaurant = bdd.restaurants.find(
      (r) => r.id === input.abonnement.restaurantId,
    )
    bdd.paiements.unshift({
      id: nouveauId('p'),
      abonnementId: input.abonnement.id,
      restaurantId: input.abonnement.restaurantId,
      restaurantNom: restaurant?.nom ?? 'Restaurant',
      montant: input.montant,
      mode: input.mode,
      motif: 'Renouvellement abonnement',
      date: dateIso(new Date()),
    })
  })
}

/** Activation manuelle par le super admin (paiement confirmé ou geste manuel). */
export async function activerAbonnement(abonnement: Abonnement) {
  await muterBdd((bdd) => {
    const cible = bdd.abonnements.find((a) => a.id === abonnement.id)
    if (!cible) return
    const jours = cible.plan === 'annuel' ? 365 : 30
    cible.statut = 'actif'
    cible.dateDebut = dateIso(new Date())
    cible.dateFin = dateDans(jours)
  })
}

/* ------------------------- paiement automatique ------------------------- */

export async function lireParametresPaiement(): Promise<ParametresPaiement> {
  const bdd = await lireBdd()
  return bdd.parametresPaiement
}

/**
 * Sauvegarde de la configuration paiement. Les clés sont stockées en dur
 * côté serveur ; un champ vide signale « garder la valeur actuelle ».
 */
export async function sauverParametresPaiement(miseAJour: {
  numerosMobileMoney?: Partial<NumerosMobileMoney>
  naboopay?: { actif?: boolean; apiKey?: string; webhookSecret?: string }
}) {
  await muterBdd((bdd) => {
    if (miseAJour.numerosMobileMoney) {
      for (const [mode, numero] of Object.entries(
        miseAJour.numerosMobileMoney,
      ) as [keyof NumerosMobileMoney, string][]) {
        if (typeof numero === 'string') {
          bdd.parametresPaiement.numerosMobileMoney[mode] = numero.trim()
        }
      }
    }
    if (miseAJour.naboopay) {
      const n = miseAJour.naboopay
      if (n.actif !== undefined) {
        bdd.parametresPaiement.naboopay.actif = n.actif
      }
      if (typeof n.apiKey === 'string' && n.apiKey.trim()) {
        bdd.parametresPaiement.naboopay.apiKey = n.apiKey.trim()
      }
      if (typeof n.webhookSecret === 'string' && n.webhookSecret.trim()) {
        bdd.parametresPaiement.naboopay.webhookSecret = n.webhookSecret.trim()
      }
    }
  })
}

/** Enregistre une transaction agrégateur en attente de confirmation. */
export async function enregistrerTransactionPaiement(input: {
  orderId: string
  abonnement: Abonnement
  restaurantId: string
  plan: PlanAbonnement
  palier: PalierAbonnement
  montant: number
}) {
  await muterBdd((bdd) => {
    bdd.transactionsPaiement.unshift({
      id: nouveauId('tx'),
      fournisseur: 'naboopay',
      orderId: input.orderId,
      abonnementId: input.abonnement.id,
      restaurantId: input.restaurantId,
      plan: input.plan,
      palier: input.palier,
      montant: input.montant,
      statut: 'pending',
      creeLe: dateIso(new Date()),
    })
  })
}

export async function trouverTransactionPaiementParOrderId(orderId: string) {
  const bdd = await lireBdd()
  return (
    bdd.transactionsPaiement.find((t) => t.orderId === orderId) ?? null
  )
}

/**
 * Démarre un renouvellement automatique : l'abonnement passe en attente
 * dès la création de la transaction (comme le flux manuel), sans rien
 * encaisser — la confirmation vient du webhook.
 */
export async function demarrerRenouvellementAutomatique(input: {
  abonnement: Abonnement
  plan: PlanAbonnement
  palier: PalierAbonnement
  montant: number
}) {
  await muterBdd((bdd) => {
    const cible = bdd.abonnements.find((a) => a.id === input.abonnement.id)
    if (cible) {
      cible.plan = input.plan
      cible.palier = input.palier
      cible.montant = input.montant
      cible.statut = 'en_attente'
    }
  })
}

const LIBELLE_METHODE_NABOOPAY: Record<string, ModePaiementAbonnement> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  free_money: 'Free Money',
}

/**
 * Confirmation webhook (signature vérifiée) : active l'abonnement,
 * marque la transaction payée et enregistre le paiement dans l'historique
 * du super admin — le tout en une seule mutation.
 */
export async function confirmerRenouvellementAutomatique(input: {
  transaction: TransactionPaiement
  methode?: string
  frais?: number
}) {
  await muterBdd((bdd) => {
    const tx = bdd.transactionsPaiement.find(
      (t) => t.id === input.transaction.id,
    )
    if (tx && tx.statut === 'pending') {
      tx.statut = 'paid'
      tx.payeLe = dateIso(new Date())
      tx.methode = input.methode
      tx.frais = input.frais
    }
    const abonnement = bdd.abonnements.find(
      (a) => a.id === input.transaction.abonnementId,
    )
    if (abonnement) {
      const jours = abonnement.plan === 'annuel' ? 365 : 30
      abonnement.statut = 'actif'
      abonnement.dateDebut = dateIso(new Date())
      abonnement.dateFin = dateDans(jours)
    }
    const restaurant = bdd.restaurants.find(
      (r) => r.id === input.transaction.restaurantId,
    )
    bdd.paiements.unshift({
      id: nouveauId('p'),
      abonnementId: input.transaction.abonnementId,
      restaurantId: input.transaction.restaurantId,
      restaurantNom: restaurant?.nom ?? 'Restaurant',
      montant: input.transaction.montant,
      mode:
        LIBELLE_METHODE_NABOOPAY[input.methode ?? ''] ??
        ('Wave' as ModePaiementAbonnement),
      motif: 'Renouvellement automatique (NabooPay)',
      date: dateIso(new Date()),
    })
  })
}

/** Annulation/remboursement notifié par webhook : la transaction et l'abonnement redeviennent expirés. */
export async function annulerRenouvellementAutomatique(transaction: TransactionPaiement) {
  await muterBdd((bdd) => {
    const tx = bdd.transactionsPaiement.find((t) => t.id === transaction.id)
    if (tx && tx.statut === 'pending') tx.statut = 'cancelled'
    const abonnement = bdd.abonnements.find(
      (a) => a.id === transaction.abonnementId,
    )
    if (abonnement && abonnement.statut === 'en_attente') {
      abonnement.statut = 'expire'
    }
  })
}

/** Journal des webhooks — garde les 100 derniers reçus (même rejetés). */
export async function journaliserWebhook(entree: {
  signatureValide: boolean
  statut: WebhookJournal['statut']
  ordreId?: string
  detail?: string
  corps: string
}) {
  await muterBdd((bdd) => {
    bdd.webhooksPaiement.unshift({
      id: nouveauId('w'),
      fournisseur: 'naboopay',
      recuLe: dateIso(new Date()),
      signatureValide: entree.signatureValide,
      statut: entree.statut,
      ordreId: entree.ordreId,
      detail: entree.detail,
      corps: entree.corps.slice(0, 2000),
    })
    if (bdd.webhooksPaiement.length > 100) {
      bdd.webhooksPaiement.length = 100
    }
  })
}

export async function suspendreAbonnement(abonnement: Abonnement) {
  await muterBdd((bdd) => {
    const cible = bdd.abonnements.find((a) => a.id === abonnement.id)
    if (cible) cible.statut = 'expire'
  })
}

/**
 * Enregistre une commande passée par un client et crédite sa Carte de
 * Fidélité. Le compteur est incrémenté de façon ATOMIQUE côté SQL
 * (RPC `incrementer_compteur`, UPDATE ... RETURNING) : deux requêtes
 * concurrentes reçoivent des valeurs distinctes — pas de race condition,
 * y compris entre instances serverless.
 */
export async function enregistrerCommandeClient(input: {
  clientId: string
  clientNom: string
  restaurantId: string
  lignes: { platId: string; nom: string; prix: number; qte: number }[]
  total: number
}) {
  let ref = ''
  let pointsGagnes = 0
  await muterBdd(async (bdd) => {
    const { data: valeur, error: erreurCompteur } = await supabase.rpc(
      'incrementer_compteur',
      { p_cle: 'commandes' },
    )
    if (erreurCompteur || typeof valeur !== 'number') {
      logger('bdd', 'erreur', 'Compteur de commandes inaccessible', {
        detail: erreurCompteur ? erreurCompteur.message : 'valeur non numérique',
      })
      throw new Error('Compteur de commandes indisponible.')
    }
    bdd.compteurCommandes = valeur
    ref = `ALB-${valeur}`
    bdd.commandesClients.unshift({
      id: nouveauId('c'),
      ref,
      clientId: input.clientId,
      clientNom: input.clientNom,
      restaurantId: input.restaurantId,
      lignes: input.lignes,
      total: input.total,
      creeA: dateIso(new Date()),
    })
    const fiche = bdd.fidelite.find((f) => f.userId === input.clientId)
    if (fiche) {
      pointsGagnes = Math.floor(input.total / 100)
      fiche.points += pointsGagnes
      fiche.visites += 1
      fiche.panierMoyen = Math.round(
        (fiche.panierMoyen * (fiche.visites - 1) + input.total) / fiche.visites,
      )
    }
  })
  return { ref, pointsGagnes }
}
