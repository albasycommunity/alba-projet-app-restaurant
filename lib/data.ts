// Données de démonstration en mémoire — remplaçables par une vraie base plus tard.

export const RESTAURANT = {
  nom: 'Chez Fatou',
  quartier: 'Ngor, Dakar',
  gerante: 'Fatou Ndiaye',
}

export type Categorie = 'Plats' | 'Grillades' | 'Boissons' | 'Desserts'

/** Une ligne de recette : quelle quantité d'un ingrédient part à chaque plat vendu. */
export type LigneRecette = { ingredientId: string; qte: number }

export type Plat = {
  id: string
  nom: string
  prix: number
  categorie: Categorie
  foodCost: number // en % du prix
  vendusJour: number
  /** minutes de préparation à charge normale */
  preparation: number
  recette: LigneRecette[]
}

export const MENU: Plat[] = [
  {
    id: 'p1',
    nom: 'Thiéboudienne rouge',
    prix: 3500,
    categorie: 'Plats',
    foodCost: 31,
    vendusJour: 42,
    preparation: 12,
    recette: [
      { ingredientId: 'i1', qte: 0.25 },
      { ingredientId: 'i2', qte: 0.2 },
      { ingredientId: 'i4', qte: 0.1 },
      { ingredientId: 'i9', qte: 0.1 },
    ],
  },
  {
    id: 'p2',
    nom: 'Yassa poulet',
    prix: 3000,
    categorie: 'Plats',
    foodCost: 28,
    vendusJour: 38,
    preparation: 11,
    recette: [
      { ingredientId: 'i1', qte: 0.22 },
      { ingredientId: 'i5', qte: 0.22 },
      { ingredientId: 'i4', qte: 0.3 },
      { ingredientId: 'i3', qte: 0.05 },
    ],
  },
  {
    id: 'p3',
    nom: 'Mafé bœuf',
    prix: 3200,
    categorie: 'Plats',
    foodCost: 34,
    vendusJour: 21,
    preparation: 13,
    recette: [
      { ingredientId: 'i1', qte: 0.22 },
      { ingredientId: 'i8', qte: 0.12 },
      { ingredientId: 'i9', qte: 0.08 },
    ],
  },
  {
    id: 'p4',
    nom: 'Domoda',
    prix: 2800,
    categorie: 'Plats',
    foodCost: 26,
    vendusJour: 12,
    preparation: 12,
    recette: [
      { ingredientId: 'i1', qte: 0.22 },
      { ingredientId: 'i8', qte: 0.1 },
      { ingredientId: 'i4', qte: 0.08 },
    ],
  },
  {
    id: 'p5',
    nom: 'Dibi mouton',
    prix: 4500,
    categorie: 'Grillades',
    foodCost: 44,
    vendusJour: 27,
    preparation: 18,
    recette: [
      { ingredientId: 'i6', qte: 0.35 },
      { ingredientId: 'i4', qte: 0.12 },
    ],
  },
  {
    id: 'p6',
    nom: 'Poisson braisé',
    prix: 4000,
    categorie: 'Grillades',
    foodCost: 41,
    vendusJour: 19,
    preparation: 20,
    recette: [
      { ingredientId: 'i2', qte: 0.4 },
      { ingredientId: 'i4', qte: 0.1 },
      { ingredientId: 'i3', qte: 0.04 },
    ],
  },
  {
    id: 'p7',
    nom: 'Brochettes bœuf',
    prix: 2500,
    categorie: 'Grillades',
    foodCost: 38,
    vendusJour: 16,
    preparation: 10,
    recette: [
      { ingredientId: 'i6', qte: 0.2 },
      { ingredientId: 'i4', qte: 0.06 },
    ],
  },
  {
    id: 'b1',
    nom: 'Bissap frais',
    prix: 500,
    categorie: 'Boissons',
    foodCost: 14,
    vendusJour: 64,
    preparation: 1,
    recette: [{ ingredientId: 'i7', qte: 0.02 }],
  },
  {
    id: 'b2',
    nom: 'Bouye',
    prix: 700,
    categorie: 'Boissons',
    foodCost: 18,
    vendusJour: 31,
    preparation: 1,
    recette: [],
  },
  {
    id: 'b3',
    nom: 'Gingembre',
    prix: 600,
    categorie: 'Boissons',
    foodCost: 16,
    vendusJour: 24,
    preparation: 1,
    recette: [],
  },
  {
    id: 'b4',
    nom: 'Eau minérale',
    prix: 500,
    categorie: 'Boissons',
    foodCost: 52,
    vendusJour: 48,
    preparation: 1,
    recette: [],
  },
  {
    id: 'd1',
    nom: 'Thiakry',
    prix: 1000,
    categorie: 'Desserts',
    foodCost: 22,
    vendusJour: 18,
    preparation: 4,
    recette: [],
  },
  {
    id: 'd2',
    nom: 'Salade de fruits',
    prix: 1500,
    categorie: 'Desserts',
    foodCost: 35,
    vendusJour: 9,
    preparation: 5,
    recette: [],
  },
]

