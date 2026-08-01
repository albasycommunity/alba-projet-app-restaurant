'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutGridIcon, MenuIcon, XIcon } from 'lucide-react'
import { ACCUEIL_PAR_ROLE } from '@/lib/auth'
import { useAuth } from '@/lib/auth-contexte'
import { LogoComplet } from './logo'
import { Hero, BandeServices } from './hero'
import { Fonctionnalites, ParRoles } from './features'
import { Plans } from './plans'
import { Temoignages } from './testimonials'
import { FoireAuxQuestions } from './faq'
import { BandeCta } from './cta'
import { PiedDePage } from './footer'

const LIENS = [
  { l: 'Fonctionnalités', h: '#fonctionnalites' },
  { l: 'Plans', h: '#plans' },
  { l: 'FAQ', h: '#faq' },
]

function Navigation() {
  const { utilisateur } = useAuth()
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const fermer = () => setMobile(false)
    window.addEventListener('hashchange', fermer)
    return () => window.removeEventListener('hashchange', fermer)
  }, [])

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-border/60">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6"
        >
          <Link href="/" aria-label="alba — accueil" className="shrink-0">
            <LogoComplet compact />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {LIENS.map((l) => (
              <Link
                key={l.h}
                href={l.h}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                {l.l}
              </Link>
            ))}
          </div>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            {utilisateur ? (
              <Link
                href={ACCUEIL_PAR_ROLE[utilisateur.role]}
                className="flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-medium text-primary transition-all duration-300 ease-[var(--ease-spring)] hover:bg-primary/18"
              >
                <LayoutGridIcon className="size-4" />
                Ouvrir mon espace
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Se connecter
                </Link>
                <Link
                  href="#plans"
                  className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_oklch(0.65_0.16_38/0.9)] transition-all duration-300 ease-[var(--ease-spring)] hover:bg-primary/90"
                >
                  Créer mon compte
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={mobile ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMobile((v) => !v)}
            className="ml-auto flex size-10 items-center justify-center rounded-xl border border-border bg-secondary/50 text-foreground md:hidden"
          >
            {mobile ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </button>
        </nav>

        {mobile && (
          <div className="animate-rise flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden">
            {LIENS.map((l) => (
              <Link
                key={l.h}
                href={l.h}
                onClick={() => setMobile(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary/70"
              >
                {l.l}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {utilisateur ? (
                <Link
                  href={ACCUEIL_PAR_ROLE[utilisateur.role]}
                  onClick={() => setMobile(false)}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary font-medium text-primary-foreground"
                >
                  <LayoutGridIcon className="size-4" />
                  Ouvrir mon espace
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobile(false)}
                    className="flex h-11 items-center justify-center rounded-xl border border-border bg-secondary/50 font-medium"
                  >
                    Se connecter
                  </Link>
                  <Link
                    href="#plans"
                    onClick={() => setMobile(false)}
                    className="flex h-11 items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground"
                  >
                    Créer mon compte
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Navigation />
      <main className="flex-1">
        <Hero />
        <BandeServices />
        <Fonctionnalites />
        <ParRoles />
        <Plans />
        <Temoignages />
        <FoireAuxQuestions />
        <BandeCta />
      </main>
      <PiedDePage />
    </div>
  )
}
