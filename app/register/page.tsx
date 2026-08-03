'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import {
  ArrowRightIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  StoreIcon,
  HeartIcon,
} from 'lucide-react'
import { PLANS_ABONNEMENT, PALIERS_ABONNEMENT, DUREE_ESSAI_JOURS, type PalierAbonnement, type PlanAbonnement } from '@/lib/auth'
import { LogoMark } from '@/components/landing/logo'
import { cn } from '@/lib/utils'

const CHAMP =
  'h-12 w-full rounded-xl border border-border bg-secondary/35 px-3.5 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/10'

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'

type Mode = 'restaurant' | 'client'

function PageInscription() {
  const router = useRouter()
  const params = useSearchParams()
  const suivant = params.get('suivant')
  const palierParam = params.get('palier')
  const palierInitial: PalierAbonnement | null =
    palierParam === 'pro' || palierParam === 'premium' || palierParam === 'starter'
      ? palierParam
      : null
  const planInitial: PlanAbonnement | null =
    params.get('plan') === 'annuel' ? 'annuel' : params.get('plan') === 'mensuel' ? 'mensuel' : null

  const [mode, setMode] = useState<Mode>(palierInitial ? 'restaurant' : 'client')
  const [palier, setPalier] = useState<PalierAbonnement>(palierInitial ?? 'starter')
  const [plan, setPlan] = useState<PlanAbonnement>(planInitial ?? 'mensuel')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [nomRestaurant, setNomRestaurant] = useState('')
  const [quartier, setQuartier] = useState('')
  const [voir, setVoir] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [compteCree, setCompteCree] = useState<null | { type: Mode }>(null)

  async function sinscrire(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    try {
      const reponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'restaurant'
            ? { nom, email, motDePasse, plan, palier, nomRestaurant, quartier }
            : { nom, email, motDePasse },
        ),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Inscription impossible.')
        return
      }
      // Pas de session créée : on ramène vers la connexion.
      setCompteCree({ type: donnees.compte === 'restaurant' ? 'restaurant' : 'client' })
      const cible = suivant
        ? `login?inscrit=1&suivant=${encodeURIComponent(suivant)}`
        : 'login?inscrit=1'
      window.setTimeout(() => router.push(cible), 2000)
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setChargement(false)
    }
  }

  if (compteCree) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="border-ember shadow-float animate-pop w-full max-w-sm rounded-3xl p-8 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/12 text-success">
            <svg viewBox="0 0 40 40" className="size-8" aria-hidden="true">
              <path
                className="animate-coche"
                d="M10 21 L17 28 L30 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
            {compteCree.type === 'restaurant'
              ? 'Ton restaurant est prêt'
              : 'Ton compte est prêt'}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {compteCree.type === 'restaurant' ? (
              <>
                Ton essai gratuit de {DUREE_ESSAI_JOURS} jours commence
                maintenant. Connecte-toi pour ouvrir ton back-office.
              </>
            ) : (
              "Tu n'as plus qu'à te connecter avec ton email."
            )}
          </p>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin text-primary" />
            Redirection vers la connexion…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
      {/* Ambiance */}
      <div className="bg-grid-fine absolute inset-0 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,black,transparent)]" />
      <div className="bg-radial-ember animate-haleine absolute -top-24 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" />

      <div className="animate-rise relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <LogoMark className="size-12" />
          <div className="text-center">
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Crée ton compte alba
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'restaurant'
                ? `Ton restaurant démarre avec ${DUREE_ESSAI_JOURS} jours d'essai gratuit.`
                : "30 secondes, gratuit. La Carte de Fidélité s'active avec ton compte."}
            </p>
          </div>
        </div>

        <div className="border-ember shadow-float rounded-3xl p-6 sm:p-7">
          {/* Choix du type de compte */}
          <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => setMode('restaurant')}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
                mode === 'restaurant'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <StoreIcon className="size-4" />
              Mon restaurant
            </button>
            <button
              type="button"
              onClick={() => setMode('client')}
              className={cn(
                'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
                mode === 'client'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <HeartIcon className="size-4" />
              Carte de Fidélité
            </button>
          </div>

          {mode === 'restaurant' && (
            <div className="mt-4">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Ton plan
              </span>
              <div className="mt-1.5 flex flex-col gap-2">
                {PALIERS_ABONNEMENT.map((p) => {
                  const offre = PLANS_ABONNEMENT[p]
                  const actif = palier === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPalier(p)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all duration-300 ease-[var(--ease-spring)]',
                        actif
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border bg-background hover:border-primary/30',
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="flex items-center gap-1.5 text-sm font-semibold">
                          {offre.libelle}
                          {p === 'pro' && (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold text-primary-foreground">
                              populaire
                            </span>
                          )}
                        </span>
                        <span className="font-display mt-0.5 text-lg font-semibold tracking-tight tnum">
                          {fcfa(offre.periodicites[plan].montant)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {plan === 'mensuel' ? '/mois' : '/an'}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {(['mensuel', 'annuel'] as PlanAbonnement[]).map((per) => (
                          <span
                            key={per}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation()
                              setPlan(per)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                setPlan(per)
                              }
                            }}
                            className={cn(
                              'rounded-lg px-2 py-1 text-[10px] font-medium transition-colors',
                              actif && plan === per
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {per === 'mensuel' ? 'Mensuel' : 'Annuel'}
                          </span>
                        ))}
                      </span>
                      <span
                        className={cn(
                          'flex size-4.5 items-center justify-center rounded-full border-2',
                          actif ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                        )}
                      >
                        {actif && <CheckIcon className="size-3" />}
                      </span>
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {PLANS_ABONNEMENT[palier].detail} · {DUREE_ESSAI_JOURS} jours
                d'essai gratuit sur le plan {PLANS_ABONNEMENT[palier].libelle}.
              </p>
            </div>
          )}

          <form onSubmit={sinscrire} className="mt-4 flex flex-col gap-4">
            {mode === 'restaurant' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Ton restaurant
                </span>
                <input
                  required
                  value={nomRestaurant}
                  onChange={(e) => setNomRestaurant(e.target.value)}
                  placeholder="Chez Mame Coumba"
                  className={CHAMP}
                />
              </label>
            )}
            {mode === 'restaurant' && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Quartier (facultatif)
                </span>
                <input
                  value={quartier}
                  onChange={(e) => setQuartier(e.target.value)}
                  placeholder="Ngor, Dakar"
                  className={CHAMP}
                />
              </label>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Ton nom complet
              </span>
              <input
                required
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Aminata Diallo"
                className={CHAMP}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@exemple.sn"
                className={CHAMP}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Mot de passe
              </span>
              <div className="relative">
                <input
                  type={voir ? 'text' : 'password'}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="8 caractères minimum"
                  className={`${CHAMP} pr-11`}
                />
                <button
                  type="button"
                  aria-label={voir ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setVoir((v) => !v)}
                  className="absolute top-1/2 right-3 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                >
                  {voir ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </label>

            {erreur && (
              <p className="animate-shake rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={chargement}
              className="group flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_14px_32px_-14px_oklch(0.65_0.16_38/0.9)] transition-all duration-300 ease-[var(--ease-spring)] hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {chargement ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === 'restaurant'
                    ? `Commencer l'essai gratuit (${DUREE_ESSAI_JOURS} jours)`
                    : 'Créer mon compte'}
                  <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Déjà inscrit ?{' '}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Se connecter
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">
          {mode === 'restaurant'
            ? `Aucun paiement maintenant : tu seras guidé·e à la fin des ${DUREE_ESSAI_JOURS} jours.`
            : 'Le compte client est gratuit. Le back-office du restaurant se débloque avec un plan.'}
        </p>
      </div>
    </div>
  )
}

export default function PageInscriptionEnveloppe() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LogoMark className="size-12 animate-haleine" />
        </div>
      }
    >
      <PageInscription />
    </Suspense>
  )
}
