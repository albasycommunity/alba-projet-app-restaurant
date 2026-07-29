// Données de démonstration en mémoire — remplaçables par une vraie base plus tard.

export const RESTAURANT = {
  nom: 'Chez Fatou',
  quartier: 'Ngor, Dakar',
  gerante: 'Fatou Ndiaye',
}

export type Categorie = 'Plats' | 'Grillades' | 'Boissons' | 'Desserts'

export type Plat = {
  id: string
  nom: string
  prix: number
  categorie: Categorie
  foodCost: number // en % du prix
  emoji?: string
  vendusJour: number
}

export const MENU: Plat[] = [
  { id: 'p1', nom: 'Thiéboudienne rouge', prix: 3500, categorie: 'Plats', foodCost: 31, vendusJour: 42 },
  { id: 'p2', nom: 'Yassa poulet', prix: 3000, categorie: 'Plats', foodCost: 28, vendusJour: 38 },
  { id: 'p3', nom: 'Mafé bœuf', prix: 3200, categorie: 'Plats', foodCost: 34, vendusJour: 21 },
  { id: 'p4', nom: 'Domoda', prix: 2800, categorie: 'Plats', foodCost: 26, vendusJour: 12 },
  { id: 'p5', nom: 'Dibi mouton', prix: 4500, categorie: 'Grillades', foodCost: 44, vendusJour: 27 },
  { id: 'p6', nom: 'Poisson braisé', prix: 4000, categorie: 'Grillades', foodCost: 41, vendusJour: 19 },
  { id: 'p7', nom: 'Brochettes bœuf', prix: 2500, categorie: 'Grillades', foodCost: 38, vendusJour: 16 },
  { id: 'b1', nom: 'Bissap frais', prix: 500, categorie: 'Boissons', foodCost: 14, vendusJour: 64 },
  { id: 'b2', nom: 'Bouye', prix: 700, categorie: 'Boissons', foodCost: 18, vendusJour: 31 },
  { id: 'b3', nom: 'Gingembre', prix: 600, categorie: 'Boissons', foodCost: 16, vendusJour: 24 },
  { id: 'b4', nom: 'Eau minérale', prix: 500, categorie: 'Boissons', foodCost: 52, vendusJour: 48 },
  { id: 'd1', nom: 'Thiakry', prix: 1000, categorie: 'Desserts', foodCost: 22, vendusJour: 18 },
  { id: 'd2', nom: 'Salade de fruits', prix: 1500, categorie: 'Desserts', foodCost: 35, vendusJour: 9 },
]

export const CATEGORIES: Categorie[] = ['Plats', 'Grillades', 'Boissons', 'Desserts']

export type StatutCommande = 'recue' | 'preparation' | 'prete' | 'servie'
export type CanalCommande = 'salle' | 'comptoir' | 'ligne' | 'livraison'

export type Commande = {
  id: string
  ref: string
  canal: CanalCommande
  table?: string
  client?: string
  statut: StatutCommande
  minutes: number // temps écoulé depuis la réception
  estimation: number // minutes estimées de préparation
  lignes: { nom: string; qte: number; prix: number }[]
}

export const COMMANDES: Commande[] = [
  {
    id: 'c1',
    ref: '#248',
    canal: 'salle',
    table: 'Table 4',
    statut: 'preparation',
    minutes: 9,
    estimation: 14,
    lignes: [
      { nom: 'Thiéboudienne rouge', qte: 2, prix: 3500 },
      { nom: 'Bissap frais', qte: 2, prix: 500 },
    ],
  },
  {
    id: 'c2',
    ref: '#249',
    canal: 'livraison',
    client: 'Aminata D.',
    statut: 'recue',
    minutes: 2,
    estimation: 18,
    lignes: [
      { nom: 'Dibi mouton', qte: 1, prix: 4500 },
      { nom: 'Brochettes bœuf', qte: 2, prix: 2500 },
      { nom: 'Gingembre', qte: 1, prix: 600 },
    ],
  },
  {
    id: 'c3',
    ref: '#250',
    canal: 'comptoir',
    client: 'Sur place',
    statut: 'prete',
    minutes: 12,
    estimation: 10,
    lignes: [{ nom: 'Yassa poulet', qte: 1, prix: 3000 }],
  },
  {
    id: 'c4',
    ref: '#251',
    canal: 'ligne',
    client: 'Moussa S.',
    statut: 'preparation',
    minutes: 6,
    estimation: 15,
    lignes: [
      { nom: 'Poisson braisé', qte: 1, prix: 4000 },
      { nom: 'Thiakry', qte: 2, prix: 1000 },
    ],
  },
  {
    id: 'c5',
    ref: '#252',
    canal: 'salle',
    table: 'Table 9',
    statut: 'recue',
    minutes: 1,
    estimation: 12,
    lignes: [
      { nom: 'Mafé bœuf', qte: 3, prix: 3200 },
      { nom: 'Eau minérale', qte: 3, prix: 500 },
    ],
  },
  {
    id: 'c6',
    ref: '#247',
    canal: 'salle',
    table: 'Table 2',
    statut: 'servie',
    minutes: 26,
    estimation: 13,
    lignes: [{ nom: 'Domoda', qte: 2, prix: 2800 }],
  },
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
}

