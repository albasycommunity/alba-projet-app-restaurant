'use client'

import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import {
  CheckIcon,
  CopyIcon,
  QrCodeIcon,
  ShareIcon,
  UtensilsCrossedIcon,
} from 'lucide-react'
import {
  CATEGORIES,
  MENU,
  RESTAURANT,
  fcfa,
  type Categorie,
} from '@/lib/data'
import { Badge, Card, CardTitle } from '@/components/kit'
import { cn } from '@/lib/utils'

const LIEN_MENU = `https://menu.alba.sn/${RESTAURANT.nom
  .toLowerCase()
  .replace(/\s+/g, '-')}`

/**
 * Menu digital partageable. Le restaurateur choisit ce qu'il met en avant,
 * puis envoie le tout sur WhatsApp — le canal réellement utilisé ici —
 * ou affiche le QR en salle pour la commande à emporter.
 */
export function MenuPartage() {
  const [retenues, setRetenues] = useState<Categorie[]>([...CATEGORIES])
  const [copie, setCopie] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const plats = useMemo(
    () => MENU.filter((p) => retenues.includes(p.categorie)),
    [retenues],
  )

  const texte = useMemo(() => {
    const lignes = [
      `*${RESTAURANT.nom}* — ${RESTAURANT.quartier}`,
      'Voici la carte du jour :',
      '',
    ]
    for (const c of CATEGORIES) {
      const groupe = plats.filter((p) => p.categorie === c)
      if (groupe.length === 0) continue
      lignes.push(`*${c}*`)
      for (const p of groupe) lignes.push(`• ${p.nom} — ${fcfa(p.prix)}`)
      lignes.push('')
    }
    lignes.push(`Commander : ${LIEN_MENU}`)
    lignes.push('Jërëjëf !')
    return lignes.join('\n')
  }, [plats])

  useEffect(() => {
    let annule = false
    QRCode.toDataURL(LIEN_MENU, {
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#0E0F12', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!annule) setQr(url)
      })
      .catch(() => {
        if (!annule) setQr(null)
      })
    return () => {
      annule = true
    }
  }, [])

  const partager = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Carte — ${RESTAURANT.nom}`, text: texte })
        return
      } catch {
        // partage refusé : on retombe sur WhatsApp
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texte)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(texte)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2200)
    } catch {
      // presse-papiers refusé : le texte reste lisible à l'écran
    }
  }

  const basculer = (c: Categorie) =>
    setRetenues((liste) =>
      liste.includes(c) ? liste.filter((x) => x !== c) : [...liste, c],
    )

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_20rem]">
      <Card className="flex flex-col gap-4">
        <CardTitle
          aside={
            <span className="text-[11px] text-muted-foreground tnum">
              {plats.length} plats retenus
            </span>
          }
        >
          Ce que tu envoies
        </CardTitle>

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const actif = retenues.includes(c)
            return (
              <button
                key={c}
                type="button"
                onClick={() => basculer(c)}
                aria-pressed={actif}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
                  actif
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                {c}
              </button>
            )
          })}
        </div>

        {/* Aperçu fidèle au message qui partira */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          {plats.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground text-pretty">
              Tout est décoché — garde au moins une catégorie, sinon le client
              reçoit une carte vide.
            </p>
          ) : (
            CATEGORIES.map((c) => {
              const groupe = plats.filter((p) => p.categorie === c)
              if (groupe.length === 0) return null
              return (
                <div key={c} className="flex flex-col gap-1.5">
                  <span className="font-display text-xs font-semibold tracking-wide text-primary uppercase">
                    {c}
                  </span>
                  <ul className="flex flex-col gap-1">
                    {groupe.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-baseline justify-between gap-3 text-sm"
                      >
                        <span className="min-w-0 truncate">{p.nom}</span>
                        <span className="shrink-0 font-medium tnum">
                          {fcfa(p.prix)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={partager}
            disabled={plats.length === 0}
            className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-40"
          >
            <ShareIcon className="size-4" />
            Envoyer sur WhatsApp
          </button>
          <button
            type="button"
            onClick={copier}
            disabled={plats.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3.5 text-sm font-medium transition-colors hover:bg-secondary/60 disabled:opacity-40"
          >
            {copie ? (
              <>
                <CheckIcon className="size-4 text-success" />
                Copié
              </>
            ) : (
              <>
                <CopyIcon className="size-4" />
                Copier le texte
              </>
            )}
          </button>
        </div>
      </Card>

      <Card className="flex flex-col items-center gap-3">
        <CardTitle aside={<Badge ton="primaire">click &amp; collect</Badge>}>
          QR à poser en salle
        </CardTitle>
        <div className="flex size-40 items-center justify-center overflow-hidden rounded-xl bg-white p-2">
          {qr ? (
            <img
              src={qr}
              alt={`QR du menu de ${RESTAURANT.nom}`}
              className="size-full object-contain"
            />
          ) : (
            <span className="text-xs text-neutral-500">Génération…</span>
          )}
        </div>
        <p className="text-center text-xs leading-relaxed text-muted-foreground text-pretty">
          Le client scanne, voit la carte avec les photos et commande à
          emporter. Rien à installer de son côté.
        </p>
        <span className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
          <QrCodeIcon className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate font-mono">{LIEN_MENU}</span>
        </span>
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <UtensilsCrossedIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
          Les prix suivent ta carte : une hausse en caisse est reprise ici tout
          de suite.
        </p>
      </Card>
    </div>
  )
}
