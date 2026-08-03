'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur d’affichage non rattrapée', error)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <p className="font-space-grotesk text-7xl font-bold text-foreground/10">
        Oups
      </p>
      <div className="space-y-2">
        <h1 className="font-space-grotesk text-2xl font-bold">
          Une erreur est survenue
        </h1>
        <p className="text-sm text-foreground/60">
          Réessaie, ou recharge la page si le problème persiste.
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Réessayer
      </button>
    </main>
  )
}
