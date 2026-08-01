'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChartPieIcon,
  ClipboardCheckIcon,
  CornerDownLeftIcon,
  FlameIcon,
  HeartIcon,
  LifeBuoyIcon,
  PackageIcon,
  ReceiptTextIcon,
  ScanBarcodeIcon,
  SearchIcon,
  UsersIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Commande = {
  href: string
  titre: string
  detail: string
  icon: typeof ChartPieIcon
  motsCles: string
}

const ACTIONS: Commande[] = [
  {
    href: '/caisse',
    titre: 'Encaisser un ticket',
    detail: 'Caisse — cash, Wave, Orange Money',
    icon: ScanBarcodeIcon,
    motsCles: 'caisse pos payer vendre ticket wave orange money espèces',
  },
  {
    href: '/cuisine',
    titre: 'Voir la file cuisine',
    detail: 'Commandes en cours et plats prêts',
    icon: FlameIcon,
    motsCles: 'cuisine commandes prêt préparation service',
  },
  {
    href: '/stock',
    titre: 'Contrôler le stock',
    detail: 'Ruptures, péremptions, food cost',
    icon: PackageIcon,
    motsCles: 'stock inventaire rupture péremption dlc food cost réappro',
  },
  {
    href: '/hygiene',
    titre: 'Remplir les relevés HACCP',
    detail: 'Check-lists et preuve photo',
    icon: ClipboardCheckIcon,
    motsCles: 'hygiène haccp température nettoyage contrôle sanitaire',
  },
  {
    href: '/equipe',
    titre: 'Gérer l’équipe',
    detail: 'Pointage, planning, formation',
    icon: UsersIcon,
    motsCles: 'équipe personnel pointage planning formation employé',
  },
  {
    href: '/clients',
    titre: 'Clients et fidélité',
    detail: 'Points, menu à partager',
    icon: HeartIcon,
    motsCles: 'clients fidélité points menu whatsapp partage anniversaire',
  },
  {
    href: '/pilotage',
    titre: 'Ouvrir le pilotage',
    detail: 'Chiffre d’affaires, marges, affluence',
    icon: ChartPieIcon,
    motsCles: 'pilotage dashboard chiffre affaires ca rapport marge',
  },
  {
    href: '/abonnement',
    titre: 'Gérer l’abonnement',
    detail: 'Plans, factures, paiement Wave ou Orange Money',
    icon: ReceiptTextIcon,
    motsCles:
      'abonnement facture plan prix paiement wave orange money essentiel pro groupe',
  },
  {
    href: '/console',
    titre: 'Ouvrir la console alba',
    detail: 'Parc client, MRR, comptes à risque',
    icon: LifeBuoyIcon,
    motsCles: 'console admin super-admin mrr churn tenant support parc client',
  },
]

/** Accès clavier à toute l'app — pour la gérante sur ordinateur. */
export function Palette({
  ouvert,
  onFermer,
  onAller,
  panier,
}: {
  ouvert: boolean
  onFermer: () => void
  onAller: (href: string) => void
  panier: number
}) {
  const [requete, setRequete] = useState('')
  const [index, setIndex] = useState(0)
  const champ = useRef<HTMLInputElement>(null)

  const resultats = useMemo(() => {
    const q = requete.trim().toLowerCase()
    if (!q) return ACTIONS
    return ACTIONS.filter(
      (a) =>
        a.titre.toLowerCase().includes(q) ||
        a.detail.toLowerCase().includes(q) ||
        a.motsCles.includes(q),
    )
  }, [requete])

  useEffect(() => {
    if (ouvert) {
      setRequete('')
      setIndex(0)
      window.setTimeout(() => champ.current?.focus(), 40)
    }
  }, [ouvert])

  useEffect(() => {
    setIndex(0)
  }, [requete])

  useEffect(() => {
    if (!ouvert) return
    const onTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIndex((i) => Math.min(i + 1, resultats.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && resultats[index]) {
        e.preventDefault()
        onAller(resultats[index].href)
      }
    }
    document.addEventListener('keydown', onTouche)
    return () => document.removeEventListener('keydown', onTouche)
  }, [ouvert, resultats, index, onFermer, onAller])

  if (!ouvert) return null

  return (
    <div className="fixed inset-0 z-70 hidden items-start justify-center pt-[12vh] lg:flex">
      <button
        type="button"
        aria-label="Fermer"
        onClick={onFermer}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="animate-rise relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={champ}
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Que veux-tu faire ?"
            aria-label="Rechercher une action"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
            esc
          </kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto p-2">
          {resultats.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Rien de ce nom-là. Essaie « caisse » ou « stock ».
            </li>
          )}
          {resultats.map((a, i) => (
            <li key={a.href + a.titre}>
              <button
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => onAller(a.href)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                  i === index ? 'bg-secondary' : 'hover:bg-secondary/60',
                )}
              >
                <a.icon className="size-4 shrink-0 text-primary" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{a.titre}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {a.detail}
                  </span>
                </div>
                {a.href === '/caisse' && panier > 0 && (
                  <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary tnum">
                    {panier} en cours
                  </span>
                )}
                {i === index && (
                  <CornerDownLeftIcon className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
