'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import {
  ArrowRightIcon,
  EyeIcon,
  EyeOffIcon,
  HeartIcon,
  LoaderIcon,
  StoreIcon,
} from 'lucide-react'
import { LogoMark } from '@/components/landing/logo'
import { PLANS_ABONNEMENT, type PalierAbonnement, type PlanAbonnement } from '@/lib/auth'
import { cn } from '@/lib/utils'

const CHAMP =
  'h-12 w-full rounded-xl border border-border bg-secondary/35 px-3.5 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/10'

type Mode = 'restaurant' | 'client'

/** Le plan choisi sur la grille de tarifs est mémorisé : la page
 *  « Activer mon restaurant » le pré-sélectionnera plus tard. */
const CLE_INTENTION = 'alba:plan-intention'

function enregistrerIntention(palier: string | null, plan: string | null) {
  if (palier && (plan === 'mensuel' || plan === 'annuel')) {
    try {
      window.localStorage.setItem(
        CLE_INTENTION,
        JSON.stringify({ palier, plan }),
      )
    } catch {
      // quota local plein : on continue sans pré-sélection
    }
  }
}

function PageInscription() {
  const params = useSearchParams()
  const suivant = params.get('suivant')
  // Un CTA venu de la grille de plans amène le mode restaurant
  // (pré-sélectionné) avec le palier et la périodicité choisis.
  const palierCible = params.get('palier')
  const planCible = params.get('plan')
  const vientDesPlans = params.get('mode') === 'restaurant' || !!palierCible

  const [mode, setMode] = useState<Mode>(vientDesPlans ? 'restaurant' : 'client')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [nomRestaurant, setNomRestaurant] = useState('')
  const [quartier, setQuartier] = useState('')
  const [voir, setVoir] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [compteCree, setCompteCree] = useState<null | {
    type: Mode
    destination?: string
  }>(null)

  async function sinscrire(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    // Le choix de plan fait sur la grille des tarifs est conservé en local
    // pour la page « Activer mon restaurant » (pré-sélection plus tard).
    enregistrerIntention(
      palierCible && palierCible in PLANS_ABONNEMENT ? palierCible : null,
      planCible,
    )
    try {
      const reponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'restaurant'
            ? { type: 'restaurant', nom, email, motDePasse, nomRestaurant, quartier, suivant }
            : { type: 'client', nom, email, motDePasse },
        ),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Inscription impossible.')
        return
      }
      // Restaurant : la session est déjà posée (cookie) — on ouvre
      // directement le back-office. Client : pas de session, retour
      // vers la connexion.
      setCompteCree({
        type: donnees.compte === 'restaurant' ? 'restaurant' : 'client',
        destination: donnees.destination,
      })
      const cible =
        donnees.compte === 'restaurant'
          ? donnees.destination
          : `login?inscrit=1${suivant ? `&suivant=${encodeURIComponent(suivant)}` : ''}`
      // Rechargement complet : le layout de l'espace restaurant remonte et
      // le guide de découverte s'ouvre automatiquement à l'atterrissage.
      window.setTimeout(() => window.location.assign(cible), 2000)
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
              'Ton espace Alba est prêt — on t’ouvre directement ton back-office.'
            ) : (
              "Tu n'as plus qu'à te connecter avec ton email."
            )}
          </p>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <LoaderIcon className="size-3.5 animate-spin text-primary" />
            {compteCree.type === 'restaurant'
              ? 'Ouverture du back-office…'
              : 'Redirection vers la connexion…'}
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
                ? palierCible && palierCible in PLANS_ABONNEMENT
                  ? `Crée ton restaurant en 2 minutes. Le plan ${
                      PLANS_ABONNEMENT[palierCible as PalierAbonnement].libelle
                    } ${planCible === 'annuel' ? 'annuel' : 'mensuel'} est pré-sélectionné — tu l’actives quand tu es prêt.`
                  : 'Crée ton restaurant en 2 minutes. Explore tout, paie seulement quand tu l’actives.'
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
                    ? 'Créer mon restaurant — c’est gratuit'
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
            ? 'Aucun paiement maintenant : tu actives Alba quand tu es prêt, à tes premières vraies ventes.'
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
