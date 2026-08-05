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
 * Paliers commerciaux. Un palier est une STRUCTURE DE VERRUS exploitable
 * par le code (proxy, routes API, interface) — jamais du texte seul.
 * La source de vérité du palier applicable est l'enregistrement
 * d'abonnement côté serveur, relu à chaque requête sensible.
 */
export type PalierAbonnement = 'starter' | 'pro' | 'premium'

export const PALIERS_ABONNEMENT: PalierAbonnement[] = [
  'starter',
  'pro',
  'premium',
]

/** Libellés français des paliers, pour l'affichage. */
export const LIBELLE_PALIER: Record<PalierAbonnement, string> = {
  starter: 'Starter',
  pro: 'Pro',
  premium: 'Premium',
}

/** Fonction garde-fou : toute valeur inconnue est refusée. */
export function palierValide(valeur: unknown): valeur is PalierAbonnement {
  return (
    typeof valeur === 'string' &&
    (PALIERS_ABONNEMENT as string[]).includes(valeur)
  )
}

/**
 * Verrous structurels d'un palier — lus par proxy.ts et les routes API
 * DEPUIS CETTE SOURCE UNIQUE (aucun nombre magique ailleurs) :
 * - `limiteStaff` : nombre max de comptes STAFF actifs (null = illimité).
 *   La limite ne s'applique qu'aux NOUVELLES créations (grandfathering).
 * - `modulesAutorises` : permissions couvertes par le palier. Les modules
 *   hors liste sont verrouillés côté serveur (Starter n'a pas stock,
 *   hygiène ni pilotage).
 * - `multiEtablissements` : le gérant peut rattacher plusieurs restaurants
 *   à son compte (réservé Premium).
 */
export type VerrousPalier = {
  limiteStaff: number | null
  modulesAutorises: Permission[]
  multiEtablissements: boolean
}

/** Offres d'abonnement : 3 paliers × 2 périodicités, montants à jour. */
export const PLANS_ABONNEMENT: Record<
  PalierAbonnement,
  {
    libelle: string
    detail: string
    verrous: VerrousPalier
    periodicites: Record<
      PlanAbonnement,
      { montant: number; jours: number }
    >
  }
> = {
  starter: {
    libelle: 'Starter',
    detail: 'Pour démarrer : un restaurant, une petite équipe.',
    verrous: {
      limiteStaff: 1,
      modulesAutorises: [
        Permission.CAISSE,
        Permission.CUISINE,
        Permission.EQUIPE,
        Permission.CLIENTS,
      ],
      multiEtablissements: false,
    },
    periodicites: {
      mensuel: { montant: 15_000, jours: 30 },
      annuel: { montant: 150_000, jours: 365 },
    },
  },
  pro: {
    libelle: 'Pro',
    detail: 'Le plan de référence : équipe illimitée, tous les modules.',
    verrous: {
      limiteStaff: null,
      modulesAutorises: [...TOUTES_LES_PERMISSIONS],
      multiEtablissements: false,
    },
    periodicites: {
      mensuel: { montant: 35_000, jours: 30 },
      annuel: { montant: 350_000, jours: 365 },
    },
  },
  premium: {
    libelle: 'Premium',
    detail: 'Pour les groupes : plusieurs établissements, support prioritaire.',
    verrous: {
      limiteStaff: null,
      modulesAutorises: [...TOUTES_LES_PERMISSIONS],
      multiEtablissements: true,
    },
    periodicites: {
      mensuel: { montant: 60_000, jours: 30 },
      annuel: { montant: 600_000, jours: 365 },
    },
  },
}

/**
 * Montant à payer pour un palier et une périodicité — source unique
 * utilisée par les routes de paiement (NabooPay comme fallback manuel).
 */
export function montantPalier(
  palier: PalierAbonnement,
  plan: PlanAbonnement,
) {
  return PLANS_ABONNEMENT[palier].periodicites[plan].montant
}

/** Un module (permission) est-il couvert par ce palier ? */
export function moduleAutorise(
  palier: PalierAbonnement,
  permission: Permission,
) {
  return PLANS_ABONNEMENT[palier].verrous.modulesAutorises.includes(permission)
}

/**
 * Palier minimal qui couvre un module — pour guider l'utilisateur vers la
 * bonne mise à niveau (ex. module Pro bloqué → palier « pro »).
 */
