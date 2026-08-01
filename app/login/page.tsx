'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRightIcon, LoaderIcon, LockKeyholeIcon } from 'lucide-react'
import { Badge } from '@/components/kit'
import { useAuth } from '@/lib/auth-contexte'

function Marque() {
  return (
    <span className="flex size-11 items-center justify-center rounded-xl bg-primary font-display text-2xl font-bold text-primary-foreground">
      a
    </span>
  )
}

export default function PageConnexion() {
  const router = useRouter()
  const { actualiser } = useAuth()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
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
        body: JSON.stringify({ email, motDePasse }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Connexion impossible.')
        return
      }
      await actualiser()
      router.push(donnees.destination)
      router.refresh()
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Panneau de marque */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-card/60 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <Marque />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold">alba</span>
            <span className="text-xs text-muted-foreground">
              la gestion de restaurant, sans coupure
            </span>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
            Un compte pour chaque métier, une seule plateforme.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
            Le super admin gère la plateforme et les abonnements, le chef de
            restaurant pilote son établissement, le client commande et
            cumule sa Carte de Fidélité.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Badge ton="primaire">Super admin — vue globale</Badge>
            <Badge ton="succes">Admin restaurant — son back-office</Badge>
            <Badge ton="attention">Client — menu et fidélité</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          alba · Ngor, Dakar — pensée pour le terrain
        </p>
      </aside>

      {/* Formulaire */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Marque />
            <span className="font-display text-lg font-semibold">alba</span>
          </div>

          <h2 className="font-display text-2xl font-semibold tracking-tight">
            Bon retour
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Connecte-toi avec l’email de ton compte. La page d’arrivée dépend
            de ton rôle.
          </p>

          <form onSubmit={seConnecter} className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="toi@restaurant.sn"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Mot de passe
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
              />
            </label>

            {erreur && (
              <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                {erreur}
              </p>
            )}

            <button
              type="submit"
              disabled={chargement}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] hover:bg-primary/85 active:scale-[0.98] disabled:opacity-60"
            >
              {chargement ? (
                <LoaderIcon className="size-4 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRightIcon className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Pas encore de compte client ?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Crée ta Carte de Fidélité
            </Link>
          </p>

          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <LockKeyholeIcon className="size-3.5" />
              Comptes de démonstration
            </p>
            <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              <li>superadmin@alba.sn · SuperAlba2026!</li>
              <li>chef@chezfatou.sn · Fatou2026!</li>
              <li>client@demo.sn · Client2026!</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
