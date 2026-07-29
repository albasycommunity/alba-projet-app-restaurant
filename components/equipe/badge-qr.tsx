'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { RESTAURANT, type Employe } from '@/lib/data'

/**
 * Badge de pointage. L'employé scanne son QR à l'arrivée depuis la
 * tablette du comptoir — pas de feuille de présence à contresigner,
 * pas de réseau nécessaire : le code encode juste le numéro de badge.
 */
export function BadgeQr({ employe }: { employe: Employe }) {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const jeton = `alba://pointage/${employe.badge}?poste=${encodeURIComponent(
      RESTAURANT.nom.toLowerCase().replace(/\s+/g, '-'),
    )}`

    let annule = false
    QRCode.toDataURL(jeton, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#0E0F12', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!annule) setImage(url)
      })
      .catch(() => {
        if (!annule) setImage(null)
      })

    return () => {
      annule = true
    }
  }, [employe.badge])

  return (
    <div className="animate-pop flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-40 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
        {image ? (
          <img
            src={image}
            alt={`Badge de pointage de ${employe.nom}`}
            className="size-full object-contain"
          />
        ) : (
          <span className="text-xs text-neutral-500">Génération…</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="font-mono text-sm font-semibold tracking-wider">
          {employe.badge}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground text-pretty">
          Badge personnel de {employe.nom.split(' ')[0]}. Il se scanne au
          comptoir, même sans réseau.
        </span>
      </div>
    </div>
  )
}
