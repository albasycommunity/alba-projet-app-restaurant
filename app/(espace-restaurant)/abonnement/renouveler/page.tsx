'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2Icon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LoaderIcon,
  LockKeyholeIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  SmartphoneIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react'
import { Badge, Card, CardTitle, PageHeader } from '@/components/kit'
import {
  LIBELLE_PALIER,
  PALIERS_ABONNEMENT,
  PLANS_ABONNEMENT,
  montantPalier,
  type ModePaiementAbonnement,
  type PalierAbonnement,
  type PlanAbonnement,
} from '@/lib/auth'
import { fcfa, nombreFormate } from '@/lib/data'

type ModePaiementVue = { mode: ModePaiementAbonnement; numero: string }

type Donnees = {
  abonnement: {
    statut: 'actif' | 'decouverte' | 'expire' | 'en_attente'
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

const MESSAGES_RAISON: Record<string, string> = {
  'activation-requise':
    'Tu as exploré Alba en mode découverte. Tes 3 actions réelles (encaissements, création d’employés) sont consommées — choisis un plan pour continuer à encaisser, créer tes plats et développer ton équipe.',
  'module-verrouille':
    'Un module que tu essaies d’ouvrir n’est pas inclus dans ton plan actuel. Passe au plan Pro pour débloquer Stock, Hygiène et Pilotage.',
  'limite-staff':
    'Ton plan Starter inclut 1 membre du personnel. Passe au plan Pro pour une équipe illimitée.',
  'multi-etablissement':
    'La gestion de plusieurs établissements est réservée au plan Premium.',
}

/** Caps commerciaux affichés sur chaque carte — affichage uniquement. */
type CapsPlan = {
  membresEquipe: string
  commandesMois: number
  clientsEnregistres: number
  referencesStock: number | null
  etablissements: number
  modules: string
}

const CAPS_PLANS: Record<PalierAbonnement, CapsPlan> = {
  starter: {
    membresEquipe: '1',
    commandesMois: 400,
    clientsEnregistres: 50,
    referencesStock: null,
    etablissements: 1,
    modules: 'Caisse, Cuisine, Équipe, Clients',
  },
  pro: {
    membresEquipe: 'Illimitée',
    commandesMois: 5_000,
    clientsEnregistres: 1_000,
    referencesStock: 150,
    etablissements: 1,
    modules: '+ Stock, Hygiène, Pilotage',
  },
  premium: {
    membresEquipe: 'Illimitée',
    commandesMois: 25_000,
    clientsEnregistres: 10_000,
    referencesStock: 1_000,
    etablissements: 3,
    modules: 'Tous + multi-établissements',
  },
}

export default function PageRenouveler() {
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [palier, setPalier] = useState<PalierAbonnement>('pro')
  const [periodicite, setPeriodicite] = useState<PlanAbonnement>('mensuel')
  const [mode, setMode] = useState<ModePaiementAbonnement | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [confirme, setConfirme] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [raison, setRaison] = useState<string | null>(null)
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
        // Cible venue d'un verrou (proxy) : le plan correspondant est
        // présélectionné, la raison affichée en bannière.
        const cible = params.get('plan')
        if (cible === 'pro' || cible === 'premium' || cible === 'starter') {
          setPalier(cible)
        } else {
          // Funnel : l'intention enregistrée lors de l'inscription depuis
          // la grille des tarifs est reprise ici (pré-sélection).
          try {
            const intention = JSON.parse(
              window.localStorage.getItem('alba:plan-intention') ?? 'null',
            ) as { palier?: string; plan?: string } | null
            if (
              intention?.palier &&
              (intention.palier === 'starter' ||
                intention.palier === 'pro' ||
                intention.palier === 'premium')
            ) {
              setPalier(intention.palier)
              if (intention.plan === 'annuel') setPeriodicite('annuel')
            }
          } catch {
            // intention illisible : valeurs par défaut
          }
        }
        const raison = params.get('raison')
        if (raison) setRaison(raison)
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
  const montant = montantPalier(palier, periodicite)
  const economiesAnnuel =
    12 * montantPalier(palier, 'mensuel') - montantPalier(palier, 'annuel')
  const modes = donnees?.paiement?.modes ?? []
  const naboopayActif = donnees?.paiement?.naboopayActif ?? false
  const naboopayMock = donnees?.paiement?.naboopayMock ?? false
  const numero = modes.find((m) => m.mode === mode)?.numero

  const titreHeader =
    raison === 'activation-requise'
      ? 'Active ton restaurant'
      : raison === 'module-verrouille'
        ? 'Débloque ce module'
        : 'Choisis ton plan'
  const sousHeader =
    raison === 'activation-requise'
      ? 'Passe à un plan payant et tout redevient disponible en quelques secondes.'
      : raison === 'module-verrouille'
        ? MESSAGES_RAISON['module-verrouille']
        : 'Continue à encaisser, créer des plats et gérer ton équipe sans limite.'

  async function payerEnLigne() {
    setNaboopayErreur(null)
    setErreur(null)
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/back-office/abonnement/renouveler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: periodicite, palier, naboopay: true }),
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
        body: JSON.stringify({ plan: periodicite, palier, mode }),
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
      <PageHeader titre={titreHeader} sous={sousHeader} />

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
          <div className="animate-rise flex flex-col gap-4 rounded-xl border border-success/25 bg-success/8 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2Icon className="size-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold">
                  Bienvenue dans Alba — ton établissement est actif !
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                  Le back-office est rouvert. Voici trois actions pour bien
                  démarrer :
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/caisse"
                className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
              >
                <ReceiptTextIcon className="size-4" />
                Ouvrir la caisse
              </Link>
              <Link
                href="/equipe"
                className="flex h-10 items-center gap-2 rounded-lg border bg-background px-4 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <UsersIcon className="size-4" />
                Gérer mon équipe
              </Link>
              <Link
                href="/back-office"
                className="flex h-10 items-center gap-2 rounded-lg border bg-background px-4 text-xs font-medium transition-colors hover:bg-secondary"
              >
                <LayoutDashboardIcon className="size-4" />
                Voir le back-office
              </Link>
            </div>
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

        {raison && (
          <div
            className={`flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 p-4 ${
              raison === 'module-verrouille' ? 'justify-center' : ''
            }`}
          >
            <LockKeyholeIcon className="size-5 shrink-0 text-primary" />
            {raison !== 'module-verrouille' && (
              <p className="text-sm text-muted-foreground">
                {MESSAGES_RAISON[raison] ?? 'Ce passage au plan payant est requis.'}
              </p>
            )}
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
          <div className="flex flex-col gap-4">
            {/* Choix du palier */}
            <Card>
              <CardTitle>1 · Choisis ton plan</CardTitle>
              <div className="flex flex-col gap-3">
                {PALIERS_ABONNEMENT.map((p) => {
                  const offrePalier = PLANS_ABONNEMENT[p]
                  const caps = CAPS_PLANS[p]
                  const actif = palier === p
                  const pro = p === 'pro'
                  return (
                    <div
                      key={p}
                      onClick={() => setPalier(p)}
                      className={`cursor-pointer rounded-xl border p-4 transition-all duration-300 ease-[var(--ease-spring)] ${
                        actif
                          ? 'animate-halo border-primary/60 bg-primary/8 shadow'
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      <div className="flex w-full items-center gap-3">
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            actif ? 'border-primary' : 'border-border'
                          }`}
                        >
                          {actif && <span className="size-2.5 rounded-full bg-primary" />}
                        </span>
                        <span className="text-sm font-semibold">
                          {offrePalier.libelle}
                        </span>
                        {pro ? (
                          <Badge ton="primaire">Le plus populaire</Badge>
                        ) : p === 'premium' ? (
                          <Badge ton="primaire">Pour les groupes</Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-display text-lg font-semibold tnum">
                          {fcfa(montantPalier(p, periodicite))}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          /{periodicite === 'mensuel' ? 'mois' : 'an'}
                        </span>
                      </div>

                      <div className="mt-3 inline-flex overflow-hidden rounded-lg border border-border">
                        {(['mensuel', 'annuel'] as PlanAbonnement[]).map((per) => (
                          <button
                            key={per}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPalier(p)
                              setPeriodicite(per)
                            }}
                            className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                              actif && periodicite === per
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-background text-muted-foreground hover:bg-secondary'
                            }`}
                          >
                            {per === 'mensuel' ? 'Mensuel' : 'Annuel'}
                          </button>
                        ))}
                      </div>

                      <ul className="mt-4 flex flex-col gap-2">
                        <li className="flex items-center gap-2 text-xs">
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">
                            Membres d’équipe :{' '}
                            <span className="font-semibold text-foreground tnum">
                              {caps.membresEquipe}
                            </span>
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-xs">
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">
                            Commandes / mois :{' '}
                            <span className="font-semibold text-foreground tnum">
                              {nombreFormate(caps.commandesMois)}
                            </span>
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-xs">
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">
                            Clients enregistrés :{' '}
                            <span className="font-semibold text-foreground tnum">
                              {nombreFormate(caps.clientsEnregistres)}
                            </span>
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-xs">
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">
                            Références en stock :{' '}
                            {caps.referencesStock === null ? (
                              <span className="text-muted-foreground/50">—</span>
                            ) : (
                              <span className="font-semibold text-foreground tnum">
                                {nombreFormate(caps.referencesStock)}
                              </span>
                            )}
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-xs">
                          <CheckCircle2Icon className="size-3.5 shrink-0 text-primary" />
                          <span className="text-muted-foreground">
                            Établissements :{' '}
                            <span className="font-semibold text-foreground tnum">
                              {caps.etablissements}
                            </span>
                          </span>
                        </li>
                        <li
                          className={`mt-1 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                            pro
                              ? 'border border-primary/25 bg-primary/8'
                              : 'bg-secondary/60'
                          }`}
                        >
                          <span className="font-medium text-muted-foreground">
                            Modules
                          </span>
                          <span
                            className={`font-semibold ${
                              pro ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {caps.modules}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Widget économies */}
            <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3.5">
              {periodicite === 'mensuel' ? (
                <PiggyBankIcon className="size-4 shrink-0 text-primary" />
              ) : (
                <CheckCircle2Icon className="size-4 shrink-0 text-success" />
              )}
              <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                {periodicite === 'mensuel' ? (
                  <>
                    Passe au forfait{' '}
                    <span className="font-semibold text-foreground">annuel</span>{' '}
                    et économise{' '}
                    <span className="font-semibold text-foreground tnum">
                      {fcfa(economiesAnnuel)}
                    </span>{' '}
                    / an.
                  </>
                ) : (
                  <>
                    Forfait annuel :{' '}
                    <span className="font-semibold text-foreground tnum">
                      {fcfa(montant)}
                    </span>{' '}
                    avec{' '}
                    <span className="font-semibold text-success">
                      2 mois offerts
                    </span>
                    .
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() =>
                  setPeriodicite(periodicite === 'mensuel' ? 'annuel' : 'mensuel')
                }
                className="shrink-0 text-[11px] font-medium text-primary underline underline-offset-2"
              >
                {periodicite === 'mensuel'
                  ? 'Passer à l’annuel'
                  : 'Revenir au mensuel'}
              </button>
            </div>
          </div>

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
                  {LIBELLE_PALIER[palier]} · {periodicite === 'annuel' ? 'annuel' : 'mensuel'} — tu es
                  redirigé vers la page de paiement sécurisée. Dès la
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
                        ? `Démarrer le paiement ${LIBELLE_PALIER[palier]} (simulé)`
                        : `Payer ${fcfa(montant)} en ligne`}
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
                      {fcfa(montant)}
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
                  `J’ai payé ${mode ? fcfa(montant) : ''}`
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