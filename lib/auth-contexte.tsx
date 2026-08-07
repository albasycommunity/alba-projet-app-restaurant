'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import {
  Role,
  type PalierAbonnement,
  type SessionUtilisateur,
  type StatutAbonnement,
} from '@/lib/auth'

type SessionAbonnement = {
  plan: 'mensuel' | 'annuel'
  statut: StatutAbonnement
  dateFin: string
  montant: number
  /** Palier effectif du restaurant — 'pro' en mode découverte. */
  palier: PalierAbonnement
  /** Actions de découverte restantes — null hors mode découverte. */
  decouverteActionsRestantes: number | null
}

type ContexteAuth = {
  utilisateur: SessionUtilisateur | null
  restaurantNom: string | null
  abonnement: SessionAbonnement | null
  chargement: boolean
  actualiser: () => Promise<void>
  deconnecter: () => Promise<void>
}

const Contexte = createContext<ContexteAuth | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [utilisateur, setUtilisateur] = useState<SessionUtilisateur | null>(null)
  const [restaurantNom, setRestaurantNom] = useState<string | null>(null)
  const [abonnement, setAbonnement] = useState<SessionAbonnement | null>(null)
  const [chargement, setChargement] = useState(true)

  const actualiser = useCallback(async () => {
    try {
      const reponse = await fetch('/api/auth/session', { cache: 'no-store' })
      if (reponse.ok) {
        const donnees = await reponse.json()
        setUtilisateur(donnees.utilisateur)
        setRestaurantNom(donnees.utilisateur?.restaurantNom ?? null)
        setAbonnement(donnees.abonnement)
      } else {
        setUtilisateur(null)
        setRestaurantNom(null)
        setAbonnement(null)
      }
    } catch {
      setUtilisateur(null)
      setRestaurantNom(null)
      setAbonnement(null)
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    actualiser()
  }, [actualiser])

  const deconnecter = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUtilisateur(null)
    setRestaurantNom(null)
    setAbonnement(null)
    try {
      window.sessionStorage.removeItem('alba:onboarding:ferme')
      window.sessionStorage.removeItem('alba:onboarding:fini')
    } catch {}
    router.push('/login')
  }, [router])

  const valeur = useMemo(
    () => ({
      utilisateur,
      restaurantNom,
      abonnement,
      chargement,
      actualiser,
      deconnecter,
    }),
    [utilisateur, restaurantNom, abonnement, chargement, actualiser, deconnecter],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useAuth() {
  const ctx = useContext(Contexte)
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return ctx
}

export const initialesDe = (nom: string) =>
  nom
    .split(/\s+/)
    .filter(Boolean)
    .map((m) => m[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

export { Role }
