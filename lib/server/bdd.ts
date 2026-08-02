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
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { hashSync } from 'bcryptjs'
import {
  DUREE_ESSAI_JOURS,
  Permission,
  Role,
  dateDans,
  dateIso,
  estAbonnementAccessible,
  nouveauId,
  type Abonnement,
  type CommandeClient,
  type FideliteClient,
  type ModePaiementAbonnement,
  type Paiement,
  type PlanAbonnement,
  type Restaurant,
  type StatutAbonnement,
  type Utilisateur,
} from '@/lib/auth'

const FICHIER = path.join(process.cwd(), 'data', 'alba-bdd.json')

export type Bdd = {
  version: number
  restaurants: Restaurant[]
  utilisateurs: Utilisateur[]
  abonnements: Abonnement[]
  paiements: Paiement[]
  fidelite: FideliteClient[]
  commandesClients: CommandeClient[]
  compteurCommandes: number
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
      statut: 'actif',
      dateDebut: ilYAJours(20),
      // Expire dans ~17 jours : la bannière « bientôt l'échéance » s'affiche.
      dateFin: dateDans(17),
      montant: 25_000,
    },
    {
      id: 'a2',
      restaurantId: 'r2',
      plan: 'mensuel',
      statut: 'expire',
      dateDebut: ilYAJours(55),
      dateFin: ilYAJours(5),
      montant: 25_000,
    },
    {
      id: 'a3',
      restaurantId: 'r3',
      plan: 'annuel',
      statut: 'actif',
      dateDebut: ilYAJours(30),
      dateFin: dateDans(182),
      montant: 250_000,
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
    version: 1,
    restaurants,
    utilisateurs,
    abonnements,
    paiements,
    fidelite,
    commandesClients: [],
    compteurCommandes: 400,
  }
}

/**
 * Pas de cache en mémoire : le proxy (Next 16) est bundlé séparément des
 * routes API — un cache partagé serait incohérent. Le fichier est petit
 * (quelques Ko) et le disque local est rapide : chaque lecture est fraîche.
 */
export async function lireBdd(): Promise<Bdd> {
  try {
    const brut = await readFile(FICHIER, 'utf-8')
    const bdd = JSON.parse(brut) as Bdd
    return normaliserBdd(bdd)
  } catch {
    const initiale = bddInitiale()
    await sauverBdd(initiale)
    return initiale
  }
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
 */
function normaliserBdd(bdd: Bdd): Bdd {
  bdd.version = 2
  bdd.utilisateurs = bdd.utilisateurs.map((u) => ({
    ...u,
    actif: u.actif !== undefined ? u.actif : true,
    permissions: Array.isArray(u.permissions) ? u.permissions : [],
    role: u.role ?? Role.CLIENT,
  }))
  return bdd
}

export async function sauverBdd(bdd: Bdd) {
  await mkdir(path.dirname(FICHIER), { recursive: true })
  await writeFile(FICHIER, JSON.stringify(bdd, null, 2), 'utf-8')
}

/** Met à jour la base par mutation puis l'enregistre. */
export async function muterBdd(
  fn: (bdd: Bdd) => void | Promise<void>,
): Promise<Bdd> {
  const bdd = await lireBdd()
  await fn(bdd)
  await sauverBdd(bdd)
  return bdd
}

/* ------------------------------- lectures --------------------------------- */

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
 */
export async function creerPersonnel(input: {
  restaurantId: string
  nom: string
  email: string
  motDePasse: string
  permissions: Permission[]
}) {
  const maintenant = new Date()
  return muterBdd((bdd) => {
    bdd.utilisateurs.push({
      id: nouveauId('u'),
      email: input.email.trim().toLowerCase(),
      password_hash: hashSync(input.motDePasse, 10),
      nom: input.nom.trim(),
      role: Role.STAFF,
      restaurantId: input.restaurantId,
      actif: true,
      permissions: input.permissions,
      creeLe: dateIso(maintenant),
    })
  })
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
  mode: ModePaiementAbonnement
  montant: number
}) {
  await muterBdd((bdd) => {
    const cible = bdd.abonnements.find((a) => a.id === input.abonnement.id)
    if (cible) {
      cible.plan = input.plan
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