export const CATEGORIES: Categorie[] = ['Plats', 'Grillades', 'Boissons', 'Desserts']

export type StatutCommande = 'recue' | 'preparation' | 'prete' | 'servie'
export type CanalCommande = 'salle' | 'comptoir' | 'ligne' | 'livraison'

export type LigneCommande = {
  platId: string
  nom: string
  qte: number
  prix: number
}

export type ModePaiement = 'Wave' | 'Espèces' | 'Orange Money' | 'Free Money'

export const MODES_PAIEMENT: {
  mode: ModePaiement
  raccourci: string
  couleur: string
}[] = [
  { mode: 'Wave', raccourci: 'W', couleur: 'var(--chart-4)' },
  { mode: 'Espèces', raccourci: 'E', couleur: 'var(--success)' },
  { mode: 'Orange Money', raccourci: 'OM', couleur: 'var(--primary)' },
  { mode: 'Free Money', raccourci: 'FM', couleur: 'var(--chart-5)' },
]

export type Reglement = { mode: ModePaiement; montant: number }

export type Commande = {
  id: string
  ref: string
  canal: CanalCommande
  table?: string
  client?: string
  statut: StatutCommande
  /** horodatage de réception (ms) — le temps écoulé est calculé à l'affichage */
  recueA: number
  estimation: number // minutes estimées de préparation
  lignes: LigneCommande[]
  reglements: Reglement[]
  /** false quand le ticket attend la synchronisation cloud */
  synchronise: boolean
  /** qui a encaissé — base du suivi de performance individuel */
  encaisseParId?: string
}