export const STOCK: Ingredient[] = [
  { id: 'i1', nom: 'Riz brisé parfumé', stock: 48, unite: 'kg', seuil: 25, fournisseur: 'Marché Kermel' },
  { id: 'i2', nom: 'Thiof frais', stock: 6, unite: 'kg', seuil: 12, dlc: 'Demain', joursRestants: 1, fournisseur: 'Soumbédioune' },
  { id: 'i3', nom: 'Huile d\u2019arachide', stock: 22, unite: 'L', seuil: 15, fournisseur: 'Sonacos' },
  { id: 'i4', nom: 'Oignons', stock: 34, unite: 'kg', seuil: 20, fournisseur: 'Potou' },
  { id: 'i5', nom: 'Poulet fermier', stock: 9, unite: 'kg', seuil: 15, dlc: '2 jours', joursRestants: 2, fournisseur: 'Sedima' },
  { id: 'i6', nom: 'Mouton (épaule)', stock: 14, unite: 'kg', seuil: 10, dlc: '3 jours', joursRestants: 3, fournisseur: 'Boucherie Ndiaye' },
  { id: 'i7', nom: 'Bissap séché', stock: 3, unite: 'kg', seuil: 5, fournisseur: 'Marché Tilène' },
  { id: 'i8', nom: 'Pâte d\u2019arachide', stock: 11, unite: 'kg', seuil: 8, fournisseur: 'Marché Kermel' },
  { id: 'i9', nom: 'Tomate concentrée', stock: 26, unite: 'boîtes', seuil: 18, fournisseur: 'Dieg Bou Diar' },
]

export type TacheHaccp = {
  id: string
  libelle: string
  detail: string
  faite: boolean
  heure?: string
  photo: boolean
}

export const HACCP: TacheHaccp[] = [
  { id: 'h1', libelle: 'Température chambre froide', detail: 'Relevé matin — cible ≤ 4 °C', faite: true, heure: '07:12', photo: true },
  { id: 'h2', libelle: 'Nettoyage plan de travail', detail: 'Désinfection après service midi', faite: true, heure: '15:04', photo: true },
  { id: 'h3', libelle: 'Réception fournisseur', detail: 'Contrôle lot + température à l\u2019arrivée', faite: true, heure: '09:38', photo: true },
  { id: 'h4', libelle: 'Huile de friture', detail: 'Contrôle couleur et filtration', faite: false, photo: false },
  { id: 'h5', libelle: 'Température vitrine', detail: 'Relevé avant service du soir', faite: false, photo: false },
  { id: 'h6', libelle: 'Évacuation déchets', detail: 'Bacs lavés et désinfectés', faite: false, photo: false },
]

export type Employe = {
  id: string
  nom: string
  role: string
  statut: 'present' | 'pause' | 'absent'
  arrivee?: string
  ventesJour: number
  erreurs: number
  formation: number // % de progression
}

export const EQUIPE: Employe[] = [
  { id: 'e1', nom: 'Awa Diop', role: 'Cheffe de salle', statut: 'present', arrivee: '07:02', ventesJour: 184000, erreurs: 0, formation: 100 },
  { id: 'e2', nom: 'Ibrahima Fall', role: 'Cuisinier', statut: 'present', arrivee: '06:48', ventesJour: 0, erreurs: 1, formation: 82 },
  { id: 'e3', nom: 'Sokhna Mbaye', role: 'Caissière', statut: 'pause', arrivee: '08:15', ventesJour: 226500, erreurs: 2, formation: 64 },
  { id: 'e4', nom: 'Cheikh Sarr', role: 'Livreur', statut: 'present', arrivee: '10:30', ventesJour: 48000, erreurs: 0, formation: 45 },
  { id: 'e5', nom: 'Ndèye Gueye', role: 'Commis', statut: 'absent', ventesJour: 0, erreurs: 0, formation: 20 },
]

export type ClientFidele = {
  id: string
  nom: string
  points: number
  visites: number
  panierMoyen: number
  niveau: 'Bronze' | 'Argent' | 'Or'
  anniversaire?: string
}

export const CLIENTS: ClientFidele[] = [
  { id: 'cl1', nom: 'Aminata Diallo', points: 1240, visites: 34, panierMoyen: 6200, niveau: 'Or', anniversaire: 'Dans 3 jours' },
  { id: 'cl2', nom: 'Moussa Sow', points: 780, visites: 21, panierMoyen: 4800, niveau: 'Argent' },
  { id: 'cl3', nom: 'Khady Bâ', points: 410, visites: 12, panierMoyen: 3900, niveau: 'Bronze' },
  { id: 'cl4', nom: 'Ousmane Ka', points: 950, visites: 26, panierMoyen: 5400, niveau: 'Argent', anniversaire: "Aujourd\u2019hui" },
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

export const CA_JOUR = 932000
export const TICKETS_JOUR = 148
export const OBJECTIF_JOUR = 1000000

export function fcfa(montant: number) {
  return new Intl.NumberFormat('fr-FR').format(montant) + ' F'
}
