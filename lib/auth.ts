/**
 * Modèle de données du système d'authentification et de rôles.
 * Types partagés entre le serveur (proxy, routes API, store) et le client.
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  RESTAURANT_ADMIN = 'RESTAURANT_ADMIN',
  STAFF = 'STAFF',
  CLIENT = 'CLIENT',
}

/**
 * Zones métier du back-office. Un compte STAFF n'a accès qu'aux zones
 * cochées par sa gérante — jamais aux autres, jamais à la facturation.
 *
 * Matrice permission → zone (source de vérité, utilisée par proxy.ts,
 * exigerPermission, la navigation et l'interface de gestion du personnel) :
 *
 * | Permission | Zone         | Onglet            |
 * |------------|--------------|-------------------|
 * | CAISSE     | /caisse      | Caisse            |
 * | CUISINE    | /cuisine     | Cuisine           |
 * | STOCK      | /stock       | Stock             |
 * | HYGIENE    | /hygiene     | Hygiène           |
 * | EQUIPE     | /equipe      | Équipe            |
 * | CLIENTS    | /clients     | Clients           |
 * | PILOTAGE   | /pilotage    | Pilotage          |
 *
 * Les zones d'administration (/back-office) et de facturation (/abonnement)
 * n'ont AUCUNE permission associée : elles sont réservées au
 * RESTAURANT_ADMIN, qui voit tout par construction.
 */
export enum Permission {
  CAISSE = 'caisse',
  CUISINE = 'cuisine',
  STOCK = 'stock',
  HYGIENE = 'hygiene',
  EQUIPE = 'equipe',
  CLIENTS = 'clients',
  PILOTAGE = 'pilotage',
}

/** Libellés français, pour l'affichage. */
export const LIBELLES_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Super admin',
  [Role.RESTAURANT_ADMIN]: 'Admin restaurant',
  [Role.STAFF]: 'Personnel',
  [Role.CLIENT]: 'Client',
}

/** Libellés français des permissions, pour l'interface de gestion. */
export const LIBELLES_PERMISSION: Record<Permission, string> = {
  [Permission.CAISSE]: 'Caisse',
  [Permission.CUISINE]: 'Cuisine',
  [Permission.STOCK]: 'Stock',
  [Permission.HYGIENE]: 'Hygiène',
  [Permission.EQUIPE]: 'Équipe',
  [Permission.CLIENTS]: 'Clients',
  [Permission.PILOTAGE]: 'Pilotage',
}

/** Toutes les permissions, dans l'ordre d'affichage de l'interface. */
export const TOUTES_LES_PERMISSIONS: Permission[] = [
  Permission.CAISSE,
  Permission.CUISINE,
  Permission.STOCK,
  Permission.HYGIENE,
  Permission.EQUIPE,
  Permission.CLIENTS,
  Permission.PILOTAGE,
]

/** Zone (chemin) couverte par chaque permission. */
export const ZONE_PAR_PERMISSION: Record<Permission, string> = {
  [Permission.CAISSE]: '/caisse',
  [Permission.CUISINE]: '/cuisine',
  [Permission.STOCK]: '/stock',
  [Permission.HYGIENE]: '/hygiene',
  [Permission.EQUIPE]: '/equipe',
  [Permission.CLIENTS]: '/clients',
  [Permission.PILOTAGE]: '/pilotage',
}

/** Inverse : chemin → permission correspondante, pour les routes API. */
export const PERMISSION_PAR_ZONE: Record<string, Permission> = Object.fromEntries(
  Object.entries(ZONE_PAR_PERMISSION).map(([permission, zone]) => [
    zone,
    permission as Permission,
  ]),
)

/** Zones réellement accessibles à un STAFF selon ses permissions. */
export function zonesStaff(permissions: Permission[]): string[] {
  return permissions.map((p) => ZONE_PAR_PERMISSION[p])
}

/** Première zone autorisée d'un STAFF, ou null si aucune permission. */
export function zoneDaccueilStaff(permissions: Permission[]): string | null {
  return zonesStaff(permissions)[0] ?? null
}

/**
 * Page montrée à un STAFF sans aucune permission : accès refusé.
 * Elle ne doit jamais rediriger (voir proxy.ts).
 */
export const PAGE_ACCES_REFUSE = '/acces-refuse'

/** Où chaque rôle est renvoyé après connexion. */
export const ACCUEIL_PAR_ROLE: Record<Role, string> = {
  [Role.SUPER_ADMIN]: '/super-admin',
  [Role.RESTAURANT_ADMIN]: '/back-office',
  [Role.STAFF]: PAGE_ACCES_REFUSE,
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
  [Role.STAFF]: Object.values(ZONE_PAR_PERMISSION),
  [Role.CLIENT]: ['/'],
}

/**
 * Destination après connexion : honore le paramètre `suivant` uniquement
 * si la cible est réellement accessible au rôle — jamais un chemin
 * arbitraire (le proxy re-vérifie de toute façon).
 * Pour un STAFF, la cible doit en plus être couverte par ses permissions ;
 * sinon il est ramené vers sa première zone autorisée (ou la page
 * « Accès refusé » si aucune permission).
 */