/** Génère la file de départ. Les minutes sont relatives à l'ouverture de l'app. */
export function commandesInitiales(maintenant = Date.now()): Commande[] {
  const min = (m: number) => maintenant - m * 60_000
  return [
    {
      id: 'c1',
      ref: '#248',
      canal: 'salle',
      table: 'Table 4',
      statut: 'preparation',
      recueA: min(9),
      estimation: 14,
      lignes: [
        { platId: 'p1', nom: 'Thiéboudienne rouge', qte: 2, prix: 3500 },
        { platId: 'b1', nom: 'Bissap frais', qte: 2, prix: 500 },
      ],
      reglements: [],
      synchronise: true,
    },
    {
      id: 'c2',
      ref: '#249',
      canal: 'livraison',
      client: 'Aminata D.',
      statut: 'recue',
      recueA: min(2),
      estimation: 18,
      lignes: [
        { platId: 'p5', nom: 'Dibi mouton', qte: 1, prix: 4500 },
        { platId: 'p7', nom: 'Brochettes bœuf', qte: 2, prix: 2500 },
        { platId: 'b3', nom: 'Gingembre', qte: 1, prix: 600 },
      ],
      reglements: [{ mode: 'Wave', montant: 10100 }],
      synchronise: true,
    },
    {
      id: 'c3',
      ref: '#250',
      canal: 'comptoir',
      client: 'Sur place',
      statut: 'prete',
      recueA: min(12),
      estimation: 10,
      lignes: [{ platId: 'p2', nom: 'Yassa poulet', qte: 1, prix: 3000 }],
      reglements: [{ mode: 'Espèces', montant: 3000 }],
      synchronise: true,
    },
    {
      id: 'c4',
      ref: '#251',
      canal: 'ligne',
      client: 'Moussa S.',
      statut: 'preparation',
      recueA: min(6),
      estimation: 15,
      lignes: [
        { platId: 'p6', nom: 'Poisson braisé', qte: 1, prix: 4000 },
        { platId: 'd1', nom: 'Thiakry', qte: 2, prix: 1000 },
      ],
      reglements: [{ mode: 'Orange Money', montant: 6000 }],
      synchronise: true,
    },
    {
      id: 'c5',
      ref: '#252',
      canal: 'salle',
      table: 'Table 9',
      statut: 'recue',
      recueA: min(1),
      estimation: 12,
      lignes: [
        { platId: 'p3', nom: 'Mafé bœuf', qte: 3, prix: 3200 },
        { platId: 'b4', nom: 'Eau minérale', qte: 3, prix: 500 },
      ],
      reglements: [],
      synchronise: true,
    },
    {
      id: 'c6',
      ref: '#247',
      canal: 'salle',
      table: 'Table 2',
      statut: 'servie',
      recueA: min(26),
      estimation: 13,
      lignes: [{ platId: 'p4', nom: 'Domoda', qte: 2, prix: 2800 }],
      reglements: [{ mode: 'Espèces', montant: 5600 }],
      synchronise: true,
    },
  ]
}

export const CANAUX: Record<
  CanalCommande,
  { libelle: string; court: string }
> = {
  salle: { libelle: 'Salle', court: 'Salle' },
  comptoir: { libelle: 'Comptoir', court: 'Comptoir' },
  ligne: { libelle: 'Commande en ligne', court: 'En ligne' },
  livraison: { libelle: 'Livraison', court: 'Livraison' },
}

export const STATUTS: Record<
  StatutCommande,
  { libelle: string; suivant?: StatutCommande; action?: string }
> = {
  recue: { libelle: 'Reçue', suivant: 'preparation', action: 'Lancer' },
  preparation: { libelle: 'En préparation', suivant: 'prete', action: 'C’est prêt' },
  prete: { libelle: 'Prête', suivant: 'servie', action: 'Servie' },
  servie: { libelle: 'Servie' },
}

export const TABLES = [
  'Table 1',
  'Table 2',
  'Table 3',
  'Table 4',
  'Table 5',
  'Table 6',
  'Table 7',
  'Table 8',
  'Table 9',
  'Table 10',
  'Terrasse 1',
  'Terrasse 2',
]

export type Ingredient = {
  id: string
  nom: string
  stock: number
  unite: string
  seuil: number
  dlc?: string
  joursRestants?: number
  fournisseur: string
  /** prix d'achat par unité, en FCFA — base du calcul de food cost */
  prixUnitaire: number
  /** conditionnement d'achat habituel chez le fournisseur */
  lot: number
  /** numéro de lot de la dernière réception, pour la traçabilité HACCP */
  lotRecu?: string
}

