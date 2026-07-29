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
  HACCP,
  MENU,
  OBJECTIF_JOUR,
  STOCK,
  commandesInitiales,
  type ClientFidele,
  type Commande,
  type Employe,
  type Ingredient,
  type LigneCommande,
  type ModePaiement,
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

export type Etat = {
  commandes: Commande[]
  stock: Ingredient[]
  haccp: TacheHaccp[]
  equipe: Employe[]
  clients: ClientFidele[]
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
  | { type: 'ajusterStock'; id: string; delta: number }
  | { type: 'reapprovisionner'; id: string; quantite: number }
  | { type: 'pointer'; id: string }
  | { type: 'synchroniser' }
  | { type: 'hydrater'; etat: Etat }
  | { type: 'reinitialiser' }

const CLE = 'alba:poste:v1'

function etatInitial(): Etat {
  return {
    commandes: commandesInitiales(),
    stock: STOCK.map((i) => ({ ...i })),
    haccp: HACCP.map((t) => ({ ...t })),
    equipe: EQUIPE.map((e) => ({ ...e })),
    clients: CLIENTS.map((c) => ({ ...c })),
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
      }
      return {
        ...etat,
        commandes: [commande, ...etat.commandes],
        stock: decrementerStock(etat.stock, lignes),
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

    case 'ajusterStock':
      return {
        ...etat,
        stock: etat.stock.map((i) =>
          i.id === action.id
            ? { ...i, stock: Math.max(0, +(i.stock + action.delta).toFixed(2)) }
            : i,
        ),
      }

    case 'reapprovisionner':
      return {
        ...etat,
        stock: etat.stock.map((i) =>
          i.id === action.id
            ? {
                ...i,
                stock: +(i.stock + action.quantite).toFixed(2),
                dlc: undefined,
                joursRestants: undefined,
              }
            : i,
        ),
      }

    case 'pointer':
      return {
        ...etat,
        equipe: etat.equipe.map((e) =>
          e.id === action.id
            ? e.statut === 'present'
              ? { ...e, statut: 'pause' }
              : {
                  ...e,
                  statut: 'present',
                  arrivee:
                    e.arrivee ??
                    new Date().toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                }
            : e,
        ),
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

type Contexte = {
  etat: Etat
  envoyer: (a: Action) => void
  notifs: Notif[]
  notifier: (n: Omit<Notif, 'id'>) => void
  fermerNotif: (id: number) => void
  /** total du ticket en cours */
  total: number
  /** derniers indicateurs recalculés à partir des ventes réelles */
  indicateurs: {
    caJour: number
    tickets: number
    panierMoyen: number
    partObjectif: number
    parMode: { mode: ModePaiement; montant: number; part: number }[]
    affluence: { heure: string; ca: number }[]
    ventesParPlat: Map<string, number>
    alertesStock: Ingredient[]
    peremptions: Ingredient[]
    haccpRestant: number
    enCuisine: number
  }
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

    return {
      caJour,
      tickets,
      panierMoyen: Math.round(caJour / Math.max(1, tickets)),
      partObjectif: Math.min(100, Math.round((caJour / OBJECTIF_JOUR) * 100)),
      parMode,
      affluence,
      ventesParPlat,
      alertesStock: etat.stock.filter((i) => i.stock < i.seuil),
      peremptions: etat.stock.filter(
        (i) => i.joursRestants !== undefined && i.joursRestants <= 2,
      ),
      haccpRestant: etat.haccp.filter((t) => !t.faite).length,
      enCuisine: etat.commandes.filter(
        (c) => c.statut === 'recue' || c.statut === 'preparation',
      ).length,
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
