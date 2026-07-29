'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { RESTAURANT, fcfa } from '@/lib/data'

/**
 * QR marchand affichable en salle : le client scanne et paie depuis
 * son propre téléphone (Wave / Orange Money / Free Money).
 * Le code encode un lien de paiement réel, montant inclus.
 */
export function QrMarchand({ montant }: { montant: number }) {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const lien = `https://pay.alba.sn/${encodeURIComponent(
      RESTAURANT.nom.toLowerCase().replace(/\s+/g, '-'),
    )}?montant=${montant}&devise=XOF`

    let annule = false
    QRCode.toDataURL(lien, {
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
  }, [montant])

  return (
    <div className="animate-pop flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex size-44 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
        {image ? (
          <img
            src={image}
            alt={`QR de paiement de ${fcfa(montant)} chez ${RESTAURANT.nom}`}
            className="size-full object-contain"
          />
        ) : (
          <span className="text-xs text-neutral-500">Génération…</span>
        )}
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="font-display text-lg font-semibold tnum">
          {fcfa(montant)}
        </span>
        <span className="text-xs leading-relaxed text-muted-foreground text-pretty">
          Le client scanne, paie depuis Wave ou Orange Money, et tu vois le
          règlement arriver.
        </span>
      </div>
    </div>
  )
}
