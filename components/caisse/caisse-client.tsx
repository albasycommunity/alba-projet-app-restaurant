'use client'

import { useState } from 'react'
import { ArrowRightIcon, ReceiptTextIcon, XIcon } from 'lucide-react'
import { fcfa } from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { Card, CardTitle, PageHeader, Sheet } from '@/components/kit'
import { GrillePlats } from '@/components/caisse/grille-plats'
import { Ticket } from '@/components/caisse/ticket'
import { Paiement } from '@/components/caisse/paiement'
import { cn } from '@/lib/utils'

/**
 * Caisse. Sur mobile le ticket vit dans un tiroir appelé par la barre
 * du bas, pour laisser tout l'écran aux plats. Sur grand écran les deux
 * colonnes cohabitent : plus aucun aller-retour.
 */
export function CaisseClient() {
  const { etat, envoyer, total } = useAlba()
  const [ticketOuvert, setTicketOuvert] = useState(false)
  const [paiementOuvert, setPaiementOuvert] = useState(false)

  const articles = etat.panier.reduce((n, l) => n + l.qte, 0)
  const vide = articles === 0

  const ouvrirPaiement = () => {
    if (vide) return
    setTicketOuvert(false)
    setPaiementOuvert(true)
    vibrer(14)
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-28 lg:pb-6">
        <PageHeader
          titre="Caisse"
          sous="Appuie sur un plat, choisis le moyen de paiement, c’est fini."
        />

        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <GrillePlats />

          {/* Colonne ticket — visible d'emblée sur grand écran */}
          <Card className="sticky top-24 hidden lg:flex lg:flex-col lg:gap-4">
            <CardTitle
              aside={
                !vide && (
                  <button
                    type="button"
                    onClick={() => envoyer({ type: 'viderPanier' })}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive"
                  >
                    <XIcon className="size-3.5" />
                    Vider
                  </button>
                )
              }
            >
              <span className="flex items-center gap-2">
                <ReceiptTextIcon className="size-4 text-primary" />
                Ticket en cours
                {!vide && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {articles} article{articles > 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </CardTitle>
            <Ticket />
            <button
              type="button"
              onClick={ouvrirPaiement}
              disabled={vide}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl px-4 py-4 font-display text-base font-semibold transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]',
                vide
                  ? 'cursor-not-allowed bg-secondary text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:brightness-110',
              )}
            >
              {vide ? 'Ticket vide' : `Encaisser ${fcfa(total)}`}
              {!vide && <ArrowRightIcon className="size-4" />}
            </button>
          </Card>
        </div>
      </div>

      {/* Barre de ticket mobile — toujours à portée de pouce */}
      {!vide && (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTicketOuvert(true)}
              className="flex min-w-0 flex-1 flex-col items-start"
            >
              <span className="text-[11px] text-muted-foreground">
                {articles} article{articles > 1 ? 's' : ''} — voir le ticket
              </span>
              <span className="font-display text-xl font-semibold tracking-tight tnum">
                {fcfa(total)}
              </span>
            </button>
            <button
              type="button"
              onClick={ouvrirPaiement}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-95"
            >
              Encaisser
              <ArrowRightIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tiroir ticket (mobile) */}
      <Sheet
        ouvert={ticketOuvert}
        onFermer={() => setTicketOuvert(false)}
        titre="Ticket en cours"
        sous={`${articles} article${articles > 1 ? 's' : ''} — ${fcfa(total)}`}
        pied={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                envoyer({ type: 'viderPanier' })
                setTicketOuvert(false)
              }}
              className="rounded-xl border border-border px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/45 hover:text-destructive"
            >
              Vider
            </button>
            <button
              type="button"
              onClick={ouvrirPaiement}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              Encaisser {fcfa(total)}
            </button>
          </div>
        }
      >
        <Ticket compact />
      </Sheet>

      <Paiement
        ouvert={paiementOuvert}
        onFermer={() => setPaiementOuvert(false)}
      />
    </>
  )
}
