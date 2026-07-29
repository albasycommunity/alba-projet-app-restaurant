'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import {
  AFFLUENCE,
  CLIENTS,
  EQUIPE,
  FORMATIONS,
  HACCP,
  MENU,
  OBJECTIF_JOUR,
  STOCK,
  coutMatiere,
  commandesInitiales,
  niveauPour,
  pointsPour,
  type ClientFidele,
  type Commande,
  type Employe,
  type Ingredient,
  type LigneCommande,
  type ModePaiement,
  type Pointage,
  type Reglement,
  type StatutCommande,
  type TacheHaccp,
} from '@/lib/data'

/* ------------------------------------------------------------------ *
 * Le "poste de travail" local. Tout est écrit d'abord en local :
 * aucune action vitale (encaisser, servir, ajuster le stock) ne
 * dépend du réseau. La synchronisation est un détail d'arrière-plan.
 * ------------------------------------------------------------------ */

export type LignePanier = LigneCommande & { note?: string }

/** Une sortie de stock qui n'est pas une vente : casse, péremption, geste commercial. */
export type Perte = {
  id: string
  ingredientId: string
  nom: string
  quantite: number
  unite: string
  motif: string
  cout: number
  heure: string
}

/** Une entrée de stock enregistrée à la réception fournisseur. */
export type Reception = {
  id: string
  ingredientId: string
  nom: string
  quantite: number
  unite: string
  lot: string
  fournisseur: string
  heure: string
}

/** Une récompense fidélité échangée pendant le service. */
export type Echange = {
  id: string
  clientId: string
  client: string
  libelle: string
  cout: number
  heure: string
}

export type Etat = {
  commandes: Commande[]
  stock: Ingredient[]
  haccp: TacheHaccp[]
  equipe: Employe[]
  clients: ClientFidele[]
  pointages: Pointage[]
  echanges: Echange[]
  pertes: Perte[]
  receptions: Reception[]
  panier: LignePanier[]
  /** destination du ticket en cours de saisie */
  destination: { canal: Commande['canal']; table?: string; client?: string }
  /** compteur de référence de ticket */
  prochainNumero: number
  /** tickets encaissés localement mais pas encore poussés au cloud */
  enAttente: string[]
  /** CA de base déjà réalisé avant l'ouverture de la session */
  caBase: number
  ticketsBase: number
}

type Action =
  | { type: 'ajouter'; platId: string }
  | { type: 'retirer'; platId: string }
  | { type: 'supprimer'; platId: string }
  | { type: 'viderPanier' }
  | { type: 'destination'; valeur: Etat['destination'] }
  | { type: 'encaisser'; reglements: Reglement[]; ref: string }
  | { type: 'avancer'; id: string }
  | { type: 'reculer'; id: string }
  | { type: 'annulerCommande'; id: string }
  | { type: 'haccpBascule'; id: string; par: string }
  | {
      type: 'haccpValider'
      id: string
      par: string
      valeur?: number
      photo: boolean
    }
  | { type: 'haccpAnnuler'; id: string }
  | { type: 'ajusterStock'; id: string; delta: number }
  | { type: 'reapprovisionner'; id: string; quantite: number; lot?: string }
  | { type: 'declarerPerte'; id: string; quantite: number; motif: string }
  | { type: 'pointer'; id: string }
  | { type: 'absenter'; id: string }
  | { type: 'basculerModule'; id: string; moduleId: string }
  | { type: 'confierCaisse'; id: string }
  | { type: 'signalerErreur'; id: string }
  | { type: 'crediterVisite'; id: string; montant: number }
  | { type: 'recompenser'; id: string; libelle: string; cout: number }
  | { type: 'synchroniser' }
  | { type: 'hydrater'; etat: Etat }
  | { type: 'reinitialiser' }

/**
 * La version fait partie de la clé : quand la forme des données change,
 * l'ancienne session est ignorée au lieu d'être mal relue.
 */
const CLE = 'alba:poste:v3'

