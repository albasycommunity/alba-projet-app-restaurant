'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2Icon,
  CreditCardIcon,
  LoaderIcon,
  SmartphoneIcon,
  XCircleIcon,
} from 'lucide-react'
import { Badge, Card, CardTitle, PageHeader } from '@/components/kit'
import {
  PLANS_ABONNEMENT,
  type ModePaiementAbonnement,
  type PlanAbonnement,
} from '@/lib/auth'
import { fcfa } from '@/lib/data'

type ModePaiementVue = { mode: ModePaiementAbonnement; numero: string }

type Donnees = {
  abonnement: {
    statut: 'actif' | 'essai' | 'expire' | 'en_attente'
    plan: PlanAbonnement
    montant: number
    dateFin: string
    joursRestants: number
  } | null
  restaurant: { nom: string } | null
  paiement?: {
    naboopayActif: boolean
    naboopayMock: boolean
    modes: ModePaiementVue[]
  }
}

export default function PageRenouveler() {
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [plan, setPlan] = useState<PlanAbonnement>('mensuel')
  const [mode, setMode] = useState<ModePaiementAbonnement | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [naboopayErreur, setNaboopayErreur] = useState<{
    message: string
    proposeManuel: boolean
  } | null>(null)
  const [simulation, setSimulation] = useState<{
    orderId: string
    enTravail: boolean
    ok: boolean | null
  } | null>(null)
  const [parametresUrl, setParametresUrl] = useState<URLSearchParams | null>(
    null,
  )
  const chargementBanniere = useRef(false)

  useEffect(() => {
    fetch('/api/back-office/abonnement', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: Donnees) => {
        setDonnees(d)
        const params = new URLSearchParams(window.location.search)
        setParametresUrl(params)
        const mockCheckout = params.get('mock_checkout')
        if (mockCheckout) {
          setSimulation({ orderId: mockCheckout, enTravail: false, ok: null })
        }
      })
      .catch(() => setDonnees(null))
  }, [])

  // Retour de checkout : un paiement réussi doit activer l'abonnement.
  // Le webhook arrive généralement avant la redirection ; si ce n'est pas
  // le cas, on relit le statut toutes les 3 secondes (10 tentatives max).
  const abonnementStatut = donnees?.abonnement?.statut
  useEffect(() => {
    if (
      !parametresUrl?.get('paiement') ||
      abonnementStatut === 'actif' ||
      chargementBanniere.current
    ) {
      return
    }
    chargementBanniere.current = true
    let tentatives = 0
    const intervalle = setInterval(async () => {
      tentatives += 1
      const r = await fetch('/api/back-office/abonnement', {
        cache: 'no-store',
      })
      const d = await r.json()
      setDonnees(d)
      if (d?.abonnement?.statut === 'actif' || tentatives >= 10) {
        clearInterval(intervalle)
        chargementBanniere.current = false
      }
    }, 3000)
    return () => {
      clearInterval(intervalle)
      chargementBanniere.current = false
    }
  }, [parametresUrl, abonnementStatut])

  const statut = donnees?.abonnement?.statut
  const paiement = PLANS_ABONNEMENT[plan]
  const modes = donnees?.paiement?.modes ?? []
  const naboopayActif = donnees?.paiement?.naboopayActif ?? false
  const naboopayMock = donnees?.paiement?.naboopayMock ?? false
  const numero = modes.find((m) => m.mode === mode)?.numero

  async function payerEnLigne() {
    setNaboopayErreur(null)
    setErreur(null)
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/back-office/abonnement/renouveler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, naboopay: true }),
      })
      const d = await reponse.json()
      if (!d.ok) {
        setNaboopayErreur({
          message: d.erreur ?? 'Impossible de démarrer le paiement.',
          proposeManuel: d.proposeManuel ?? true,
        })
        return
      }
      if (d.checkoutUrl) {
        window.location.href = d.checkoutUrl
        return
      }
    } catch {
      setNaboopayErreur({
        message: 'Le serveur ne répond pas. Réessaie dans un instant.',
        proposeManuel: true,
      })
    } finally {
      setEnvoi(false)
    }
  }

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
      const d = await reponse.json()
      if (!reponse.ok || !d.ok) {
        setErreur(d.erreur ?? 'Demande impossible.')
        return
      }
      setConfirme(true)
      setMessage(d.message)
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setEnvoi(false)
    }
  }

  async function simulerPaiement() {
    if (!simulation) return
    setSimulation({ ...simulation, enTravail: true })
    try {
      const reponse = await fetch('/api/back-office/abonnement/mock-paiement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: simulation.orderId }),
      })
      const d = await reponse.json()
      setSimulation({
        orderId: simulation.orderId,
        enTravail: false,
        ok: reponse.ok && d.ok === true,
      })
      setMessage(d.message ?? null)
      const r = await fetch('/api/back-office/abonnement', {
        cache: 'no-store',
      })
      setDonnees(await r.json())
    } catch {
      setSimulation({ ...simulation, enTravail: false, ok: false })
      setMessage(null)
      setErreur('Le serveur ne répond pas.')
    }
  }

  const paiementReussi = parametresUrl?.get('paiement') === 'succes'
  const paiementErreur = parametresUrl?.get('paiement') === 'erreur'

  return (
    <div className="flex flex-col">
      <PageHeader
        titre="Renouveler l’abonnement"
        sous={
          naboopayActif
            ? 'Paiement automatique : choisis ton plan et paie en ligne — l’abonnement s’active instantanément. Le paiement manuel reste disponible en secours.'
            : 'Paye par Wave, Orange Money ou Free Money. Dès réception, le super admin active l’abonnement et le back-office rouvre.'
        }
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        {paiementReussi && abonnementStatut !== 'actif' && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <LoaderIcon className="size-5 shrink-0 animate-spin text-warning" />
            <p className="text-sm text-muted-foreground">
              Paiement reçu ! L’abonnement est en cours d’activation
              automatique…
            </p>
          </div>
        )}
        {paiementReussi && abonnementStatut === 'actif' && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-success/30 bg-success/8 p-4">
            <CheckCircle2Icon className="size-5 shrink-0 text-success" />
            <p className="text-sm text-muted-foreground">
              Paiement confirmé — ton abonnement est actif, le back-office est
              rouvert.
            </p>
          </div>
        )}
        {paiementErreur && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
            <XCircleIcon className="size-5 shrink-0 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Le paiement en ligne a été annulé ou n’a pas abouti. Tu peux
              réessayer ci-dessous ou utiliser le paiement manuel.
            </p>
          </div>
        )}

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

        {simulation && naboopayMock && (
          <Card className="border-dashed border-primary/40">
            <CardTitle
              aside={<Badge ton="attention">Mode simulation</Badge>}
            >
              Checkout simulé (NabooPay)
            </CardTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Aucune clé API réelle : c'est ici que NabooPay afficherait sa
              page de paiement. Clique ci-dessous pour simuler la confirmation
              de paiement — le webhook est signé avec le vrai secret puis
              vérifié comme en production.
            </p>
            {simulation.ok === true && (
              <p className="mt-3 rounded-lg border border-success/30 bg-success/8 px-3 py-2.5 text-xs text-success">
                {message}
              </p>
            )}
            {simulation.ok === false && (
              <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {erreur ?? 'La simulation a échoué.'}
              </p>
            )}
            <button
              type="button"
              disabled={simulation.enTravail}
              onClick={simulerPaiement}
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
            >
              {simulation.enTravail ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                'Simuler un paiement réussi'
              )}
            </button>
          </Card>
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
          <div className="flex flex-col gap-4">
            {naboopayActif && (
              <Card className="border-primary/40">
                <CardTitle
                  aside={
                    naboopayMock ? (
                      <Badge ton="attention">Simulation</Badge>
                    ) : (
                      <Badge ton="succes">Automatique</Badge>
                    )
                  }
                >
                  Paiement en ligne
                </CardTitle>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Tu es redirigé vers la page de paiement sécurisée. Dès la
                  confirmation, l’abonnement s’active automatiquement — sans
                  attente du super admin.
                </p>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={payerEnLigne}
                  className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
                >
                  {envoi ? (
                    <LoaderIcon className="size-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCardIcon className="size-4" />
                      {naboopayMock
                        ? 'Démarrer le paiement (simulé)'
                        : `Payer ${fcfa(paiement.montant)} en ligne`}
                    </>
                  )}
                </button>

                {naboopayErreur && (
                  <div className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5">
                    <p className="text-xs text-destructive">{naboopayErreur.message}</p>
                    {naboopayErreur.proposeManuel && (
                      <button
                        type="button"
                        onClick={() => setNaboopayErreur(null)}
                        className="mt-2 text-[11px] font-medium text-primary underline underline-offset-2"
                      >
                        Revenir au paiement manuel ci-dessous
                      </button>
                    )}
                  </div>
                )}
              </Card>
            )}

            <Card>
              <CardTitle
                aside={
                  naboopayActif ? (
                    <Badge ton="neutre">Secours</Badge>
                  ) : undefined
                }
              >
                2 · Paiement mobile money
              </CardTitle>
              <div className="flex flex-col gap-2">
                {modes.map((m) => {
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
                        <p className="text-[11px] text-muted-foreground tnum">
                          {m.numero || 'Numéro non configuré'}
                        </p>
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
                    Envoie{' '}
                    <span className="font-semibold text-foreground">
                      {fcfa(paiement.montant)}
                    </span>{' '}
                    au {numero} ({mode}), puis confirme ci-dessous. Le super
                    admin valide dès réception.
                  </p>
                </div>
              )}
              {mode && !numero && (
                <div className="mt-4 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
                  <p className="text-xs text-destructive">
                    Numéro de réception non configuré par le super admin —
                    contacte-le pour finaliser le paiement.
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
    </div>
  )
}
