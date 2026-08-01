'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  LockKeyholeIcon,
  WifiOffIcon,
} from 'lucide-react'
import { LogoComplet, LogoMark, ArcheMotif } from '@/components/landing/logo'

const CHAMP =
  'h-12 w-full rounded-xl border border-border bg-secondary/35 px-3.5 text-sm text-foreground outline-none transition-all duration-300 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card focus:ring-4 focus:ring-primary/10'

const BARRES = [38, 52, 46, 66, 60, 78, 92]

/** Panneau de marque : l'identité Alba, l'illustration, la preuve. */
function PanneauMarque() {
  return (
    <aside className="relative hidden flex-1 flex-col overflow-hidden p-10 lg:flex xl:p-14">
      {/* Ambiance */}
      <div className="bg-grid-fine absolute inset-0 [mask-image:radial-gradient(ellipse_70%_70%_at_50%_30%,black,transparent)]" />
      <div className="bg-radial-ember animate-haleine absolute -top-24 -left-24 h-[520px] w-[520px] rounded-full" />
      <div className="absolute right-0 bottom-16 h-40 w-full text-primary/10">
        <ArcheMotif densite={10} />
      </div>

      <div className="relative flex flex-col gap-4">
        <LogoComplet />
      </div>

      <div className="relative my-auto max-w-md py-16">
        <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
          Connexion
        </p>
        <h1 className="font-display mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          Un compte pour chaque métier, une seule plateforme.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty">
          Le super admin gère la plateforme, le chef de restaurant pilote son
          établissement, le client commande et cumule sa Carte de Fidélité.
        </p>

        <div className="mt-8 flex flex-col gap-2">
          <span className="flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <BadgeCheckIcon className="size-3.5" />
            Super admin — vue sur le parc
          </span>
          <span className="flex w-fit items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3.5 py-1.5 text-xs font-medium text-success">
            <BadgeCheckIcon className="size-3.5" />
            Admin restaurant — son back-office
          </span>
          <span className="flex w-fit items-center gap-2 rounded-full border border-warning/25 bg-warning/10 px-3.5 py-1.5 text-xs font-medium text-warning">
            <BadgeCheckIcon className="size-3.5" />
            Client — menu et fidélité
          </span>
        </div>
      </div>

      <div className="relative flex items-end justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          alba — pensée pour le terrain · © {new Date().getFullYear()}
        </p>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <WifiOffIcon className="size-3.5 text-primary/70" />
          offline-first
        </span>
      </div>
    </aside>
  )
}

/** Cartes flottantes de preuve — l'expérience avant le formulaire. */
function CartesFlottantes() {
  return (
    <div className="pointer-events-none absolute top-24 right-10 hidden xl:block">
      <div className="animate-float">
        <div className="shadow-float-sm w-56 rounded-2xl border border-border bg-card/85 p-4 backdrop-blur-md">
          <span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            CA du jour
          </span>
          <span className="font-display mt-1 block text-xl font-semibold tnum">
            1 284 500 F
          </span>
          <div className="mt-2.5 flex h-10 items-end gap-1">
            {BARRES.map((h, i) => (
              <span
                key={i}
                className={
                  i === BARRES.length - 1
                    ? 'w-full rounded-t-[2px] bg-gradient-to-t from-primary/70 to-[#f5a174]'
                    : 'w-full rounded-t-[2px] bg-foreground/12'
                }
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="animate-float-slow mt-3 flex justify-end pr-10">
        <div className="shadow-float-sm flex items-center gap-2.5 rounded-2xl border border-border bg-card/85 px-4 py-3 backdrop-blur-md">
          <span className="flex size-8 items-center justify-center rounded-lg bg-success/15 text-success">
            <CheckCircle2Icon className="size-4" />
          </span>
          <span className="text-xs font-medium">
            148 tickets · 0 coupure
          </span>
        </div>
      </div>
    </div>
  )
}

function PageConnexion() {
  const router = useRouter()
  const params = useSearchParams()
  const suivant = params.get('suivant')
  const inscrit = params.get('inscrit') === '1'

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [voir, setVoir] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)
    setChargement(true)
    try {
      const reponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse, suivant }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Connexion impossible.')
        return
      }
      router.push(donnees.destination)
      router.refresh()
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:flex-row">
      <PanneauMarque />
      <CartesFlottantes />

      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <div className="bg-radial-ember absolute -top-20 right-0 h-72 w-72 rounded-full opacity-50 lg:hidden" />

        <div className="animate-rise relative w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="size-10" />
            <div className="flex flex-col leading-tight">
              <span className="font-display text-lg font-semibold tracking-tight">
                alba
              </span>
              <span className="text-[11px] text-muted-foreground">
                la gestion de restaurant, sans coupure
              </span>
            </div>
          </div>

          {inscrit && (
            <div className="animate-pop mb-6 flex items-start gap-3 rounded-2xl border border-success/25 bg-success/8 p-4">
              <CheckCircle2Icon className="mt-0.5 size-4.5 shrink-0 text-success" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  Ton compte est créé
                </span>
                <span className="text-xs leading-relaxed text-muted-foreground">
                  Connecte-toi pour commencer.
                </span>
              </div>
            </div>
          )}

          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Bon retour
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Connecte-toi avec l'email de ton compte. Ta page d'arrivée
            dépend de ton rôle.
          </p>

          <form onSubmit={seConnecter} className="mt-6 flex flex-col gap-4">
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
                placeholder="toi@restaurant.sn"
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
                  autoComplete="current-password"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
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
                  Se connecter
                  <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Pas encore de compte client ?{' '}
            <Link
              href={suivant ? `/register?suivant=${encodeURIComponent(suivant)}` : '/register'}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Crée ta Carte de Fidélité
            </Link>
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-card/60 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              <LockKeyholeIcon className="size-3.5" />
              Comptes de démonstration
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {[
                ['superadmin@alba.sn', 'SuperAlba2026!', 'primaire'],
                ['chef@chezfatou.sn', 'Fatou2026!', 'succes'],
                ['client@demo.sn', 'Client2026!', 'attention'],
              ].map(([mail, passe, ton]) => (
                <li
                  key={mail}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      ton === 'primaire'
                        ? 'bg-primary'
                        : ton === 'succes'
                          ? 'bg-success'
                          : 'bg-warning'
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
                    {mail}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground/70">
                    {passe}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PageConnexionEnveloppe() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <LogoMark className="size-12 animate-haleine" />
        </div>
      }
    >
      <PageConnexion />
    </Suspense>
  )
}