function etatInitial(): Etat {
  return {
    commandes: commandesInitiales(),
    stock: STOCK.map((i) => ({ ...i })),
    haccp: HACCP.map((t) => ({ ...t })),
    equipe: EQUIPE.map((e) => ({ ...e, modules: [...e.modules] })),
    clients: CLIENTS.map((c) => ({ ...c })),
    pointages: EQUIPE.filter((e) => e.arrivee).map((e) => ({
      id: `pt-${e.id}`,
      employeId: e.id,
      nom: e.nom,
      type: 'arrivee' as const,
      heure: e.arrivee!,
    })),
    echanges: [],
    pertes: [],
    receptions: [],
    panier: [],
    destination: { canal: 'salle' },
    prochainNumero: 253,
    enAttente: [],
    caBase: 932000,
    ticketsBase: 148,
  }
}

/** Retire du stock les ingrédients consommés par les lignes vendues. */
function decrementerStock(stock: Ingredient[], lignes: LigneCommande[]) {
  const consommation = new Map<string, number>()
  for (const ligne of lignes) {
    const plat = MENU.find((p) => p.id === ligne.platId)
    if (!plat) continue
    for (const r of plat.recette) {
      consommation.set(
        r.ingredientId,
        (consommation.get(r.ingredientId) ?? 0) + r.qte * ligne.qte,
      )
    }
  }
  if (consommation.size === 0) return stock
  return stock.map((i) =>
    consommation.has(i.id)
      ? { ...i, stock: Math.max(0, +(i.stock - consommation.get(i.id)!).toFixed(2)) }
      : i,
  )
}

/** Une ligne de feuille de présence, horodatée à la seconde du geste. */
function journal(
  employe: Employe,
  type: Pointage['type'],
  heure = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }),
): Pointage {
  return {
    id: `pt-${employe.id}-${Date.now()}`,
    employeId: employe.id,
    nom: employe.nom,
    type,
    heure,
  }
}

/**
 * Enregistre une visite sur une fiche client : points gagnés, panier moyen
 * recalculé sur l'ensemble des passages, niveau réévalué.
 */
function crediter(client: ClientFidele, montant: number): ClientFidele {
  const points = client.points + pointsPour(montant)
  const visites = client.visites + 1
  return {
    ...client,
    points,
    visites,
    panierMoyen: Math.round(
      (client.panierMoyen * client.visites + montant) / visites,
    ),
    niveau: niveauPour(points),
    derniereVisite: 'À l’instant',
  }
}

/** Estimation dynamique : la charge réelle de la cuisine allonge le temps. */
export function estimerPreparation(lignes: LigneCommande[], enCours: number) {
  const base = lignes.reduce((total, l) => {
    const plat = MENU.find((p) => p.id === l.platId)
    return Math.max(total, plat?.preparation ?? 8)
  }, 0)
  const volume = lignes.reduce((n, l) => n + l.qte, 0)
  const charge = 1 + Math.min(enCours, 8) * 0.09
  return Math.max(3, Math.round((base + volume * 0.6) * charge))
}

