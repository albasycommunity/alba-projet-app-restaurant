'use client'

/**
 * Menu éditable du back-office et de la carte client. Persisté en local
 * (localStorage) comme le reste de l'app — remplaçable par un vrai store.
 * Les écrans existants (caisse, cuisine…) restent sur les données de
 * démonstration ; cette version pilotée sert le back-office et l'accueil client.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CATEGORIES,
  MENU,
  restaurantEstDemo,
  type Categorie,
  type Plat,
} from '@/lib/data'
import { nouveauId } from '@/lib/auth'
import { useAuth } from '@/lib/auth-contexte'

export type PlatEditable = Plat & {
  actif: boolean
  rupture: boolean
  /** Premier plat créé par le gérant (onboarding) — les plats de
   *  démonstration ne comptent jamais comme une création réelle. */
  cree: boolean
}

const CLE_BASE = 'alba:menu:v3'
/** Ancienne clé partagée entre tous les comptes — purgée une seule fois. */
const CLE_LEGACY = 'alba:menu:v2'
const clePour = (restaurantId: string) => `${CLE_BASE}:${restaurantId}`

type Contexte = {
  plats: PlatEditable[]
  platsActifs: PlatEditable[]
  ajouterPlat: (input: {
    nom: string
    prix: number
    categorie: Categorie
    preparation?: number
  }) => void
  modifierPlat: (id: string, patch: Partial<PlatEditable>) => void
  basculerRupture: (id: string) => void
  retirerPlat: (id: string) => void
}

const Contexte = createContext<Contexte | null>(null)

function initial(demo: boolean): PlatEditable[] {
  // Les comptes de démonstration gardent le menu d'exemple ; les comptes
  // réels partent d'une carte VIERGE (onboarding : créer son premier plat).
  return demo ? MENU.map((p) => ({ ...p, actif: true, rupture: false, cree: false })) : []
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const { utilisateur } = useAuth()
  const restaurantId = utilisateur?.restaurantId ?? null
  const [plats, setPlats] = useState<PlatEditable[]>([])
  /** Restaurant à qui appartient le menu affiché — le menu d'un autre
   *  compte n'est jamais persisté sous la clé du compte courant. */
  const [proprietaire, setProprietaire] = useState<string | null>(null)

  // Sauvegarde SCOPÉE par restaurant : à l'arrivée (ou au changement de
  // compte), on repart du menu de démonstration puis on restaure le menu
  // du restaurant courant s'il existe — jamais celui d'un autre compte.
  useEffect(() => {
    if (!restaurantId) {
      setProprietaire(null)
      setPlats(initial(false))
      return
    }
    const demo = restaurantEstDemo(restaurantId)
    let platsValides: PlatEditable[] | null = null
    try {
      const brut = window.localStorage.getItem(clePour(restaurantId))
      if (brut) {
        const sauvegarde = JSON.parse(brut) as {
          restaurantId: string
          plats: PlatEditable[]
        }
        if (
          sauvegarde.restaurantId === restaurantId &&
          Array.isArray(sauvegarde.plats) &&
          sauvegarde.plats.length > 0
        ) {
          // Volume non récent : pas de champ `cree` — jamais considérer un
          // plat historique comme une création réelle du gérant (onboarding).
          platsValides = sauvegarde.plats.map((p) => ({
            ...p,
            cree: p.cree === true,
          }))
        } else {
          window.localStorage.removeItem(clePour(restaurantId))
        }
      }
      // Ancienne clé partagée entre tous les comptes : purgée pour que
      // rien ne traverse les comptes d'un même navigateur.
      window.localStorage.removeItem(CLE_LEGACY)
    } catch {
      // illisible : on repart sur le menu de démonstration
    }
    setPlats(platsValides ?? initial(demo))
    setProprietaire(restaurantId)
  }, [restaurantId])

  useEffect(() => {
    if (plats.length === 0) return
    if (!restaurantId || proprietaire !== restaurantId) return
    try {
      window.localStorage.setItem(
        clePour(restaurantId),
        JSON.stringify({ restaurantId, plats }),
      )
    } catch {
      // quota plein : l'app continue en mémoire
    }
  }, [plats, restaurantId, proprietaire])

  const valeur = useMemo<Contexte>(
    () => ({
      plats,
      platsActifs: plats.filter((p) => p.actif),
      ajouterPlat: (input) =>
        setPlats((liste) => [
          ...liste,
          {
            id: nouveauId('p'),
            nom: input.nom,
            prix: input.prix,
            categorie: input.categorie,
            foodCost: 30,
            vendusJour: 0,
            // Jamais de plat sans temps de préparation (0 min = invalide) :
            // repli sur 8 min si la valeur arrive vide ou absurde.
            preparation:
              Number.isFinite(input.preparation) &&
              (input.preparation ?? 0) >= 1
                ? Math.round(input.preparation!)
                : 8,
            recette: [],
            actif: true,
            rupture: false,
            // Une vraie création du gérant (onboarding, étape plat).
            cree: true,
          },
        ]),
      modifierPlat: (id, patch) =>
        setPlats((liste) =>
          liste.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        ),
      basculerRupture: (id) =>
        setPlats((liste) =>
          liste.map((p) =>
            p.id === id ? { ...p, rupture: !p.rupture } : p,
          ),
        ),
      retirerPlat: (id) =>
        setPlats((liste) =>
          liste.map((p) => (p.id === id ? { ...p, actif: false } : p)),
        ),
    }),
    [plats],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useMenu() {
  const ctx = useContext(Contexte)
  if (!ctx) throw new Error('useMenu doit être utilisé dans MenuProvider')
  return ctx
}

export { CATEGORIES }
