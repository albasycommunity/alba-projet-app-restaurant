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
  type Categorie,
  type Plat,
} from '@/lib/data'
import { nouveauId } from '@/lib/auth'

export type PlatEditable = Plat & {
  actif: boolean
  rupture: boolean
  /** Premier plat créé par le gérant (onboarding) — les plats de
   *  démonstration ne comptent jamais comme une création réelle. */
  cree: boolean
}

const CLE = 'alba:menu:v1'

type ContexteMenu = {
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

const Contexte = createContext<ContexteMenu | null>(null)

function initial(): PlatEditable[] {
  return MENU.map((p) => ({ ...p, actif: true, rupture: false, cree: false }))
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [plats, setPlats] = useState<PlatEditable[]>([])

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE)
      if (brut) {
        const relu = JSON.parse(brut) as PlatEditable[]
        if (Array.isArray(relu) && relu.length > 0) {
          // Volume non récent : pas de champ `cree` — jamais considérer un
          // plat historique comme une création réelle du gérant (onboarding).
          setPlats(
            relu.map((p) => ({ ...p, cree: p.cree === true })),
          )
          return
        }
      }
    } catch {
      // illisible : on repart sur le menu de démonstration
    }
    setPlats(initial())
  }, [])

  useEffect(() => {
    if (plats.length === 0) return
    try {
      window.localStorage.setItem(CLE, JSON.stringify(plats))
    } catch {
      // quota plein : l'app continue en mémoire
    }
  }, [plats])

  const valeur = useMemo<ContexteMenu>(
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