function reducer(etat: Etat, action: Action): Etat {
  switch (action.type) {
    case 'hydrater':
      return action.etat

    case 'reinitialiser':
      return etatInitial()

    case 'ajouter': {
      const plat = MENU.find((p) => p.id === action.platId)
      if (!plat) return etat
      const existante = etat.panier.find((l) => l.platId === plat.id)
      return {
        ...etat,
        panier: existante
          ? etat.panier.map((l) =>
              l.platId === plat.id ? { ...l, qte: l.qte + 1 } : l,
            )
          : [
              ...etat.panier,
              { platId: plat.id, nom: plat.nom, prix: plat.prix, qte: 1 },
            ],
      }
    }

    case 'retirer':
      return {
        ...etat,
        panier: etat.panier
          .map((l) =>
            l.platId === action.platId ? { ...l, qte: l.qte - 1 } : l,
          )
          .filter((l) => l.qte > 0),
      }

    case 'supprimer':
      return {
        ...etat,
        panier: etat.panier.filter((l) => l.platId !== action.platId),
      }

    case 'viderPanier':
      return { ...etat, panier: [] }

    case 'destination':
      return { ...etat, destination: action.valeur }

    case 'encaisser': {
      if (etat.panier.length === 0) return etat
      const enCours = etat.commandes.filter(
        (c) => c.statut === 'recue' || c.statut === 'preparation',
      ).length
      const lignes: LigneCommande[] = etat.panier.map((l) => ({
        platId: l.platId,
        nom: l.nom,
        qte: l.qte,
        prix: l.prix,
      }))
      const horsLigne =
        typeof navigator !== 'undefined' && !navigator.onLine
      // Le ticket est attribué à qui tient la caisse : c'est ce qui
      // alimente le suivi de performance individuel côté Équipe.
      const caissier = etat.equipe.find((e) => e.caisse && e.statut !== 'absent')
      const commande: Commande = {
        id: `local-${Date.now()}`,
        ref: action.ref,
        canal: etat.destination.canal,
        table: etat.destination.table,
        client: etat.destination.client,
        statut: 'recue',
        recueA: Date.now(),
        estimation: estimerPreparation(lignes, enCours),
        lignes,
        reglements: action.reglements,
        synchronise: !horsLigne,
        encaisseParId: caissier?.id,
      }
      // Si le ticket porte le nom d'un client fidèle, ses points tombent
      // tout seuls : personne n'a le temps de le faire à la main en rush.
      const montant = action.reglements.reduce((s, r) => s + r.montant, 0)
      const nomClient = etat.destination.client?.trim().toLowerCase()
      const clients = nomClient
        ? etat.clients.map((c) =>
            c.nom.trim().toLowerCase() === nomClient
              ? crediter(c, montant)
              : c,
          )
        : etat.clients

      return {
        ...etat,
        commandes: [commande, ...etat.commandes],
        stock: decrementerStock(etat.stock, lignes),
        clients,
        panier: [],
        destination: { canal: etat.destination.canal },
        prochainNumero: etat.prochainNumero + 1,
        enAttente: horsLigne ? [...etat.enAttente, commande.id] : etat.enAttente,
      }
    }

    case 'avancer': {
      const suite: Record<StatutCommande, StatutCommande> = {
        recue: 'preparation',
        preparation: 'prete',
        prete: 'servie',
        servie: 'servie',
      }
      return {
        ...etat,
        commandes: etat.commandes.map((c) =>
          c.id === action.id ? { ...c, statut: suite[c.statut] } : c,
        ),
      }
    }

    case 'reculer': {
      const avant: Record<StatutCommande, StatutCommande> = {
        recue: 'recue',
        preparation: 'recue',
        prete: 'preparation',
        servie: 'prete',
      }
      return {
        ...etat,
        commandes: etat.commandes.map((c) =>
          c.id === action.id ? { ...c, statut: avant[c.statut] } : c,
        ),
      }
    }

    case 'annulerCommande':
      return {
        ...etat,
        commandes: etat.commandes.filter((c) => c.id !== action.id),
      }

    case 'haccpBascule':
      return {
        ...etat,
        haccp: etat.haccp.map((t) =>
          t.id === action.id
            ? t.faite
              ? { ...t, faite: false, heure: undefined, photo: false, par: undefined }
              : {
                  ...t,
                  faite: true,
                  photo: true,
                  par: action.par,
                  heure: new Date().toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                }
            : t,
        ),
      }

    case 'haccpValider':
      return {
        ...etat,
        haccp: etat.haccp.map((t) =>
          t.id === action.id
            ? {
                ...t,
                faite: true,
                photo: action.photo,
                par: action.par,
                valeur: action.valeur,
                heure: new Date().toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            : t,
        ),
      }

    case 'haccpAnnuler':
      return {
        ...etat,
        haccp: etat.haccp.map((t) =>
          t.id === action.id
            ? {
                ...t,
                faite: false,
                photo: false,
                par: undefined,
                heure: undefined,
                valeur: undefined,
              }
            : t,
        ),
      }

    case 'ajusterStock':
      return {
        ...etat,
        stock: etat.stock.map((i) =>
          i.id === action.id
            ? { ...i, stock: Math.max(0, +(i.stock + action.delta).toFixed(2)) }
            : i,
        ),
      }

    case 'reapprovisionner': {
      const ing = etat.stock.find((i) => i.id === action.id)
      if (!ing) return etat
      const lot =
        action.lot ??
        `${ing.nom.slice(0, 2).toUpperCase()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      const heure = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      return {
        ...etat,
        stock: etat.stock.map((i) =>
          i.id === action.id
            ? {
                ...i,
                stock: +(i.stock + action.quantite).toFixed(2),
                dlc: undefined,
                joursRestants: undefined,
                lotRecu: lot,
              }
            : i,
        ),
        receptions: [
          {
            id: `r-${Date.now()}`,
            ingredientId: ing.id,
            nom: ing.nom,
            quantite: action.quantite,
            unite: ing.unite,
            lot,
            fournisseur: ing.fournisseur,
            heure,
          },
          ...etat.receptions,
        ],
      }
    }

    case 'declarerPerte': {
      const ing = etat.stock.find((i) => i.id === action.id)
      if (!ing || action.quantite <= 0) return etat
      const quantite = Math.min(action.quantite, ing.stock)
      if (quantite <= 0) return etat
      return {
        ...etat,
        stock: etat.stock.map((i) =>
          i.id === action.id
            ? { ...i, stock: +(i.stock - quantite).toFixed(2) }
            : i,
        ),
        pertes: [
          {
            id: `pe-${Date.now()}`,
            ingredientId: ing.id,
            nom: ing.nom,
            quantite,
            unite: ing.unite,
            motif: action.motif,
            cout: Math.round(quantite * ing.prixUnitaire),
            heure: new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...etat.pertes,
        ],
      }
    }

    case 'absenter': {
      const employe = etat.equipe.find((e) => e.id === action.id)
      if (!employe || employe.statut === 'absent') return etat
      return {
        ...etat,
        equipe: etat.equipe.map((e) =>
          e.id === action.id ? { ...e, statut: 'absent', caisse: false } : e,
        ),
        pointages: [
          journal(employe, 'depart'),
          ...etat.pointages,
        ],
      }
    }

    case 'basculerModule':
      return {
        ...etat,
        equipe: etat.equipe.map((e) =>
          e.id === action.id
            ? {
                ...e,
                modules: e.modules.includes(action.moduleId)
                  ? e.modules.filter((m) => m !== action.moduleId)
                  : [...e.modules, action.moduleId],
              }
            : e,
        ),
      }

    /** Une seule personne tient la caisse à la fois : les ventes sont traçables. */
    case 'confierCaisse':
      return {
        ...etat,
        equipe: etat.equipe.map((e) => ({
          ...e,
          caisse: e.id === action.id && e.statut !== 'absent',
        })),
      }

    case 'signalerErreur':
      return {
        ...etat,
        equipe: etat.equipe.map((e) =>
          e.id === action.id ? { ...e, erreurs: e.erreurs + 1 } : e,
        ),
      }

    case 'crediterVisite': {
      if (action.montant <= 0) return etat
      return {
        ...etat,
        clients: etat.clients.map((c) =>
          c.id === action.id ? crediter(c, action.montant) : c,
        ),
      }
    }

    case 'recompenser': {
      const client = etat.clients.find((c) => c.id === action.id)
      if (!client || client.points < action.cout) return etat
      return {
        ...etat,
        clients: etat.clients.map((c) =>
          c.id === action.id
            ? {
                ...c,
                points: c.points - action.cout,
                niveau: niveauPour(c.points - action.cout),
              }
            : c,
        ),
        echanges: [
          {
            id: `ec-${Date.now()}`,
            clientId: client.id,
            client: client.nom,
            libelle: action.libelle,
            cout: action.cout,
            heure: new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...etat.echanges,
        ],
      }
    }

    case 'pointer': {
      const employe = etat.equipe.find((e) => e.id === action.id)
      if (!employe) return etat
      const heure = new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
      const type: Pointage['type'] =
        employe.statut === 'present'
          ? 'pause'
          : employe.statut === 'pause'
            ? 'reprise'
            : 'arrivee'
      return {
        ...etat,
        equipe: etat.equipe.map((e) =>
          e.id === action.id
            ? employe.statut === 'present'
              ? { ...e, statut: 'pause' }
              : { ...e, statut: 'present', arrivee: e.arrivee ?? heure }
            : e,
        ),
        pointages: [journal(employe, type, heure), ...etat.pointages],
      }
    }

    case 'synchroniser':
      return {
        ...etat,
        enAttente: [],
        commandes: etat.commandes.map((c) =>
          c.synchronise ? c : { ...c, synchronise: true },
        ),
      }

    default:
      return etat
  }
}

/* ---------------------------- notifications ---------------------------- */

export type Notif = {
  id: number
  titre: string
  detail?: string
  ton: 'succes' | 'info' | 'alerte'
}

/** Indicateurs recalculés à chaque vente : aucune donnée figée. */
export type Indicateurs = {
  caJour: number
  tickets: number
  panierMoyen: number
  partObjectif: number
  parMode: { mode: ModePaiement; montant: number; part: number }[]
  affluence: { heure: string; ca: number }[]
  ventesParPlat: Map<string, number>
  consommationJour: Map<string, number>
  autonomie: (id: string, stockRestant: number) => number
  valeurStock: number
  coutMatiereJour: number
  margeJour: number
  pertesJour: number
  foodCostJour: number
  reappro: {
    ingredient: Ingredient
    quantite: number
    cout: number
    jours: number
    urgent: boolean
  }[]
  alertesStock: Ingredient[]
  peremptions: Ingredient[]
  haccpRestant: number
  equipePresente: number
  enCuisine: number
  /** Performance individuelle recalculée depuis les tickets encaissés. */
  performance: {
    employe: Employe
    ventes: number
    tickets: number
    panierMoyen: number
    formation: number
    fiabilite: number
    tient: boolean
  }[]
  /** Somme des points de fidélité en circulation — c'est une dette. */
  pointsEnCirculation: number
  clientsOr: number
  /** Clients à relancer : anniversaire ou absence prolongée. */
  aRelancer: ClientFidele[]
}

type Contexte = {
  etat: Etat
  envoyer: (a: Action) => void
  notifs: Notif[]
  notifier: (n: Omit<Notif, 'id'>) => void
  fermerNotif: (id: number) => void
  /** total du ticket en cours */
  total: number
  indicateurs: Indicateurs
}

const AlbaContexte = createContext<Contexte | null>(null)

export function AlbaProvider({ children }: { children: React.ReactNode }) {
  const [etat, envoyer] = useReducer(reducer, null, etatInitial)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [pret, setPret] = useState(false)

  // Reprise de session : rien n'est perdu même si l'app s'est fermée
  // brutalement (coupure de batterie).
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE)
      if (brut) {
        const sauvegarde = JSON.parse(brut) as Etat
        if (sauvegarde?.commandes && sauvegarde?.stock) {
          envoyer({ type: 'hydrater', etat: { ...etatInitial(), ...sauvegarde } })
        }
      }
    } catch {
      // sauvegarde illisible : on repart sur un état propre
    }
    setPret(true)
  }, [])

  useEffect(() => {
    if (!pret) return
    try {
      window.localStorage.setItem(CLE, JSON.stringify(etat))
    } catch {
      // quota plein : l'app continue de fonctionner en mémoire
    }
  }, [etat, pret])

  const notifier = useCallback((n: Omit<Notif, 'id'>) => {
    const id = Date.now() + Math.random()
    setNotifs((liste) => [...liste, { ...n, id }])
    window.setTimeout(
      () => setNotifs((liste) => liste.filter((x) => x.id !== id)),
      4200,
    )
  }, [])

  const fermerNotif = useCallback(
    (id: number) => setNotifs((liste) => liste.filter((x) => x.id !== id)),
    [],
  )

  // Au retour du réseau, les tickets gardés en local partent tout seuls.
  useEffect(() => {
    const online = () => {
      if (etat.enAttente.length > 0) {
        const n = etat.enAttente.length
        window.setTimeout(() => {
          envoyer({ type: 'synchroniser' })
          notifier({
            ton: 'succes',
            titre: `${n} ticket${n > 1 ? 's' : ''} synchronisé${n > 1 ? 's' : ''}`,
            detail: 'Tout est remonté au cloud, rien n’a été perdu.',
          })
        }, 1600)
      }
    }
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [etat.enAttente.length, notifier])

  const total = useMemo(
    () => etat.panier.reduce((s, l) => s + l.prix * l.qte, 0),
    [etat.panier],
  )

  const indicateurs = useMemo(() => {
    const locales = etat.commandes.filter((c) => c.id.startsWith('local-'))
    const caLocal = locales.reduce(
      (s, c) => s + c.reglements.reduce((t, r) => t + r.montant, 0),
      0,
    )
    const caJour = etat.caBase + caLocal
    const tickets = etat.ticketsBase + locales.length

    // Répartition par mode : socle du jour + encaissements de la session
    const socle: Record<ModePaiement, number> = {
      Wave: 412000,
      Espèces: 286000,
      'Orange Money': 178000,
      'Free Money': 56000,
    }
    for (const c of locales) {
      for (const r of c.reglements) socle[r.mode] += r.montant
    }
    const totalModes = Object.values(socle).reduce((s, v) => s + v, 0) || 1
    const parMode = (Object.keys(socle) as ModePaiement[])
      .map((mode) => ({
        mode,
        montant: socle[mode],
        part: Math.round((socle[mode] / totalModes) * 100),
      }))
      .sort((a, b) => b.montant - a.montant)

    // Affluence : le socle historique + ce qui rentre à l'heure courante
    const heureCourante = `${String(new Date().getHours()).padStart(2, '0')}h`
    const affluence = AFFLUENCE.map((a) => ({ ...a }))
    const creneau = affluence.find((a) => a.heure === heureCourante)
    if (creneau && caLocal > 0) creneau.ca += Math.round(caLocal / 1000)

    const ventesParPlat = new Map<string, number>()
    for (const plat of MENU) ventesParPlat.set(plat.id, plat.vendusJour)
    for (const c of locales) {
      for (const l of c.lignes) {
        ventesParPlat.set(l.platId, (ventesParPlat.get(l.platId) ?? 0) + l.qte)
      }
    }

    // Consommation d'ingrédients de la journée, reconstituée depuis les ventes.
    // C'est elle qui permet de dire combien de jours il reste avant la rupture.
    const consommationJour = new Map<string, number>()
    for (const plat of MENU) {
      const vendus = ventesParPlat.get(plat.id) ?? 0
      if (vendus === 0) continue
      for (const r of plat.recette) {
        consommationJour.set(
          r.ingredientId,
          +((consommationJour.get(r.ingredientId) ?? 0) + r.qte * vendus).toFixed(2),
        )
      }
    }

    /** Autonomie en jours au rythme de consommation observé aujourd'hui. */
    const autonomie = (id: string, stockRestant: number) => {
      const parJour = consommationJour.get(id) ?? 0
      if (parJour <= 0) return Infinity
      return +(stockRestant / parJour).toFixed(1)
    }

    const valeurStock = Math.round(
      etat.stock.reduce((s, i) => s + i.stock * i.prixUnitaire, 0),
    )

    // Coût matière du jour et marge brute réelle
    let coutMatiereJour = 0
    let caPlats = 0
    for (const plat of MENU) {
      const vendus = ventesParPlat.get(plat.id) ?? 0
      coutMatiereJour += coutMatiere(plat, etat.stock) * vendus
      caPlats += plat.prix * vendus
    }
    const pertesJour = etat.pertes.reduce((s, p) => s + p.cout, 0)
    const foodCostJour = caPlats > 0 ? Math.round((coutMatiereJour / caPlats) * 100) : 0

    // Réapprovisionnement suggéré : on remonte à 2 jours de couverture
    // au-dessus du seuil, arrondi au conditionnement du fournisseur.
    const reappro = etat.stock
      .map((i) => {
        const parJour = consommationJour.get(i.id) ?? 0
        const cible = Math.max(i.seuil * 1.4, i.seuil + parJour * 2)
        const manque = cible - i.stock
        if (manque <= 0) return null
        const quantite = Math.max(i.lot, Math.ceil(manque / i.lot) * i.lot)
        return {
          ingredient: i,
          quantite,
          cout: Math.round(quantite * i.prixUnitaire),
          jours: autonomie(i.id, i.stock),
          urgent: i.stock < i.seuil,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => a.jours - b.jours)

    // Performance individuelle : socle du matin + tickets réellement
    // encaissés depuis l'ouverture de la session par cette personne.
    const performance = etat.equipe
      .map((employe) => {
        const siens = locales.filter((c) => c.encaisseParId === employe.id)
        const ventesLocales = siens.reduce(
          (s, c) => s + c.reglements.reduce((t, r) => t + r.montant, 0),
          0,
        )
        const ventes = employe.ventesJour + ventesLocales
        const nbTickets = siens.length
        return {
          employe,
          ventes,
          tickets: nbTickets,
          panierMoyen:
            nbTickets > 0 ? Math.round(ventesLocales / nbTickets) : 0,
          formation: Math.round(
            (employe.modules.length / Math.max(1, FORMATIONS.length)) * 100,
          ),
          // 1 erreur pèse plus quand on a peu servi : la fiabilité est relative.
          fiabilite: Math.max(
            0,
            100 - employe.erreurs * (nbTickets > 6 ? 6 : 12),
          ),
          tient: employe.caisse && employe.statut !== 'absent',
        }
      })
      .sort((a, b) => b.ventes - a.ventes)

    const pointsEnCirculation = etat.clients.reduce((s, c) => s + c.points, 0)

    return {
      caJour,
      tickets,
      panierMoyen: Math.round(caJour / Math.max(1, tickets)),
      partObjectif: Math.min(100, Math.round((caJour / OBJECTIF_JOUR) * 100)),
      parMode,
      affluence,
      ventesParPlat,
      consommationJour,
      autonomie,
      valeurStock,
      coutMatiereJour: Math.round(coutMatiereJour),
      margeJour: Math.round(caPlats - coutMatiereJour - pertesJour),
      pertesJour,
      foodCostJour,
      reappro,
      alertesStock: etat.stock.filter((i) => i.stock < i.seuil),
      peremptions: etat.stock.filter(
        (i) => i.joursRestants !== undefined && i.joursRestants <= 2,
      ),
      haccpRestant: etat.haccp.filter((t) => !t.faite).length,
      equipePresente: etat.equipe.filter((e) => e.statut === 'present').length,
      enCuisine: etat.commandes.filter(
        (c) => c.statut === 'recue' || c.statut === 'preparation',
      ).length,
      performance,
      pointsEnCirculation,
      clientsOr: etat.clients.filter((c) => c.niveau === 'Or').length,
      aRelancer: etat.clients.filter(
        (c) =>
          c.anniversaire !== undefined ||
          c.derniereVisite.includes('9 jours') ||
          c.derniereVisite.includes('semaine'),
      ),
    }
  }, [etat])

  const valeur = useMemo(
    () => ({ etat, envoyer, notifs, notifier, fermerNotif, total, indicateurs }),
    [etat, notifs, notifier, fermerNotif, total, indicateurs],
  )

  return <AlbaContexte.Provider value={valeur}>{children}</AlbaContexte.Provider>
}

export function useAlba() {
  const ctx = useContext(AlbaContexte)
  if (!ctx) throw new Error('useAlba doit être utilisé dans AlbaProvider')
  return ctx
}

/** Petit retour physique sur les actions critiques, quand l'appareil le permet. */
export function vibrer(motif: number | number[] = 12) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(motif)
    } catch {
      // certains navigateurs refusent sans interaction : sans conséquence
    }
  }
}
