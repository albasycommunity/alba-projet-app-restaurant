/**
 * Modèle de données du système d'authentification et de rôles.
 * Types partagés entre le serveur (proxy, routes API, store) et le client.
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  CLIENT = 'CLIENT',
}

/** Libellés français, pour l'affichage. */
export const LIBELLES_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super admin',
  [Role.RESTAURANT_ADMIN]: 'Admin restaurant',
  [Role.CLIENT]: 'Client',
}

/** Où chaque rôle est renvoyé après connexion. */
export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/super-admin',
  [Role.RESTAURANT_ADMIN]: '/back-office',
  [Role.CLIENT]: '/',
}

/** Zones accessibles à chaque rôle — pour valider un `suivant` au login. */
const ZONES_PAR_ROLE: Record<Role, string[]> = {
  [Role.SUPER_ADMIN]: ['/super-admin'],
  [Role.RESTAURANT_ADMIN]: [
    '/back-office',
    '/pilotage',
    '/caisse',
    '/cuisine',
    '/stock',
    '/hygiene',
    '/equipe',
    '/clients',
    '/abonnement',
  ],
  [Role.CLIENT]: ['/'],
}

/**
 * Destination après connexion : honore le paramètre `suivant` uniquement
 * si la cible est réellement accessible au rôle — jamais un chemin
 * arbitraire (le proxy re-vérifie de toute façon).
 */
export function destinationPour(role: Role, suivant?: string | null): string {
  if (
    typeof suivant === 'string' &&
    suivant.startsWith('/') &&
    !suivant.startsWith('//') &&
    !suivant.includes(':') &&
    ZONES_PAR_ROLE[role].some((z) =>
      z === '/' ? suivant === '/' : suivant.startsWith(z),
    )
  ) {
    return suivant
  }
  return ACCUEIL_PAR_ROLE[role]
}

export type PlanAbonnement = 'mensuel' | 'annuel'

/**
 * Statut d'un abonnement. `essai` est le cycle de découverte : 15 jours
 * d'accès complet, sans paiement. À échéance, l'accès se bloque (voir
 * `estAbonnementAccessible`) et le gérant bascule vers son plan payant.
 */
export type StatutAbonnement = 'actif' | 'essai' | 'expire' | 'en_attente'

/** Durée de l'essai gratuit accordée à chaque nouveau plan. */
export const DUREE_ESSAI_JOURS = 15

export const LIBELLES_STATUT: Record<StatutAbonnement, string> = {
  actif: 'Actif',
  essai: 'Essai gratuit',
  expire: 'Expiré',
  en_attente: 'Paiement en attente',
}

/** Offres d'abonnement : le chef paie le super admin pour accéder à son back-office. */
export const PLANS_ABONNEMENT: Record<
  PlanAbonnement,
  { libelle: string; montant: number; jours: number; detail: string }
> = {
  mensuel: {
    libelle: 'Mensuel',
    montant: 25_000,
    jours: 30,
    detail: '25 000 F / mois — sans engagement',
  },
  annuel: {
    libelle: 'Annuel',
    montant: 250_000,
    jours: 365,
    detail: '250 000 F / an — 2 mois offerts',
  },
}

export type ModePaiementAbonnement =
  | 'Wave'
  | 'Orange Money'
  | 'Free Money'
  | 'Espèces'

export const MODES_PAIEMENT_ABONNEMENT: {
  mode: ModePaiementAbonnement
  numero: string
}[] = [
  { mode: 'Wave', numero: '+221 77 123 45 67' },
  { mode: 'Orange Money', numero: '+221 78 123 45 67' },
  { mode: 'Free Money', numero: '+221 76 123 45 67' },
]

export type Restaurant = {
  id: string
  nom: string
  quartier: string
  gerant: string
  actif: boolean
  creeLe: string
}

/**
 * Table `users`. Le mot de passe n'est jamais stocké en clair :
 * `password_hash` est un hash bcrypt.
 */
export type Utilisateur = {
  id: string
  email: string
  password_hash: string
  nom: string
  role: Role
  /** Rempli seulement pour un RESTAURANT_ADMIN — scope ses accès à son restaurant. */
  restaurantId: string | null
  actif: boolean
  creeLe: string
}

/** Ce qui est exposé au client (jamais le hash). */
export type SessionUtilisateur = {
  id: string
  email: string
  nom: string
  role: Role
  restaurantId: string | null
}

export type Abonnement = {
  id: string
  restaurantId: string
  plan: PlanAbonnement
  statut: StatutAbonnement
  dateDebut: string
  dateFin: string
  montant: number
}

/**
 * Garde d'accès au back-office (utilisée par le proxy et chaque route API) :
 * - « actif » : accès complet.
 * - « essai » : accès complet tant que l'échéance des 15 jours n'est pas
 *   atteinte — ensuite, le blocage est automatique et le gérant bascule
 *   vers le renouvellement (plan payant).
 * - « expire » / « en_attente » : accès coupé.
 *
 * Point de blocage APRÈS l'essai : rien d'autre à changer — `verifierAccesRestaurant`
 * renvoie `abonnementActif: false`, le proxy redirige vers /abonnement/renouveler.
 * La relance, elle, vit dans l'écran Abonnement (bannière « essai restant »).
 */
export function estAbonnementAccessible(
  abonnement: Pick<Abonnement, 'statut' | 'dateFin'> | null,
  maintenant = new Date(),
) {
  if (!abonnement) return false
  if (abonnement.statut === 'actif') return true
  if (abonnement.statut === 'essai') {
    return new Date(abonnement.dateFin).getTime() >= maintenant.getTime()
  }
  return false
}

export type Paiement = {
  id: string
  abonnementId: string
  restaurantId: string
  restaurantNom: string
  montant: number
  mode: ModePaiementAbonnement
  motif: string
  date: string
}

/** Carte de Fidélité d'un client : points, visites, panier moyen. */
export type FideliteClient = {
  userId: string
  points: number
  visites: number
  panierMoyen: number
}

export type CommandeClient = {
  id: string
  ref: string
  clientId: string
  clientNom: string
  restaurantId: string
  lignes: { platId: string; nom: string; prix: number; qte: number }[]
  total: number
  creeA: string
}

export const NOM_COOKIE_SESSION = 'alba_session'

export function nouveauId(prefixe: string) {
  return `${prefixe}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`
}

export function joursRestants(dateFin: string, maintenant = new Date()) {
  const fin = new Date(dateFin).getTime()
  return Math.ceil((fin - maintenant.getTime()) / 86_400_000)
}

export function dateIso(d: Date) {
  return d.toISOString()
}

export function dateDans(jours: number, depuis = new Date()) {
  return dateIso(new Date(depuis.getTime() + jours * 86_400_000))
}
