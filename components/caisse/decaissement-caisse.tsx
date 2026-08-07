'use client'

import { useState } from 'react'
import { useAlba, vibrer } from '@/lib/store'
import { Sheet } from '@/components/kit'
import { WalletIcon } from 'lucide-react'

export function DecaissementSheet({
  ouvert,
  onFermer,
}: {
  ouvert: boolean
  onFermer: () => void
}) {
  const { envoyer, notifier, etat } = useAlba()
  const [montant, setMontant] = useState('')
  const [motif, setMotif] = useState('')
  
  const caissier = etat.equipe.find((e) => e.caisse && e.statut !== 'absent')

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    const m = parseInt(montant, 10)
    if (isNaN(m) || m <= 0) return
    if (!motif.trim()) return

    envoyer({
      type: 'ajouterDecaissement',
      montant: m,
      motif: motif.trim(),
      parId: caissier?.id,
    })
    
    notifier({
      ton: 'alerte',
      titre: 'Décaissement enregistré',
      detail: `${m} FCFA retirés de la caisse pour : ${motif.trim()}`,
    })
    
    vibrer(14)
    setMontant('')
    setMotif('')
    onFermer()
  }

  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Faire un décaissement"
      sous="Sortir des espèces de la caisse pour une dépense du jour."
    >
      <form onSubmit={soumettre} className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="montant" className="text-sm font-medium">
            Montant à sortir (FCFA)
          </label>
          <input
            id="montant"
            type="number"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="rounded-xl border border-border bg-background p-3 text-lg font-semibold shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: 2000"
            required
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="motif" className="text-sm font-medium">
            Motif (obligatoire)
          </label>
          <input
            id="motif"
            type="text"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className="rounded-xl border border-border bg-background p-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Achat de glaçons"
            required
          />
        </div>

        <button
          type="submit"
          disabled={!montant || !motif}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-destructive px-5 py-3 font-semibold text-destructive-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <WalletIcon className="size-4" />
          Retirer les espèces
        </button>
      </form>
    </Sheet>
  )
}
