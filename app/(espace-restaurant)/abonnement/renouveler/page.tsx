'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2Icon,
  LoaderIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { Badge, Card, CardTitle, PageHeader } from '@/components/kit'
import {
  MODES_PAIEMENT_ABONNEMENT,
  PLANS_ABONNEMENT,
  type ModePaiementAbonnement,
  type PlanAbonnement,
} from '@/lib/auth'
import { fcfa } from '@/lib/data'

type Donnees = {
  abonnement: {
    statut: 'actif' | 'essai' | 'expire' | 'en_attente'
    plan: PlanAbonnement
    montant: number
    dateFin: string
    joursRestants: number
  } | null
  restaurant: { nom: string } | null
}

export default function PageRenouveler() {
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [plan, setPlan] = useState<PlanAbonnement>('mensuel')
  const [mode, setMode] = useState<ModePaiementAbonnement | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/back-office/abonnement', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setDonnees)
      .catch(() => setDonnees(null))
  }, [])

  const statut = donnees?.abonnement?.statut
  const paiement = PLANS_ABONNEMENT[plan]
  const numero = MODES_PAIEMENT_ABONNEMENT.find((m) => m.mode === mode)?.numero

  async function confirmerPaiement() {
    if (!mode) return
    setErreur(null)
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/back-office/abonnement/renouveler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, mode }),
      })
      const donnees2 = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees2.erreur ?? 'Demande impossible.')
        return
      }
      setConfirme(true)
      setMessage(donnees2.message)
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        titre="Renouveler l’abonnement"
        sous="Paye par Wave, Orange Money ou Free Money. Dès réception, le super admin active l’abonnement et le back-office rouvre."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        {statut === 'actif' && donnees?.abonnement && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-success/25 bg-success/8 p-4">
            <CheckCircle2Icon className="size-5 shrink-0 text-success" />
            <p className="text-sm text-muted-foreground">
              Ton abonnement est déjà actif jusqu'au{' '}
              {new Date(donnees.abonnement.dateFin).toLocaleDateString('fr-FR')}.
              Tu peux quand même renouveler par avance.
            </p>
          </div>
        )}

        {statut === 'essai' && donnees?.abonnement && (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-xl border p-4 ${
              donnees.abonnement.joursRestants >= 0
                ? 'border-primary/30 bg-primary/8'
                : 'border-destructive/25 bg-destructive/10'
            }`}
          >
            <CheckCircle2Icon
              className={
                donnees.abonnement.joursRestants >= 0
                  ? 'size-5 shrink-0 text-primary'
                  : 'size-5 shrink-0 text-destructive'
              }
            />
            <p className="text-sm text-muted-foreground">
              {donnees.abonnement.joursRestants >= 0 ? (
                <>
                  Ton essai gratuit court jusqu'au{' '}
                  <span className="font-medium text-foreground">
                    {new Date(donnees.abonnement.dateFin).toLocaleDateString('fr-FR')}
                  </span>
                  {' '}({donnees.abonnement.joursRestants} jour
                  {donnees.abonnement.joursRestants > 1 ? 's' : ''} restant
                  {donnees.abonnement.joursRestants > 1 ? 's' : ''}). Passe au
                  plan payant maintenant pour continuer sans interruption.
                </>
              ) : (
                <>
                  Ton essai gratuit est{' '}
                  <span className="font-medium text-foreground">terminé</span>.
                  Choisis un plan pour rouvrir le back-office.
                </>
              )}
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Choix du plan */}
          <Card>
            <CardTitle>1 · Choisis ton plan</CardTitle>
            <div className="flex flex-col gap-3">
              {(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((p) => {
                const offre = PLANS_ABONNEMENT[p]
                const actif = plan === p
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlan(p)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-300 ease-[var(--ease-spring)] ${
                      actif
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-background hover:border-primary/30'
                    }`}
                  >
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        actif ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {actif && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{offre.libelle}</p>
                      <p className="text-[11px] text-muted-foreground">{offre.detail}</p>
                    </div>
                    <span className="font-display text-base font-semibold tnum">
                      {fcfa(offre.montant)}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Paiement */}
          <Card>
            <CardTitle>2 · Paiement mobile money</CardTitle>
            <div className="flex flex-col gap-2">
              {MODES_PAIEMENT_ABONNEMENT.map((m) => {
                const actif = mode === m.mode
                return (
                  <button
                    key={m.mode}
                    type="button"
                    onClick={() => setMode(m.mode)}
                    className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-300 ease-[var(--ease-spring)] ${
                      actif
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border bg-background hover:border-primary/30'
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <SmartphoneIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{m.mode}</p>
                      <p className="text-[11px] text-muted-foreground tnum">{m.numero}</p>
                    </div>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        actif ? 'border-primary' : 'border-border'
                      }`}
                    >
                      {actif && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                  </button>
                )
              })}
            </div>

            {mode && numero && (
              <div className="mt-4 rounded-xl border border-border bg-secondary/50 p-4">
                <p className="text-xs text-muted-foreground">
                  Envoie <span className="font-semibold text-foreground">{fcfa(paiement.montant)}</span>{' '}
                  au {numero} ({mode}), puis confirme ci-dessous. Le super admin
                  valide dès réception.
                </p>
              </div>
            )}

            <button
              type="button"
              disabled={!mode || envoi}
              onClick={confirmerPaiement}
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
            >
              {envoi ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                `J’ai payé ${mode ? fcfa(paiement.montant) : ''}`
              )}
            </button>

            {erreur && (
              <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {erreur}
              </p>
            )}

            {confirme && (
              <div className="mt-4 animate-rise rounded-xl border border-success/30 bg-success/8 p-4">
                <Badge ton="succes">Demande enregistrée</Badge>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {message}
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