export function destinationPour(
  role: Role,
  permissions: Permission[] = [],
  suivant?: string | null,
): string {
  if (
    typeof suivant === 'string' &&
    suivant.startsWith('/') &&
    !suivant.startsWith('//') &&
    !suivant.includes(':') &&
    ZONES_PAR_ROLE[role].some((z) =>
      z === '/' ? suivant === '/' : suivant.startsWith(z),
    )
  ) {
    if (role !== Role.STAFF) return suivant
    const zoneDemandee = ZONES_PAR_ROLE[role].find((z) =>
      suivant.startsWith(z),
    )
    if (zoneDemandee && zonesStaff(permissions).includes(zoneDemandee)) {
      return suivant
    }
  }
  if (role === Role.STAFF) {
    return zoneDaccueilStaff(permissions) ?? PAGE_ACCES_REFUSE
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

/** Modes qui se règlent sur un numéro mobile money (Espèces exclu). */
export const MODES_MOBILE_MONEY = [
  'Wave',
  'Orange Money',
  'Free Money',
] as const

/**
 * Modes proposés pour un abonnement. Les numéros de réception ne vivent
 * PLUS ici : ils sont configurés par le SUPER_ADMIN dans le panel
 * « Moyens de paiement » et servis par les routes API (fallback manuel).
 */
export const MODES_PAIEMENT_ABONNEMENT: {
  mode: ModePaiementAbonnement
}[] = MODES_MOBILE_MONEY.map((mode) => ({ mode }))

/** Numéro réel de la plateforme — sert de défaut au panel de configuration. */
export const NUMERO_PAIEMENT_PAR_DEFAUT = '+221 78 48 54 767'

export type NumerosMobileMoney = Record<
  (typeof MODES_MOBILE_MONEY)[number],
  string
>

/**
 * Paramètres de paiement, stockés côté serveur uniquement (BDD locale).
 * Les clés API et secrets ne sont JAMAIS renvoyés au client : les routes
 * ne répondent que par « configuré ou non ». Seul le SUPER_ADMIN peut
 * lire/modifier cette section (vérifié sur chaque route API).
 */
export type ParametresPaiement = {
  numerosMobileMoney: NumerosMobileMoney
  naboopay: {
    /** Le paiement automatique est proposé aux restaurateurs. */
    actif: boolean
    /** Clé API NabooPay — valeur réelle jamais renvoyée au client. */
    apiKey: string
    /** Secret de signature des webhooks — idem, jamais renvoyé. */
    webhookSecret: string
  }
}

export function parametresPaiementParDefaut(): ParametresPaiement {
  return {
    numerosMobileMoney: {
      Wave: NUMERO_PAIEMENT_PAR_DEFAUT,
      'Orange Money': NUMERO_PAIEMENT_PAR_DEFAUT,
      'Free Money': NUMERO_PAIEMENT_PAR_DEFAUT,
    },
    naboopay: { actif: false, apiKey: '', webhookSecret: '' },
  }
}

/**
 * Transaction d'abonnement côté agrégateur : fait le lien entre un
 * `order_id` NabooPay et l'abonnement à activer quand le webhook arrive.
 */
export type TransactionPaiement = {
  id: string
  fournisseur: 'naboopay'
  /** Référence renvoyée par NabooPay (POST /api/v2/transactions). */
  orderId: string
  abonnementId: string
  restaurantId: string
  plan: PlanAbonnement
  montant: number
  statut: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'failed'
  creeLe: string
  payeLe?: string
  methode?: string
  frais?: number
}

/** Journal des webhooks reçus (même rejetés) — pour le debug futur. */
export type WebhookJournal = {
  id: string
  fournisseur: 'naboopay'
  recuLe: string
  signatureValide: boolean
  statut: 'rejete' | 'traite' | 'ignore'
  ordreId?: string
  detail?: string
  corps: string
}

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
 *
 * Compatibilité ascendante : les comptes écrits avant l'introduction de
 * `permissions` / `actif` peuvent ne pas porter ces champs. `lireBdd()`
 * applique des valeurs par défaut à la lecture (`actif: true`,
 * `permissions: []`) — ne jamais supposer leur présence côté appelant.
 */
export type Utilisateur = {
  id: string
  email: string
  password_hash: string
  nom: string
  role: Role
  /** Rempli seulement pour un RESTAURANT_ADMIN ou STAFF — scope ses accès à son restaurant. */
  restaurantId: string | null
  /** Désactivation logique : un compte désactivé ne peut plus se connecter. */
  actif: boolean
  /** Rempli uniquement pour un STAFF ; vide/ignoré pour les autres rôles. */
  permissions: Permission[]
  creeLe: string
}

/** Ce qui est exposé au client (jamais le hash). */
export type SessionUtilisateur = {
  id: string
  email: string
  nom: string
  role: Role
  restaurantId: string | null
  permissions: Permission[]
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
