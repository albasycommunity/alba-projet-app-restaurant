'use client'

import { useEffect, useState } from 'react'

/**
 * Horloge partagée. Les compteurs de la cuisine doivent avancer tout seuls :
 * personne n'a le temps de rafraîchir une page en plein service.
 * On démarre à `null` pour que le rendu serveur et le premier rendu client
 * soient identiques (pas d'erreur d'hydratation), puis on tick.
 */
export function useMaintenant(intervalle = 10_000) {
  const [maintenant, setMaintenant] = useState<number | null>(null)

  useEffect(() => {
    setMaintenant(Date.now())
    const t = window.setInterval(() => setMaintenant(Date.now()), intervalle)
    return () => window.clearInterval(t)
  }, [intervalle])

  return maintenant
}

/** Minutes écoulées depuis un horodatage, avec repli avant hydratation. */
export function minutesEcoulees(depuis: number, maintenant: number | null) {
  const base = maintenant ?? depuis
  return Math.max(0, Math.floor((base - depuis) / 60_000))
}
