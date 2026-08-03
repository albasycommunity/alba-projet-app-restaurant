/**
 * Couche de données serveur. En l'absence de base de données sur le projet,
 * la persistance se fait dans un fichier JSON (data/alba-bdd.json) créé et
 * seedé au premier accès. Les fonctions sont `server-only` : elles ne sont
 * jamais importées depuis le client.
 *
 * Remplaçable par une vraie base (Postgres, etc.) sans changer l'API des
 * routes : il suffit de réimplémenter les mêmes fonctions.
 */

import 'server-only'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { hashSync } from 'bcryptjs'
import {
  DUREE_ESSAI_JOURS,
  Permission,
  PLANS_ABONNEMENT,
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

const FICHIER = path.join(process.cwd(), 'data', 'alba-bdd.json')

/** Version du format de données. Bumpée à chaque migration de schéma. */
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

function bddInitiale(): Bdd {
  const maintenant = new Date()
  const ilYAJours = (n: number) =>
    dateIso(new Date(maintenant.getTime() - n * 86_400_000))

  const restaurants: Restaurant[] = [
    { id: 'r1', nom: 'Chez Fatou', quartier: 'Ngor, Dakar', gerant: 'Fatou Ndiaye', actif: true, creeLe: ilYAJours(220) },
    { id: 'r2', nom: 'Le Baobab Bleu', quartier: 'Pointe des Almadies', gerant: 'Gora Ndiaye', actif: true, creeLe: ilYAJours(140) },
    { id: 'r3', nom: 'Teranga Grill', quartier: 'Plateau, Dakar', gerant: 'Adama Ba', actif: true, creeLe: ilYAJours(65) },
  ]

  const utilisateurs: Utilisateur[] = COMPTES_DEMO.map((c) => ({
    id: nouveauId('u'),
    email: c.email,
    password_hash: hashSync(c.motDePasse, 10),
    nom: c.nom,
    role: c.role,
    restaurantId: c.restaurantId ?? null,
    actif: true,
    permissions: c.permissions ?? [],
    creeLe: ilYAJours(220),
  }))

  const abonnements: Abonnement[] = [
    {
      id: 'a1',
      restaurantId: 'r1',
      plan: 'mensuel',
      // Démo : Fatou a déjà une caissière ET un cuisinier → Pro.
      // (Le fichier existant sans `palier` résout Pro via palierDeRestaurant.)
      palier: 'pro',
      statut: 'actif',
      dateDebut: ilYAJours(20),
      // Expire dans ~17 jours : la bannière « bientôt l'échéance » s'affiche.
      dateFin: dateDans(17),
      montant: 35_000,
    },
    {
      id: 'a2',
      restaurantId: 'r2',
      plan: 'mensuel',
      palier: 'starter',
      statut: 'expire',
      dateDebut: ilYAJours(55),
      dateFin: ilYAJours(5),
      montant: 15_000,
    },
    {
      id: 'a3',
      restaurantId: 'r3',
      plan: 'annuel',
      palier: 'starter',
      statut: 'actif',
      dateDebut: ilYAJours(30),
      dateFin: dateDans(182),
      montant: 150_000,
    },
  ]

  const paiements: Paiement[] = [
    { id: nouveauId('p'), abonnementId: 'a1', restaurantId: 'r1', restaurantNom: 'Chez Fatou', montant: 25_000, mode: 'Wave', motif: 'Abonnement mensuel', date: ilYAJours(20) },
    { id: nouveauId('p'), abonnementId: 'a3', restaurantId: 'r3', restaurantNom: 'Teranga Grill', montant: 250_000, mode: 'Orange Money', motif: 'Abonnement annuel', date: ilYAJours(30) },
    { id: nouveauId('p'), abonnementId: 'a1', restaurantId: 'r1', restaurantNom: 'Chez Fatou', montant: 25_000, mode: 'Wave', motif: 'Abonnement mensuel', date: ilYAJours(50) },
    { id: nouveauId('p'), abonnementId: 'a2', restaurantId: 'r2', restaurantNom: 'Le Baobab Bleu', montant: 25_000, mode: 'Free Money', motif: 'Abonnement mensuel', date: ilYAJours(55) },
  ]

  const fidelite: FideliteClient[] = utilisateurs
    .filter((u) => u.role === Role.CLIENT)
    .map((u) => {
      const seed = COMPTES_DEMO.find((c) => c.email === u.email)
      return {
        userId: u.id,
        points: seed?.fidelite?.points ?? 0,
        visites: seed?.fidelite?.visites ?? 0,
        panierMoyen: seed?.fidelite?.panierMoyen ?? 0,
      }
    })

  return {
    version: VERSION_BDD,
    restaurants,
    utilisateurs,
    abonnements,
    paiements,
    fidelite,
    commandesClients: [],
    compteurCommandes: 400,
    parametresPaiement: parametresPaiementParDefaut(),
    transactionsPaiement: [],
    webhooksPaiement: [],
  }
}

/**
 * Cache mémoire — la lecture disque + JSON.parse par requête (proxy inclus,
 * qui fait 2 à 3 lectures à chaque page) est le premier goulot de montée en
 * charge. Le store est un fichier JSON : tant que l'on reste sur une seule
 * instance, le cache garde la cohérence avec des règles simples :
 *
 * - Le bundle des routes API ÉCRIT : le cache y est invalidé en
 *   write-through (toute écriture incrémente `versionEcritures` et
 *   remplace l'objet caché). Une lecture voit donc toujours l'état le
 *   plus récent, sans lire le disque.
 * - Le bundle proxy (Next 16 est bundlé séparément) ne fait que LIRE :
 *   il vit sur son propre cache, rafraîchi au plus après `ttlMs`
 *   (configuré par le proxy via configurerCacheBdd). Staleness bornée.
 * - `ttlMs` sert aussi de filet de sécurité entre instances distinctes
 *   (PM2 cluster, plusieurs pods) : une écriture faite ailleurs est vue
 *   au plus tard après `ttlMs`.
 *
 * RÈGLE D'OR conservée : une lecture n'écrit JAMAIS sur le disque à
 * chaque appel. Le disque n'est touché QUE lorsque les données ont
 * réellement changé (migration une fois, seed une fois par processus).
 */
type CacheBdd = {
  bdd: Bdd
  version: number
  chargeA: number
}

let cache: CacheBdd | null = null
let chargementEnCours: Promise<Bdd> | null = null
/** Incrémenté à chaque écriture réussie (write-through du bundle routes). */
let versionEcritures = 0
/** Routes : fraîcheur immédiate. Proxy : TTL court. */
let ttlCacheMs = 1_000

/** Fixe la durée de vie du cache (appelé par le proxy, bundle lecture seule). */
export function configurerCacheBdd({ ttlMs }: { ttlMs: number }) {
  if (ttlMs >= 0) ttlCacheMs = ttlMs
  cache = null
}

/** Créé au maximum UNE fois par processus (seed du fichier absent/corrompu). */
let fichierReinitialiseCeProcessus = false

async function seedMemoire(): Promise<Bdd> {
  const initiale = bddInitiale()
  if (!fichierReinitialiseCeProcessus) {
    // Une seule tentative par processus, quel que soit le résultat :
    // jamais d'écriture répétée à chaque requête.
    fichierReinitialiseCeProcessus = true
    await sauverBdd(initiale).catch(() => {
      // Échec (permissions, verrou…) : on continue en mémoire.
    })
  }
  return initiale
}

async function chargerDepuisDisque(): Promise<Bdd> {
  let brut: string
  try {
    brut = await readFile(FICHIER, 'utf-8')
  } catch {
    // Fichier absent ou illisible : seed en mémoire, recréé UNE fois.
    return seedMemoire()
  }
  let bdd: Partial<Bdd>
  try {
    bdd = JSON.parse(brut) as Partial<Bdd>
  } catch {
    // JSON corrompu : on ne détruit jamais les données, seed en mémoire.
    return seedMemoire()
  }
  if (
    !Array.isArray(bdd.utilisateurs) ||
    !Array.isArray(bdd.restaurants)
  ) {
    // Fichier inutilisable (ex. `{}` ou tronqué) : seed en mémoire.
    return seedMemoire()
  }
  const normalisee = normaliserBdd(bdd as Bdd)
  if (normalisee !== bdd) {
    // Migration de schéma détectée : une SEULE écriture, pas à chaque lecture.
    await sauverBdd(normalisee).catch(() => {
      // Échec d'écriture : la normalisation reste valable en mémoire.
    })
  }
  return normalisee
}

export async function lireBdd(): Promise<Bdd> {
  if (cache) {
    const coherent = cache.version === versionEcritures
    const dansTtl = Date.now() - cache.chargeA < ttlCacheMs
    if (coherent && dansTtl) return cache.bdd
  }
  if (!chargementEnCours) {
    chargementEnCours = chargerDepuisDisque().finally(() => {
      chargementEnCours = null
    })
  }
  const bdd = await chargementEnCours
  cache = { bdd, version: versionEcritures, chargeA: Date.now() }
  return bdd
}

/**
 * Compatibilité ascendante — CORRECTION du bug « impossible de se
 * connecter à un compte existant » : les comptes créés avant
 * l'introduction de `actif` / `permissions` ne portent pas ces champs.
 * La lecture les ramène à leurs valeurs par défaut sûres au lieu de les
 * traiter comme « désactivés » ou « sans droits » :
 *   - actif absent      → true  (un compte n'est jamais désactivé par défaut)
 *   - permissions absent → []   (un STAFF sans champ reçoit zéro permission,
 *                                jamais un accès accordé par défaut)
 *
 * Immutabilité : si rien ne doit changer, la même référence est renvoyée
 * (aucune écriture). Une migration produit un NOUVEL objet — c'est elle
 * que lireBdd() persiste, une seule fois.
 */
function normaliserBdd(bdd: Bdd): Bdd {
  if (bdd.version === VERSION_BDD) return bdd

  const utilisateurs = bdd.utilisateurs.map((u) => ({
    ...u,
    actif: u.actif !== undefined ? u.actif : true,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    role: u.role ?? Role.CLIENT,
  }))
  const parametresPaiement: ParametresPaiement = {
    ...parametresPaiementParDefaut(),
    ...(bdd.parametresPaiement ?? {}),
    numerosMobileMoney: {
      ...parametresPaiementParDefaut().numerosMobileMoney,
      ...(bdd.parametresPaiement?.numerosMobileMoney ?? {}),
    },
    naboopay: {
      ...parametresPaiementParDefaut().naboopay,
      ...(bdd.parametresPaiement?.naboopay ?? {}),
    },
  }
  return {
    ...bdd,
    version: VERSION_BDD,
    utilisateurs,
    parametresPaiement,
    transactionsPaiement: Array.isArray(bdd.transactionsPaiement)
      ? bdd.transactionsPaiement
      : [],
    webhooksPaiement: Array.isArray(bdd.webhooksPaiement)
      ? bdd.webhooksPaiement
      : [],
  }
}

/**
 * Écriture ATOMIQUE : on écrit d'abord un fichier temporaire puis on le
 * déplace par-dessus le vrai fichier. Un plantage en plein écriture ne
 * peut plus laisser de JSON tronqué (le fichier principal n'est jamais
 * touché en place). Sur Windows, le remplacement peut échouer si la cible
 * existe : on supprime puis on renomme (fenêtre minuscule, le fichier
 * temporaire garantit que la donnée n'est pas perdue).
 */
export async function sauverBdd(bdd: Bdd) {
  await mkdir(path.dirname(FICHIER), { recursive: true })
  const temporaire = `${FICHIER}.tmp`
  await writeFile(temporaire, JSON.stringify(bdd, null, 2), 'utf-8')
  try {
    await rename(temporaire, FICHIER)
  } catch (err) {
    if (process.platform !== 'win32') throw err
    await rm(FICHIER, { force: true })
    await rename(temporaire, FICHIER)
  }
  // Write-through : les lectures suivantes du même processus voient
  // immédiatement le nouvel état sans repasser par le disque.
  versionEcritures += 1
  cache = { bdd, version: versionEcritures, chargeA: Date.now() }
}

/**
 * File d'attente des mutations : le fichier JSON n'offre pas de verrou
 * natif — deux mutations quasi simultanées (ex. deux créations de STAFF en
 * parallèle) pourraient toutes deux lire le même état puis écraser l'autre.
 * La sérialisation garantit une lecture-modification-écriture atomique.
 */
let chaineEcriture: Promise<unknown> = Promise.resolve()

function serialiser<T>(fn: () => Promise<T>): Promise<T> {
  const suivant = chaineEcriture.then(fn, fn)
  chaineEcriture = suivant.catch(() => undefined)
  return suivant
}

/** Met à jour la base par mutation puis l'enregistre. */
export async function muterBdd(
  fn: (bdd: Bdd) => void | Promise<void>,
): Promise<Bdd> {
  return serialiser(async () => {
    const bdd = await lireBdd()
    await fn(bdd)
    await sauverBdd(bdd)
    return bdd
  })
}

/** Métadonnées du store, pour le point de santé / observabilité. */
export async function etatDuStore() {
  const bdd = await lireBdd()
  return {
    version: bdd.version,
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
 * - l'enregistrement d'abonnement fait foi (`palier` écrit lors du
 *   renouvellement / de l'inscription) — anti-escalade : jamais de valeur
 *   envoyée par le client ;
 * - abonnement absent ou `palier` absent (comptes antérieurs à la Phase 4)
 *   → défaut à la lecture, SANS AUCUNE ÉCRITURE DISQUE (une vérification
 *   reste une lecture pure) ;
 * - fail-closed : défaut Starter, sauf exception démo explicite
 *   (chef@chezfatou.sn → Pro, cohérent avec ses 2 comptes STAFF déjà
 *   actifs — le grandfatering doit pouvoir s'appuyer dessus sans blocage).
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
 * accessible (payé « actif » ou essai en cours de validité).
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
 * un abonnement en ESSAI GRATUIT (DUREE_ESSAI_JOURS jours, montant 0) sont
 * créés d'un seul geste. Le plan choisi sur la landing est conservé : la
 * bascule vers le payant se fait via le flux de renouvellement existant.
 */
export async function creerRestaurantEnEssai(input: {
  nom: string
  quartier: string
  gerant: string
  email: string
  motDePasse: string
  plan: PlanAbonnement
  palier: PalierAbonnement
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
      statut: 'essai',
      dateDebut: dateIso(maintenant),
      dateFin: dateDans(DUREE_ESSAI_JOURS),
      montant: 0,
    }
    bdd.restaurants.push(restaurant)
    bdd.utilisateurs.push(admin)
    bdd.abonnements.push(abonnement)
  })
}

/**
 * Crée un membre du personnel (STAFF) rattaché au restaurant de la gérante.
 * Le rôle, le restaurant et les permissions sont déterminés côté serveur :
 * jamais de champ `role` ou `permissions` accepté depuis le client.
 *
 * VERROU DE PALIER (limite STAFF) : vérifié DANS la mutation (lecture-
 * modification-écriture sérialisée — deux créations quasi simultanées ne
 * peuvent pas passer toutes les deux). Grandfathering : seuls les comptes
 * ACTIFS comptent pour la limite, et rien n'est jamais désactivé
 * rétroactivement — la limite ne s'applique qu'aux nouvelles créations.
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
 * côté serveur ; un champ vide signale « garder la valeur actuelle » —
 * l'UI n'envoie jamais une clé reçue du serveur (elle n'en reçoit jamais).
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
      // Le palier a déjà été posé sur l'abonnement au démarrage de la
      // transaction : la confirmation ne fait qu'activer.
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

/** Enregistre une commande passée par un client et crédite sa Carte de Fidélité. */
export async function enregistrerCommandeClient(input: {
  clientId: string
  clientNom: string
  restaurantId: string
  lignes: { platId: string; nom: string; prix: number; qte: number }[]
  total: number
}) {
  let ref = ''
  let pointsGagnes = 0
  await muterBdd((bdd) => {
    bdd.compteurCommandes += 1
    ref = `ALB-${bdd.compteurCommandes}`
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