export function palierMinimumPourModule(
  permission: Permission,
): PalierAbonnement {
  const palier = PALIERS_ABONNEMENT.find((p) =>
    moduleAutorise(p, permission),
  )
  return palier ?? 'premium'
}

/**
 * Statut d'un abonnement. `decouverte` est le mode d'entrée : accès
 * complet, sans échéance ni paiement — le compteur d'actions réelles
 * (`decouverte_actions_restantes`) déclenchera la bascule vers le plan
 * payant (sprints suivants), jamais le temps.
 */
export type StatutAbonnement = 'actif' | 'decouverte' | 'expire' | 'en_attente'

export const LIBELLES_STATUT: Record<StatutAbonnement, string> = {
  actif: 'Actif',
  decouverte: 'Découverte',
  expire: 'Expiré',
  en_attente: 'Paiement en attente',
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
  /** Palier choisi lors de la transaction (traçabilité, confirmé côté serveur). */
  palier?: PalierAbonnement
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
  /**
   * Onboarding découverte (Sprint 5). Fail-closed par défaut `true` :
   * un restaurant existant ne voit jamais le parcours. Seul un compte
   * créé en découverte arrive avec `false`. Compatibilité ascendante :
   * les lignes écrites avant la migration ne portent pas ce champ —
   * `lireBdd()` le ramène à `true` pour rester invisible.
   */
  onboarding_masque: boolean
  /**
   * Étape 5 du parcours — les stats ont-elles été consultées ? Défaut
   * `false`. Sans effet pour un restaurant masqué.
   */
  onboarding_stats_consultees: boolean
}

/**
 * Parcours d'onboarding découverte (Sprint 5) — ordre d'affichage du
 * guide. Partagé entre le serveur (calcul de la progression) et le
 * client (affichage) : jamais de copie divergente.
 */
export const ETAPES_ONBOARDING = [
  'profil',
  'plat',
  'vente',
  'equipe',
  'stats',
] as const

export type EtapeOnboarding = (typeof ETAPES_ONBOARDING)[number]

export const TOTAL_ETAPES_ONBOARDING = ETAPES_ONBOARDING.length

/**
 * Progression calculée côté serveur en UN seul aller-retour. Le front
 * n'a qu'à AFFICHER — jamais à recalculer une étape.
 */
export type ProgressionOnboarding = {
  /** Le parcours est-il visible pour ce restaurant ? (`onboarding_masque`) */
  visible: boolean
  etapes: Record<EtapeOnboarding, boolean>
  accomplies: number
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
  /**
   * Palier commercial. ABSENT sur les abonnements créés avant la Phase 4 :
   * la valeur applicable est résolue à la lecture (`palierDeRestaurant`),
   * jamais par écriture de migration. Fail-closed : défaut Starter.
   */
  palier?: PalierAbonnement
  statut: StatutAbonnement
  dateDebut: string
  dateFin: string
  montant: number
  /**
   * Actions de découverte restantes (mode `decouverte` uniquement) —
   * décrémentées par `consommerActionDecouverte`.
   */
  decouverteActionsRestantes?: number
}

/**
 * Garde d'accès au back-office (utilisée par le proxy et chaque route API) :
 * - « actif » : accès complet.
 * - « decouverte » : accès complet, sans aucune échéance — le mode de
 *   découverte est illimité dans le temps. Le paiement sera déclenché par
 *   les actions réelles (compteur `decouverte_actions_restantes`, sprints
 *   suivants), pas par le temps.
 * - « expire » / « en_attente » : accès coupé.
 *
 * Point de blocage (renouvellement) : `verifierAccesRestaurant` renvoie
 * `abonnementActif: false`, le proxy redirige vers /abonnement/renouveler.
 * La relance, elle, vit dans l'écran Abonnement (bannière d'échéance).
 */
export function estAbonnementAccessible(
  abonnement: Pick<Abonnement, 'statut' | 'dateFin'> | null,
  maintenant = new Date(),
) {
  if (!abonnement) return false
  if (abonnement.statut === 'actif') return true
  if (abonnement.statut === 'decouverte') return true
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
  // randomUUID (Web Crypto) : sans collision, disponible côté serveur et
  // côté navigateur en contexte sécurisé. Repli sur Math.random pour les
  // contextes HTTP non sécurisés (accès LAN sur téléphone par exemple).
  const hasard =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replaceAll('-', '').slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefixe}-${Date.now().toString(36)}${hasard}`
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