export const STOCK: Ingredient[] = [
  { id: 'i1', nom: 'Riz brisé parfumé', stock: 48, unite: 'kg', seuil: 25, fournisseur: 'Marché Kermel', prixUnitaire: 650, lot: 25, lotRecu: 'RZ-1184' },
  { id: 'i2', nom: 'Thiof frais', stock: 6, unite: 'kg', seuil: 12, dlc: 'Demain', joursRestants: 1, fournisseur: 'Soumbédioune', prixUnitaire: 4200, lot: 10, lotRecu: 'TH-0921' },
  { id: 'i3', nom: 'Huile d\u2019arachide', stock: 22, unite: 'L', seuil: 15, fournisseur: 'Sonacos', prixUnitaire: 1450, lot: 20, lotRecu: 'HA-3307' },
  { id: 'i4', nom: 'Oignons', stock: 34, unite: 'kg', seuil: 20, fournisseur: 'Potou', prixUnitaire: 450, lot: 25, lotRecu: 'OG-2210' },
  { id: 'i5', nom: 'Poulet fermier', stock: 9, unite: 'kg', seuil: 15, dlc: '2 jours', joursRestants: 2, fournisseur: 'Sedima', prixUnitaire: 2900, lot: 15, lotRecu: 'PL-7745' },
  { id: 'i6', nom: 'Mouton (épaule)', stock: 14, unite: 'kg', seuil: 10, dlc: '3 jours', joursRestants: 3, fournisseur: 'Boucherie Ndiaye', prixUnitaire: 5200, lot: 10, lotRecu: 'MT-0448' },
  { id: 'i7', nom: 'Bissap séché', stock: 3, unite: 'kg', seuil: 5, fournisseur: 'Marché Tilène', prixUnitaire: 2400, lot: 5, lotRecu: 'BS-1902' },
  { id: 'i8', nom: 'Pâte d\u2019arachide', stock: 11, unite: 'kg', seuil: 8, fournisseur: 'Marché Kermel', prixUnitaire: 1800, lot: 10, lotRecu: 'PA-6612' },
  { id: 'i9', nom: 'Tomate concentrée', stock: 26, unite: 'boîtes', seuil: 18, fournisseur: 'Dieg Bou Diar', prixUnitaire: 700, lot: 24, lotRecu: 'TC-5580' },
]

/**
 * Coût matière réel d'un plat, reconstitué depuis sa recette et le prix
 * d'achat des ingrédients. Les plats sans recette détaillée (boissons
 * achetées prêtes) retombent sur leur food cost théorique.
 */
export function coutMatiere(plat: Plat, stock: Ingredient[] = STOCK) {
  if (plat.recette.length === 0) return Math.round((plat.foodCost / 100) * plat.prix)
  return Math.round(
    plat.recette.reduce((total, ligne) => {
      const ing = stock.find((i) => i.id === ligne.ingredientId)
      return total + (ing ? ing.prixUnitaire * ligne.qte : 0)
    }, 0),
  )
}

/** Food cost réel en % du prix de vente. */
export function foodCostReel(plat: Plat, stock: Ingredient[] = STOCK) {
  return Math.round((coutMatiere(plat, stock) / plat.prix) * 100)
}

/** Seuil de vigilance : au-delà, la marge du plat n'est plus tenable. */
export const SEUIL_FOOD_COST = 40

export type MomentService = 'Matin' | 'Après midi' | 'Soir'

export const MOMENTS: MomentService[] = ['Matin', 'Après midi', 'Soir']

/** À partir de quelle heure chaque moment de service devient l'actualité. */
export const HEURE_MOMENT: Record<MomentService, number> = {
  Matin: 6,
  'Après midi': 14,
  Soir: 18,
}

export function momentCourant(date = new Date()): MomentService {
  const h = date.getHours()
  if (h >= HEURE_MOMENT.Soir) return 'Soir'
  if (h >= HEURE_MOMENT['Après midi']) return 'Après midi'
  return 'Matin'
}

export type TacheHaccp = {
  id: string
  libelle: string
  detail: string
  faite: boolean
  heure?: string
  photo: boolean
  /** moment du service concerné, pour ne montrer que ce qui compte maintenant */
  moment: MomentService
  /** par qui la tâche a été validée */
  par?: string
  /** relevé chiffré attendu (température, pH…) et sa plage de conformité */
  mesure?: { unite: string; min?: number; max: number; libelle: string }
  /** valeur saisie lors de la validation */
  valeur?: number
  /** point critique : bloque l'ouverture du service s'il n'est pas fait */
  critique?: boolean
}

