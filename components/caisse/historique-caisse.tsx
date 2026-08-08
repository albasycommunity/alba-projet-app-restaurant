'use client'

import { useState } from 'react'
import { type Commande, fcfa } from '@/lib/data'
import { useAlba, vibrer, type Annulation } from '@/lib/store'
import { Sheet } from '@/components/kit'
import { LockIcon, Loader2Icon, TrashIcon, Undo2Icon, FileWarningIcon } from 'lucide-react'
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

  // IC-04 : filtre strict sur le jour courant (minuit → maintenant).
  // Les sessions longues ne mélangent plus les tickets de la veille.
  const debutJour = new Date()
  debutJour.setHours(0, 0, 0, 0)
  const debutJourTs = debutJour.getTime()

  const historiques = etat.commandes
    .filter((c) => c.reglements.length > 0 && c.recueA >= debutJourTs)
    .sort((a, b) => b.recueA - a.recueA)

  const [onglet, setOnglet] = useState<'tickets' | 'annulations'>('tickets')

  return (
    <>
      <Sheet
        ouvert={ouvert}
        onFermer={onFermer}
        titre="Historique du jour"
        sous="Tickets encaissés depuis minuit. L'annulation nécessite le code PIN Manager."
      >
        <div className="flex border-b border-border">
          <button
            type="button"
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              onglet === 'tickets' ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setOnglet('tickets')}
          >
            Tickets encaissés
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
              onglet === 'annulations' ? "border-destructive text-destructive" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setOnglet('annulations')}
          >
            Journal d'annulation
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 overflow-y-auto">
          {onglet === 'tickets' && (
            historiques.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Aucun ticket encaissé aujourd'hui.
              </p>
            ) : (
              historiques.map((c) => {
                const total = c.reglements.reduce((s, r) => s + r.montant, 0)
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-card-foreground">
                        Ticket {c.ref}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(c.recueA).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {fcfa(total)}
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
            )
          )}

          {onglet === 'annulations' && (
            etat.annulations.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Aucune annulation aujourd'hui.
              </p>
            ) : (
              etat.annulations.map((a: Annulation) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 p-4 shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium text-destructive">
                      <FileWarningIcon className="size-4" />
                      Ticket {a.commandeRef} annulé
                    </span>
                    <span className="text-sm text-destructive/80">
                      À {a.heure} • {fcfa(a.montant)}
                    </span>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </Sheet>

      <PinDialog
        commande={commandeAAnnuler}
        onFermer={() => setCommandeAAnnuler(null)}
        onValider={() => {
          if (commandeAAnnuler) {
            envoyer({ type: 'annulerCommande', commande: commandeAAnnuler })
          }
          notifier({
            ton: 'succes',
            titre: 'Ticket annulé',
            detail: 'La commande a été retirée et journalisée.',
          })
          vibrer(14)
          setCommandeAAnnuler(null)
          setOnglet('annulations')
        }}
      />
    </>
  )
}

/**
 * Dialogue de saisie du PIN manager.
 *
 * IC-01 : le PIN n'est plus comparé côté client. L'appel est envoyé à
 * POST /api/caisse/annuler — seul le serveur connaît le PIN réel
 * (variable d'environnement ALBA_PIN_MANAGER). La réponse 200/403
 * pilote l'annulation locale.
 */
function PinDialog({
  commande,
  onFermer,
  onValider,
}: {
  commande: Commande | null
  onFermer: () => void
  onValider: () => void
}) {
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState(false)
  const [enCours, setEnCours] = useState(false)

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commande || enCours) return

    const total = commande.reglements.reduce((s, r) => s + r.montant, 0)
    setEnCours(true)

    try {
      const res = await fetch('/api/caisse/annuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commandeId: commande.id,
          commandeRef: commande.ref,
          montant: total,
          pin,
        }),
      })

      if (res.ok) {
        setErreur(false)
        setPin('')
        onValider()
      } else {
        // 403 = PIN incorrect, 500 = erreur serveur
        setErreur(true)
        setPin('')
        vibrer(30)
      }
    } catch {
      // Hors ligne : on bloque l'annulation pour protéger l'audit
      setErreur(true)
      setPin('')
      vibrer(30)
    } finally {
      setEnCours(false)
    }
  }

  // Remise à zéro quand on ferme
  if (!commande) {
    if (pin !== '') setPin('')
    if (erreur) setErreur(false)
    return null
  }

  const total = commande.reglements.reduce((s, r) => s + r.montant, 0)

  return (
    <Sheet ouvert={!!commande} onFermer={onFermer} titre="Autorisation requise">
      <form onSubmit={soumettre} className="flex flex-col gap-6 p-4 pt-0">
        <p className="text-sm text-muted-foreground">
          L'annulation du ticket{' '}
          <strong>{commande.ref}</strong> d'un montant de{' '}
          <strong>{fcfa(total)}</strong> nécessite la validation d'un manager.
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor="pin" className="flex items-center gap-2 text-sm font-medium">
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
              'rounded-xl border border-border bg-background p-3 text-center text-2xl tracking-[0.5em] shadow-sm focus:outline-none focus:ring-1',
              erreur
                ? 'border-destructive focus:border-destructive focus:ring-destructive'
                : 'focus:border-primary focus:ring-primary',
            )}
            placeholder="••••"
            required
            autoFocus
            disabled={enCours}
          />
          {erreur && (
            <span className="animate-in slide-in-from-top-1 text-center text-sm font-medium text-destructive">
              Code PIN incorrect
            </span>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onFermer}
            disabled={enCours}
            className="rounded-xl bg-secondary px-4 py-2 font-medium text-secondary-foreground hover:brightness-95 disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="submit"
            disabled={pin.length < 4 || enCours}
            className="flex items-center gap-2 rounded-xl bg-destructive px-5 py-2 font-medium text-destructive-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {enCours ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <TrashIcon className="size-4" />
            )}
            {enCours ? 'Vérification…' : "Confirmer l'annulation"}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
