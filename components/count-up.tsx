'use client'

import { useEffect, useRef, useState } from 'react'

/** Les chiffres clés ne s'affichent jamais statiques : ils montent en compteur animé. */
export function CountUp({
  valeur,
  duree = 1400,
  suffixe = '',
  decimales = 0,
}: {
  valeur: number
  duree?: number
  suffixe?: string
  decimales?: number
}) {
  const [affiche, setAffiche] = useState(0)
  const frame = useRef(0)
  // On repart toujours du chiffre déjà lu à l'écran : quand une vente tombe,
  // le compteur glisse de l'ancien montant au nouveau au lieu de rechuter à zéro.
  const depart = useRef(0)

  useEffect(() => {
    const de = depart.current
    const vers = valeur
    if (de === vers) return
    const debut = performance.now()
    const boucle = (t: number) => {
      const p = Math.min((t - debut) / duree, 1)
      // easing organique (easeOutExpo)
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      const v = de + (vers - de) * e
      depart.current = v
      setAffiche(v)
      if (p < 1) frame.current = requestAnimationFrame(boucle)
    }
    frame.current = requestAnimationFrame(boucle)
    return () => cancelAnimationFrame(frame.current)
  }, [valeur, duree])

  return (
    <span className="tnum">
      {new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }).format(affiche)}
      {suffixe}
    </span>
  )
}
