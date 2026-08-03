import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <p className="font-space-grotesk text-7xl font-bold text-foreground/10">
        404
      </p>
      <div className="space-y-2">
        <h1 className="font-space-grotesk text-2xl font-bold">
          Page introuvable
        </h1>
        <p className="text-sm text-foreground/60">
          La page demandée n’existe pas ou a été déplacée.
        </p>
      </div>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Retour à la connexion
      </Link>
    </main>
  )
}