export const HACCP: TacheHaccp[] = [
  { id: 'h1', libelle: 'Température chambre froide', detail: 'Relevé à l’ouverture — la chaîne du froid ne pardonne pas.', faite: true, heure: '07:12', photo: true, moment: 'Matin', par: 'Ibrahima Fall', critique: true, mesure: { unite: '°C', max: 4, libelle: 'Température relevée' }, valeur: 3 },
  { id: 'h3', libelle: 'Réception fournisseur', detail: 'Contrôle du lot et de la température à l’arrivée du camion.', faite: true, heure: '09:38', photo: true, moment: 'Matin', par: 'Awa Diop', critique: true, mesure: { unite: '°C', max: 6, libelle: 'Température à l’arrivée' }, valeur: 5 },
  { id: 'h7', libelle: 'Lavage des mains', detail: 'Passage de toute l’équipe avant la mise en place.', faite: false, photo: false, moment: 'Matin' },
  { id: 'h2', libelle: 'Nettoyage plan de travail', detail: 'Désinfection complète après le service de midi.', faite: true, heure: '15:04', photo: true, moment: 'Après midi', par: 'Ibrahima Fall' },
  { id: 'h4', libelle: 'Huile de friture', detail: 'Contrôle de la couleur, filtration si elle a foncé.', faite: false, photo: false, moment: 'Après midi', mesure: { unite: '% polaires', max: 25, libelle: 'Composés polaires' } },
  { id: 'h5', libelle: 'Température vitrine chaude', detail: 'Relevé avant le service du soir.', faite: false, photo: false, moment: 'Soir', critique: true, mesure: { unite: '°C', min: 63, max: 90, libelle: 'Température au cœur' } },
  { id: 'h6', libelle: 'Évacuation des déchets', detail: 'Bacs sortis, lavés et désinfectés.', faite: false, photo: false, moment: 'Soir' },
  { id: 'h8', libelle: 'Fermeture cuisine', detail: 'Gaz coupé, sols lavés, chambre froide refermée.', faite: false, photo: false, moment: 'Soir', critique: true },
]

export type Employe = {
  id: string
  nom: string
  role: string
  statut: 'present' | 'pause' | 'absent'
  arrivee?: string
  ventesJour: number
  erreurs: number
  /** modules de formation validés — la progression en % s'en déduit */
  modules: string[]
  /** numéro de badge encodé dans le QR de pointage */
  badge: string
  /** l'employé tient la caisse : ses encaissements lui sont attribués */
  caisse: boolean
}

export const EQUIPE: Employe[] = [
  { id: 'e1', nom: 'Awa Diop', role: 'Cheffe de salle', statut: 'present', arrivee: '07:02', ventesJour: 184000, erreurs: 0, modules: ['f1', 'f2', 'f3', 'f4'], badge: 'ALBA-4417', caisse: false },
  { id: 'e2', nom: 'Ibrahima Fall', role: 'Cuisinier', statut: 'present', arrivee: '06:48', ventesJour: 0, erreurs: 1, modules: ['f2', 'f3'], badge: 'ALBA-2098', caisse: false },
  { id: 'e3', nom: 'Sokhna Mbaye', role: 'Caissière', statut: 'pause', arrivee: '08:15', ventesJour: 226500, erreurs: 2, modules: ['f1', 'f4'], badge: 'ALBA-7731', caisse: true },
  { id: 'e4', nom: 'Cheikh Sarr', role: 'Livreur', statut: 'present', arrivee: '10:30', ventesJour: 48000, erreurs: 0, modules: ['f4'], badge: 'ALBA-5562', caisse: false },
  { id: 'e5', nom: 'Ndèye Gueye', role: 'Commis', statut: 'absent', ventesJour: 0, erreurs: 0, modules: [], badge: 'ALBA-9014', caisse: false },
]

/** Un mouvement de pointage de la journée — la feuille de présence réelle. */
export type Pointage = {
  id: string
  employeId: string
  nom: string
  type: 'arrivee' | 'pause' | 'reprise' | 'depart'
  heure: string
}

export const LIBELLE_POINTAGE: Record<Pointage['type'], string> = {
  arrivee: 'Arrivée',
  pause: 'Départ en pause',
  reprise: 'Retour de pause',
  depart: 'Fin de service',
}

export const STATUTS_EQUIPE: Record<
  Employe['statut'],
  { libelle: string; ton: 'succes' | 'attention' | 'neutre' }
> = {
  present: { libelle: 'En poste', ton: 'succes' },
  pause: { libelle: 'En pause', ton: 'attention' },
  absent: { libelle: 'Pas encore là', ton: 'neutre' },
}

