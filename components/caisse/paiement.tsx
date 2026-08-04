'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BanknoteIcon,
  DeleteIcon,
  QrCodeIcon,
  TrashIcon,
  WifiOffIcon,
} from 'lucide-react'
import {
  MODES_PAIEMENT,
  fcfa,
  type ModePaiement,
  type Reglement,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { useAuth } from '@/lib/auth-contexte'
import { Sheet } from '@/components/kit'
import { QrMarchand } from '@/components/caisse/qr-marchand'
import { Recu } from '@/components/caisse/recu'
import { cn } from '@/lib/utils'

const APPOINTS = [1000, 2000, 5000, 10000]

/**
 * Encaissement multi-mode. Chemin rapide : on choisit un moyen et tout
 * le reste y passe. Chemin partagé : on tape un montant, puis le moyen.
 */
export function Paiement({
  ouvert,
  onFermer,
}: {
  ouvert: boolean
  onFermer: () => void
}) {
  const { etat, envoyer, total, notifier } = useAlba()
  const { abonnement, actualiser } = useAuth()
  const router = useRouter()
  const [reglements, setReglements] = useState<Reglement[]>([])
  const [saisie, setSaisie] = useState('')
  const [qr, setQr] = useState(false)
  const [encaisse, setEncaisse] = useState<{
    ref: string
    reglements: Reglement[]
    total: number
  } | null>(null)

  useEffect(() => {
    if (ouvert) {
      setReglements([])
      setSaisie('')
      setQr(false)
      setEncaisse(null)
    }
  }, [ouvert])

  const paye = useMemo(
    () => reglements.reduce((s, r) => s + r.montant, 0),
    [reglements],
  )
  const reste = Math.max(0, total - paye)
  const rendu = Math.max(0, paye - total)
  const montantSaisi = Number(saisie || 0)
  const complet = paye >= total && total > 0

  const ajouter = (mode: ModePaiement) => {
    const montant = montantSaisi > 0 ? montantSaisi : reste
    if (montant <= 0) return
    setReglements((liste) => {
      const existant = liste.find((r) => r.mode === mode)
      return existant
        ? liste.map((r) =>
            r.mode === mode ? { ...r, montant: r.montant + montant } : r,
          )
        : [...liste, { mode, montant }]
    })
    setSaisie('')
    vibrer(12)
  }

  const valider = async () => {
    if (!complet) return
    // En découverte, chaque encaissement est une action réelle : la
    // consommation est non bloquante pour le rendu. Quota épuisé → 402,
    // on redirige vers l'activation SANS enregistrer le ticket. Erreur
    // réseau → fail-open : le ticket passe quand même (jamais perdu).
    if (
      abonnement?.statut === 'decouverte' &&
      (abonnement.decouverteActionsRestantes ?? 0) > 0
    ) {
      try {
        const reponse = await fetch('/api/back-office/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'encaisser' }),
        })
        if (reponse.status === 402) {
          router.push('/abonnement/renouveler?raison=activation-requise')
          return
        }
        actualiser()
      } catch {
        // Réseau indisponible : on laisse passer l'encaissement.
      }
    }
    const ref = `#${etat.prochainNumero}`
    const horsLigne = typeof navigator !== 'undefined' && !navigator.onLine
    envoyer({ type: 'encaisser', reglements, ref })
    vibrer([16, 40, 22])
    setEncaisse({ ref, reglements, total })
    notifier({
      ton: 'succes',
      titre: `Ticket ${ref} encaissé`,
      detail: horsLigne
        ? 'Gardé ici en sécurité — il partira au retour du réseau.'
        : 'La cuisine l’a reçu, le stock est à jour.',
    })
  }

  // Écran de succès : le ticket est passé, on célèbre puis on partage.
  if (encaisse) {
    return (
      <Sheet
        ouvert={ouvert}
        onFermer={onFermer}
        titre="C’est encaissé"
        sous={`Ticket ${encaisse.ref}`}
      >
        <Recu
          ref_={encaisse.ref}
          reglements={encaisse.reglements}
          total={encaisse.total}
          onTerminer={onFermer}
        />
      </Sheet>
    )
  }

  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Encaisser"
      sous="Choisis un moyen pour tout payer, ou tape un montant pour partager."
      large
      pied={
        <button
          type="button"
          onClick={valider}
          disabled={!complet}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-display text-base font-semibold transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]',
            complet
              ? 'bg-primary text-primary-foreground hover:brightness-110'
              : 'cursor-not-allowed bg-secondary text-muted-foreground',
          )}
        >
          <BanknoteIcon className="size-5" />
          {complet
            ? rendu > 0
              ? `Valider — rendre ${fcfa(rendu)}`
              : 'Valider l’encaissement'
            : `Reste ${fcfa(reste)}`}
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Ce qu'il reste à payer, impossible à manquer */}
        <div className="flex items-end justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {complet ? (rendu > 0 ? 'À rendre au client' : 'Tout est payé') : 'Reste à payer'}
            </span>
            <span
              className={cn(
                'font-display text-3xl font-semibold tracking-tight tnum',
                complet && rendu === 0 && 'text-success',
                rendu > 0 && 'text-warning',
              )}
            >
              {fcfa(rendu > 0 ? rendu : reste)}
            </span>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-right">
            <span className="text-[11px] text-muted-foreground">Total ticket</span>
            <span className="font-display text-base font-semibold tnum">
              {fcfa(total)}
            </span>
          </div>
        </div>

        {/* Montant partiel saisi */}
        {saisie !== '' && (
          <div className="animate-pop flex items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/8 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">
              Montant à affecter
            </span>
            <span className="font-display text-lg font-semibold text-primary tnum">
              {fcfa(montantSaisi)}
            </span>
          </div>
        )}

        {/* Moyens de paiement — grosses cibles */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Moyen de paiement
          </span>
          <div className="grid grid-cols-2 gap-2">
            {MODES_PAIEMENT.map((m) => {
              const dejaMis = reglements.find((r) => r.mode === m.mode)
              return (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => ajouter(m.mode)}
                  disabled={reste === 0 && montantSaisi === 0}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.97] disabled:opacity-40',
                    dejaMis
                      ? 'border-success/50 bg-success/8'
                      : 'border-border bg-card hover:border-primary/45',
                  )}
                >
                  <span className="flex w-full items-center gap-2">
                    <span
                      className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-background"
                      style={{ background: m.couleur }}
                      aria-hidden="true"
                    >
                      {m.raccourci}
                    </span>
                    <span className="min-w-0 truncate text-sm font-medium">
                      {m.mode}
                    </span>
                  </span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    {dejaMis ? fcfa(dejaMis.montant) : 'Appuyer pour affecter'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Règlements déjà posés */}
        {reglements.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {reglements.map((r) => (
              <li
                key={r.mode}
                className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2"
              >
                <span className="text-sm">{r.mode}</span>
                <span className="ml-auto font-display text-sm font-semibold tnum">
                  {fcfa(r.montant)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setReglements((liste) =>
                      liste.filter((x) => x.mode !== r.mode),
                    )
                  }
                  aria-label={`Retirer le règlement ${r.mode}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive"
                >
                  <TrashIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Appoints fréquents — calcul du rendu sans réfléchir */}
        <div className="flex flex-wrap gap-1.5">
          {APPOINTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setSaisie(String(a))}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/45 hover:text-foreground tnum"
            >
              {fcfa(a)}
            </button>
          ))}
          {reste > 0 && (
            <button
              type="button"
              onClick={() => setSaisie(String(reste))}
              className="rounded-lg border border-primary/40 bg-primary/8 px-3 py-1.5 text-xs font-medium text-primary tnum"
            >
              Reste exact
            </button>
          )}
        </div>

        {/* Pavé numérique — utilisable au pouce, sans clavier système */}
        <div className="grid grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSaisie((s) => (s + t).slice(0, 8))}
              className="rounded-xl border border-border bg-card py-3.5 font-display text-lg font-semibold transition-transform duration-200 ease-[var(--ease-spring)] active:scale-95 tnum"
            >
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSaisie((s) => s.slice(0, -1))}
            aria-label="Effacer un chiffre"
            className="flex items-center justify-center rounded-xl border border-border bg-card py-3.5 text-muted-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-95"
          >
            <DeleteIcon className="size-5" />
          </button>
        </div>

        {/* QR marchand — le client paie lui-même depuis son téléphone */}
        <button
          type="button"
          onClick={() => setQr((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm font-medium transition-colors hover:border-primary/45"
        >
          <QrCodeIcon className="size-4 text-primary" />
          {qr ? 'Masquer le QR marchand' : 'Afficher le QR marchand'}
          <span className="ml-auto text-[11px] text-muted-foreground tnum">
            {fcfa(reste > 0 ? reste : total)}
          </span>
        </button>

        {qr && <QrMarchand montant={reste > 0 ? reste : total} />}

        <p className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3 text-xs leading-relaxed text-muted-foreground">
          <WifiOffIcon className="mt-0.5 size-3.5 shrink-0" />
          Même sans réseau, l’encaissement est enregistré ici et repart tout seul
          plus tard. Aucun ticket ne se perd.
        </p>
      </div>
    </Sheet>
  )
}
