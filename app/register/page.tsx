'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { ArrowRightIcon, CheckIcon, EyeIcon, EyeOffIcon, LoaderIcon } from 'lucide-react'
import { LogoMark } from '@/components/landing/logo'

const CHAMP =
  'h-12 w-full rounded-xl border border-border bg-secondary/35 px-3.5 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/10'

function PageInscription() {
  const router = useRouter()
  const params = useSearchParams()
  const suivant = params.get('suivant')

  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voir, setVoir] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [cree, setCree] = useState(false)

  async function sinscrire(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    try {
      const reponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, email, motDePasse }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Inscription impossible.')
        return
      }
      // Pas de session créée : on ramène vers la connexion.
      setCree(true)
      const cible = suivant ? `login?inscrit=1&suivant=${encodeURIComponent(suivant)}` : 'login?inscrit=1'
      window.setTimeout(() => router.push(cible), 1700)
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setChargement(false)
    }
  }

  if (cree) {
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
            Ton compte est prêt
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Tu n'as plus qu'à te connecter avec ton email.
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
              30 secondes, gratuit. La Carte de Fidélité s'active avec ton
              compte.
            </p>
          </div>
        </div>

        <div className="border-ember shadow-float rounded-3xl p-6 sm:p-7">
          <form onSubmit={sinscrire} className="flex flex-col gap-4">
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
                  Créer mon compte
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
          Le compte client est gratuit. Le back-office du restaurant se
          débloque avec l'abonnement.
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
