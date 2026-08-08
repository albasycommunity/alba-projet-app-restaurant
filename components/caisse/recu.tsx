'use client'

import { useMemo, useState, useEffect } from 'react'
import { PrinterIcon, ShareIcon, SparklesIcon, DownloadIcon } from 'lucide-react'
import { RESTAURANT, fcfa, type Reglement } from '@/lib/data'
import { useAlba } from '@/lib/store'
import { TicketThermique } from './ticket-thermique'

/**
 * Confirmation d'encaissement : le billet se dépose dans la jauge de caisse,
 * la coche se trace, puis on partage le reçu. Célébration courte si
 * l'objectif du jour vient de tomber.
 */
export function Recu({
  ref_,
  reglements,
  total,
  lignes,
  onTerminer,
}: {
  ref_: string
  reglements: Reglement[]
  total: number
  lignes: any[]
  onTerminer: () => void
}) {
  const { indicateurs, etat } = useAlba()
  const objectifAtteint = indicateurs.caJour >= etat.objectifJour
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const texteRecu = useMemo(() => {
    const lignes = [
      `Reçu ${ref_} — ${RESTAURANT.nom}`,
      `Total : ${fcfa(total)}`,
      ...reglements.map((r) => `• ${r.mode} : ${fcfa(r.montant)}`),
      '',
      'Jërëjëf pour ta visite !',
    ]
    return lignes.join('\n')
  }, [ref_, reglements, total])

  const partager = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `Reçu ${ref_}`, text: texteRecu })
        return
      } catch {
        // partage refusé : on retombe sur WhatsApp
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(texteRecu)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const imprimerTicket = () => {
    window.print()
  }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Zone cachée à l'écran, visible uniquement pour l'impression thermique */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-50">
        <TicketThermique
          ref_={ref_}
          reglements={reglements}
          total={total}
          lignes={lignes}
        />
      </div>
      {/* Jauge de caisse : le billet tombe dedans */}
      <div className="relative flex h-36 w-full max-w-56 items-end justify-center">
        {objectifAtteint && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-2"
          >
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="animate-confetti size-1.5 rounded-sm"
                style={{
                  background:
                    i % 2 === 0 ? 'var(--primary)' : 'var(--accent)',
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* le billet */}
        <div
          className="animate-billet absolute top-6 flex h-14 w-24 items-center justify-center rounded-md border border-primary/40 bg-gradient-to-br from-primary/85 to-accent/85 shadow-lg"
          aria-hidden="true"
        >
          <span className="font-display text-[10px] font-bold text-primary-foreground tnum">
            {fcfa(total)}
          </span>
        </div>

        {/* le tiroir */}
        <div className="relative z-10 h-16 w-full rounded-b-2xl rounded-t-md border border-border bg-secondary/80 shadow-[inset_0_6px_14px_-8px_oklch(0_0_0/60%)]">
          <div className="absolute inset-x-6 top-2 h-1 rounded-full bg-border" />
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              className="size-6 text-success"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path className="animate-coche" d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-display text-sm font-semibold text-success">
              Encaissé
            </span>
          </div>
        </div>
      </div>

      {objectifAtteint && (
        <p className="flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1.5 text-xs font-medium text-primary">
          <SparklesIcon className="size-3.5" />
          Objectif du jour atteint. Belle journée.
        </p>
      )}

      {/* Détail du reçu */}
      <div className="w-full rounded-xl border border-border bg-card p-4">
        <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border pb-2.5">
          <span className="font-display text-sm font-semibold">
            Reçu {ref_}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {RESTAURANT.nom}
          </span>
        </div>
        <ul className="flex flex-col gap-1.5 py-2.5">
          {reglements.map((r) => (
            <li
              key={r.mode}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{r.mode}</span>
              <span className="font-medium tnum">{fcfa(r.montant)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-border pt-2.5">
          <span className="text-sm font-medium">Total</span>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={imprimerTicket}
              className="flex size-14 items-center justify-center rounded-full bg-secondary text-foreground transition-transform duration-300 hover:scale-105 active:scale-95"
              aria-label="Imprimer le ticket"
            >
              <PrinterIcon className="size-6" />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Imprimer
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={partager}
          className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3.5 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
        >
          <ShareIcon className="size-4" />
          Envoyer le reçu sur WhatsApp
        </button>

        <button
          type="button"
          onClick={onTerminer}
          className="rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
        >
          Ticket suivant
        </button>
      </div>
    </div>
  )
}
