'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRightIcon, HeartIcon, LoaderIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth-contexte'

export default function PageInscription() {
  const router = useRouter()
  const { actualiser } = useAuth()
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

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
      await actualiser()
      router.push('/')
      router.refresh()
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary font-display text-2xl font-bold text-primary-foreground">
            a
          </span>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold">alba</span>
            <span className="text-xs text-muted-foreground">
              commande en ligne · Carte de Fidélité
            </span>
          </div>
        </div>

        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ta Carte de Fidélité commence ici
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          100 F dépensés = 1 point. Bronze, Argent, Or : chaque palier a ses
          avantages chez nous.
        </p>

        <form onSubmit={sinscrire} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Ton nom complet
            </span>
            <input
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Aminata Diallo"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
            />
          </label>
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
              placeholder="toi@exemple.sn"
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
              minLength={8}
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="8 caractères minimum"
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
                <HeartIcon className="size-4" />
                Créer mon compte
                <ArrowRightIcon className="size-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
