'use client'

import Link from 'next/link'
import { LogoComplet, ArcheMotif } from './logo'

const LIENS_PRODUIT = [
  { l: 'Fonctionnalités', h: '#fonctionnalites' },
  { l: 'Témoignages', h: '#temoignages' },
  { l: 'FAQ', h: '#faq' },
  { l: 'Abonnement', h: '/login' },
]

export function PiedDePage() {
  return (
    <footer className="relative mt-10 overflow-hidden border-t border-border/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 text-primary/8">
        <ArcheMotif />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-10 sm:px-6">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <LogoComplet />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty">
              La gestion de restaurant offline-first, pensée pour le terrain
              sénégalais. Façonnée à Dakar, avec soin.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:gap-16">
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                Produit
              </p>
              {LIENS_PRODUIT.map((l) => (
                <Link
                  key={l.l}
                  href={l.h}
                  className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary"
                >
                  {l.l}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <p className="text-[11px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
                Compte
              </p>
              <Link
                href="/login"
                className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                Se connecter
              </Link>
              <Link
                href="/register"
                className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                Créer un compte
              </Link>
              <Link
                href="/login"
                className="w-fit text-sm text-foreground/80 transition-colors hover:text-primary"
              >
                Démo
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} alba — la gestion de restaurant, sans
            coupure.
          </p>
          <p className="text-xs text-muted-foreground">
            Offline-first · pensé pour la cuisine
          </p>
        </div>
      </div>
    </footer>
  )
}
