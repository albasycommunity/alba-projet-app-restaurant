'use client'

import { useState } from 'react'
import { PIN_MANAGER, Commande, fcfa } from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { Sheet } from '@/components/kit'
import { LockIcon, TrashIcon, Undo2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HistoriqueCaisseSheet({
  ouvert,
  onFermer,
}: {
  ouvert: boolean
  onFermer: () => void
}) {
  const { etat, envoyer, notifier } = useAlba()
  const [commandeAAnnuler, setCommandeAAnnuler] = useState<Commande | null>(null)
  
  // N'afficher que les commandes du jour (par simplicité pour le moment on affiche toutes celles de l'état)
  // On pourrait filtrer les commandes avec `statut === 'servie'`
  const historiques = etat.commandes.filter(c => c.reglements.length > 0).sort((a, b) => b.recueA - a.recueA)

  return (
    <>
      <Sheet
        ouvert={ouvert}
        onFermer={onFermer}
        titre="Historique de la journée"
        sous="Consulter les tickets encaissés et annuler en cas d'erreur (Nécessite le code PIN Manager)."
      >
        <div className="flex flex-col gap-4 p-4">
          {historiques.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucun ticket encaissé.</p>
          ) : (
            historiques.map((c) => {
              const total = c.reglements.reduce((s, r) => s + r.montant, 0)
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-card-foreground">Ticket {c.ref}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(c.recueA).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} • {fcfa(total)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCommandeAAnnuler(c)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Undo2Icon className="size-4" />
                    Annuler
                  </button>
                </div>
              )
            })
          )}
        </div>
      </Sheet>

      <PinDialog 
        commande={commandeAAnnuler} 
        onFermer={() => setCommandeAAnnuler(null)} 
        onValider={(id) => {
          envoyer({ type: 'annulerCommande', id })
          notifier({
            ton: 'succes',
            titre: 'Ticket annulé',
            detail: 'La commande a été retirée de la caisse.',
          })
          vibrer(14)
          setCommandeAAnnuler(null)
        }} 
      />
    </>
  )
}

function PinDialog({ 
  commande, 
  onFermer, 
  onValider 
}: { 
  commande: Commande | null
  onFermer: () => void
  onValider: (id: string) => void
}) {
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState(false)

  const soumettre = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commande) return
    
    if (pin === PIN_MANAGER) {
      setErreur(false)
      onValider(commande.id)
      setPin('')
    } else {
      setErreur(true)
      setPin('')
      vibrer(30)
    }
  }

  // Remise à zéro quand on ouvre
  if (!commande) {
    if (pin !== '') setPin('')
    if (erreur) setErreur(false)
    return null
  }

  const total = commande.reglements.reduce((s, r) => s + r.montant, 0)

  return (
    <Sheet
      ouvert={!!commande}
      onFermer={onFermer}
      titre="Autorisation requise"
    >
      <form onSubmit={soumettre} className="flex flex-col gap-6 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          L'annulation du ticket <strong>{commande.ref}</strong> d'un montant de <strong>{fcfa(total)}</strong> nécessite la validation d'un manager.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="pin" className="text-sm font-medium flex items-center gap-2">
            <LockIcon className="size-4" /> Code PIN Manager
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setErreur(false)
            }}
            className={cn(
              "rounded-xl border border-border bg-background p-3 text-center text-2xl tracking-[0.5em] shadow-sm focus:outline-none focus:ring-1",
              erreur ? "border-destructive focus:border-destructive focus:ring-destructive" : "focus:border-primary focus:ring-primary"
            )}
            placeholder="••••"
            required
            autoFocus
          />
          {erreur && (
            <span className="text-sm text-destructive font-medium text-center animate-in slide-in-from-top-1">
              Code PIN incorrect
            </span>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onFermer}
            className="rounded-xl bg-secondary px-4 py-2 font-medium text-secondary-foreground hover:brightness-95"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={pin.length < 4}
            className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 font-medium text-destructive-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <TrashIcon className="size-4" />
            Confirmer l'annulation
          </button>
        </div>
      </form>
    </Sheet>
  )
}