export type NiveauFidelite = 'Bronze' | 'Argent' | 'Or'

export type ClientFidele = {
  id: string
  nom: string
  telephone: string
  points: number
  visites: number
  panierMoyen: number
  niveau: NiveauFidelite
  anniversaire?: string
  /** plat commandé le plus souvent — sert à personnaliser l'accueil */
  favori?: string
  derniereVisite: string
}

export const CLIENTS: ClientFidele[] = [
  { id: 'cl1', nom: 'Aminata Diallo', telephone: '+221 77 412 08 55', points: 1240, visites: 34, panierMoyen: 6200, niveau: 'Or', anniversaire: 'Dans 3 jours', favori: 'Thiéboudienne rouge', derniereVisite: 'Hier' },
  { id: 'cl2', nom: 'Moussa Sow', telephone: '+221 78 330 17 42', points: 780, visites: 21, panierMoyen: 4800, niveau: 'Argent', favori: 'Poisson braisé', derniereVisite: 'Il y a 4 jours' },
  { id: 'cl3', nom: 'Khady Bâ', telephone: '+221 76 905 63 10', points: 410, visites: 12, panierMoyen: 3900, niveau: 'Bronze', favori: 'Yassa poulet', derniereVisite: 'Il y a 9 jours' },
  { id: 'cl4', nom: 'Ousmane Ka', telephone: '+221 77 208 44 91', points: 950, visites: 26, panierMoyen: 5400, niveau: 'Argent', anniversaire: 'Aujourd’hui', favori: 'Dibi mouton', derniereVisite: 'Il y a 2 jours' },
]

/** Paliers de fidélité — le client voit toujours ce qui lui reste à faire. */
export const PALIERS: { niveau: NiveauFidelite; seuil: number; avantage: string }[] = [
  { niveau: 'Bronze', seuil: 0, avantage: 'Bissap offert à la 5ᵉ visite' },
  { niveau: 'Argent', seuil: 600, avantage: 'Dessert offert chaque semaine' },
  { niveau: 'Or', seuil: 1000, avantage: '10 % sur toute la carte, toujours' },
]

/** 100 FCFA dépensés = 1 point. Simple à expliquer au comptoir. */
export const POINTS_PAR_FCFA = 1 / 100

export function pointsPour(montant: number) {
  return Math.floor(montant * POINTS_PAR_FCFA)
}

export function niveauPour(points: number): NiveauFidelite {
  if (points >= 1000) return 'Or'
  if (points >= 600) return 'Argent'
  return 'Bronze'
}

/** Ce qu'il reste à gagner avant le palier suivant. */
export function prochainPalier(points: number) {
  const suivant = PALIERS.find((p) => p.seuil > points)
  if (!suivant) return null
  return { ...suivant, manque: suivant.seuil - points }
}

export type Recompense = {
  id: string
  libelle: string
  cout: number
  detail: string
}

export const RECOMPENSES: Recompense[] = [
  { id: 'r1', libelle: 'Bissap frais offert', cout: 80, detail: 'Le geste simple qui fait revenir.' },
  { id: 'r2', libelle: 'Thiakry offert', cout: 150, detail: 'Dessert maison, sans condition.' },
  { id: 'r3', libelle: 'Plat du jour offert', cout: 500, detail: 'Au choix parmi les plats de la carte.' },
  { id: 'r4', libelle: '10 % sur l’addition', cout: 300, detail: 'Valable sur le ticket en cours.' },
]

export const AFFLUENCE = [
  { heure: '08h', ca: 24 },
  { heure: '09h', ca: 38 },
  { heure: '10h', ca: 52 },
  { heure: '11h', ca: 96 },
  { heure: '12h', ca: 184 },
  { heure: '13h', ca: 212 },
  { heure: '14h', ca: 148 },
  { heure: '15h', ca: 72 },
  { heure: '16h', ca: 58 },
  { heure: '17h', ca: 84 },
  { heure: '18h', ca: 126 },
  { heure: '19h', ca: 168 },
]

