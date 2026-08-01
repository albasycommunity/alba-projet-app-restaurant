'use client'

import Link from 'next/link'
import { ArrowRightIcon } from 'lucide-react'
import { LogoComplet } from './logo'

export function BandeCta() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="border-ember shadow-float relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12 sm:py-16">
          <div className="bg-radial-ember absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full" />
          <div className="bg-grid-fine absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]" />
          <div className="relative">
            <h2 className="font-display mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Prêt à passer au{' '}
              <span className="text-ember">sans-coupure</span> ?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
              Compte gratuit en 30 secondes. Le back-office se débloque quand
              tu es prêt — paiement par Wave, Orange Money ou espèces.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-12px_oklch(0.65_0.16_38/0.9)] transition-all duration-300 ease-[var(--ease-spring)] hover:scale-[1.02] hover:bg-primary/90 active:scale-[0.98] sm:w-auto"
              >
                Créer mon compte
                <ArrowRightIcon className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="glass flex h-12 w-full items-center justify-center rounded-xl border border-border px-7 text-sm font-medium transition-all duration-300 ease-[var(--ease-spring)] hover:border-primary/35 hover:bg-primary/8 sm:w-auto"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