export const PAIEMENTS_JOUR = [
  { mode: 'Wave', montant: 412000, part: 44 },
  { mode: 'Espèces', montant: 286000, part: 31 },
  { mode: 'Orange Money', montant: 178000, part: 19 },
  { mode: 'Free Money', montant: 56000, part: 6 },
]

export type Creneau = {
  employeId: string
  jour: string
  debut: number // heure de début
  fin: number
}

export const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

/** Amplitude affichée par le planning : on ne dessine pas la nuit vide. */
export const PLANNING_DEBUT = 6
export const PLANNING_FIN = 23

/** Jour de la semaine courant, au format court du planning. */
export function jourCourant(date = new Date()) {
  return JOURS[(date.getDay() + 6) % 7]
}

export const PLANNING: Creneau[] = [
  { employeId: 'e1', jour: 'Lun', debut: 7, fin: 16 },
  { employeId: 'e1', jour: 'Mar', debut: 7, fin: 16 },
  { employeId: 'e1', jour: 'Mer', debut: 7, fin: 16 },
  { employeId: 'e1', jour: 'Jeu', debut: 11, fin: 22 },
  { employeId: 'e1', jour: 'Ven', debut: 11, fin: 22 },
  { employeId: 'e2', jour: 'Lun', debut: 6, fin: 15 },
  { employeId: 'e2', jour: 'Mar', debut: 6, fin: 15 },
  { employeId: 'e2', jour: 'Jeu', debut: 6, fin: 15 },
  { employeId: 'e2', jour: 'Ven', debut: 6, fin: 15 },
  { employeId: 'e2', jour: 'Sam', debut: 10, fin: 22 },
  { employeId: 'e3', jour: 'Mar', debut: 8, fin: 18 },
  { employeId: 'e3', jour: 'Mer', debut: 8, fin: 18 },
  { employeId: 'e3', jour: 'Jeu', debut: 8, fin: 18 },
  { employeId: 'e3', jour: 'Sam', debut: 12, fin: 23 },
  { employeId: 'e3', jour: 'Dim', debut: 12, fin: 23 },
  { employeId: 'e4', jour: 'Mer', debut: 10, fin: 20 },
  { employeId: 'e4', jour: 'Jeu', debut: 10, fin: 20 },
  { employeId: 'e4', jour: 'Ven', debut: 10, fin: 22 },
  { employeId: 'e4', jour: 'Sam', debut: 10, fin: 22 },
  { employeId: 'e5', jour: 'Ven', debut: 9, fin: 17 },
  { employeId: 'e5', jour: 'Sam', debut: 9, fin: 17 },
]

export type ModuleFormation = {
  id: string
  titre: string
  duree: number // minutes
  description: string
}

export const FORMATIONS: ModuleFormation[] = [
  { id: 'f1', titre: 'Encaisser un ticket', duree: 3, description: 'Ajouter des plats, séparer cash et Wave, imprimer le reçu.' },
  { id: 'f2', titre: 'Marquer une commande prête', duree: 2, description: 'Lire la file cuisine et faire avancer un plat d’un seul geste.' },
  { id: 'f3', titre: 'Relevé de température', duree: 4, description: 'Prendre la photo, saisir la valeur, valider la fiche HACCP.' },
  { id: 'f4', titre: 'Accueil client', duree: 5, description: 'Placer, conseiller, proposer la carte de fidélité.' },
]

export const CA_JOUR = 932000
export const TICKETS_JOUR = 148
export const OBJECTIF_JOUR = 1000000

export function fcfa(montant: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(montant)) + ' F'
}

/** Nombre entier avec les séparateurs de milliers à la française. */
export function nombreFormate(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n)
}

/** Version courte pour les graphiques : 932 000 F → 932 k */
export function fcfaCourt(montant: number) {
  if (montant >= 1_000_000) return (montant / 1_000_000).toFixed(1) + ' M'
  if (montant >= 1000) return Math.round(montant / 1000) + ' k'
  return String(Math.round(montant))
}

export function heureCourte(ts: number) {
  return new Date(ts).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
