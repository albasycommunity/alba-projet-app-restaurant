'use client'

import { useMemo, useState } from 'react'
import { PlusIcon, SearchIcon, TriangleAlertIcon } from 'lucide-react'
import { CATEGORIES, fcfa, type Categorie } from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { useMenu } from '@/components/menu-store'
import { Segments } from '@/components/kit'
import { cn } from '@/lib/utils'

type Filtre = Categorie | 'Tout'

/**
 * Grille d'encaissement : une cible tactile large par plat, un seul appui
 * pour ajouter. La carte est le MENU ÉDITABLE du back-office (plats créés,
 * retirés ou en rupture) — jamais une copie en dur. Les plats dont un
 * ingrédient manque sont signalés sans jamais bloquer la vente (le terrain
 * décide, pas le logiciel).
 */
export function GrillePlats() {
  const { etat, envoyer } = useAlba()
  const { platsActifs } = useMenu()
  const [filtre, setFiltre] = useState<Filtre>('Tout')
  const [requete, setRequete] = useState('')

  // Un plat est « tendu » si un de ses ingrédients est sous le seuil, 
  // et en « rupture » s'il n'y a pas assez de stock pour en préparer un de plus
  // (en prenant en compte ce qui est déjà dans le panier !).
  const platsTendus = useMemo(() => {
    // 1. Calculer la consommation actuelle du panier
    const consommation = new Map<string, number>()
    for (const ligne of etat.panier) {
      const plat = platsActifs.find((p) => p.id === ligne.platId)
      if (!plat) continue
      for (const r of plat.recette) {
        consommation.set(
          r.ingredientId,
          (consommation.get(r.ingredientId) ?? 0) + r.qte * ligne.qte,
        )
      }
    }

    // 2. Évaluer chaque plat
    const map = new Map<string, 'rupture' | 'bas'>()
    for (const plat of platsActifs) {
      let enRupture = false
      let bas = false

      for (const r of plat.recette) {
        const ing = etat.stock.find((i) => i.id === r.ingredientId)
        if (!ing) continue

        const dejaConsomme = consommation.get(r.ingredientId) ?? 0
        const stockRestant = ing.stock - dejaConsomme

        if (stockRestant < r.qte) {
          enRupture = true
          break // Plus besoin de vérifier le reste, on est en rupture
        } else if (stockRestant < ing.seuil) {
          bas = true
        }
      }

      if (enRupture) {
        map.set(plat.id, 'rupture')
      } else if (bas) {
        map.set(plat.id, 'bas')
      }
    }
    return map
  }, [etat.stock, etat.panier, platsActifs])

  const plats = useMemo(() => {
    const q = requete.trim().toLowerCase()
    return platsActifs.filter(
      (p) =>
        !p.rupture &&
        (filtre === 'Tout' || p.categorie === filtre) &&
        (q === '' || p.nom.toLowerCase().includes(q)),
    )
  }, [filtre, requete, platsActifs])

  const quantiteAuPanier = (platId: string) =>
    etat.panier.find((l) => l.platId === platId)?.qte ?? 0

  const options = [
    { valeur: 'Tout' as Filtre, libelle: 'Tout' },
    ...CATEGORIES.map((c) => ({ valeur: c as Filtre, libelle: c })),
  ]

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Chercher un plat"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <span className="sr-only">Chercher un plat dans la carte</span>
        </label>
      </div>

      <Segments valeur={filtre} options={options} onChange={setFiltre} />

      {plats.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {platsActifs.length === 0
            ? 'Ta carte est vide pour le moment. Ajoute un plat depuis le back-office.'
            : 'Aucun plat ne correspond. Efface la recherche pour revoir la carte.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
          {plats.map((plat) => {
            const qte = quantiteAuPanier(plat.id)
            const tension = platsTendus.get(plat.id)
            return (
              <li key={plat.id}>
                <button
                  type="button"
                  disabled={tension === 'rupture'}
                  onClick={() => {
                    if (tension === 'rupture') return
                    envoyer({
                      type: 'ajouter',
                      platId: plat.id,
                      plat: { id: plat.id, nom: plat.nom, prix: plat.prix },
                    })
                    vibrer(10)
                  }}
                  className={cn(
                    'group relative flex h-full min-h-24 w-full flex-col items-start justify-between gap-2 rounded-xl border p-3 text-left transition-all duration-300',
                    tension === 'rupture'
                      ? 'bg-muted/50 border-border opacity-60 cursor-not-allowed'
                      : 'bg-card ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:border-primary/45 active:scale-[0.97]',
                    qte > 0 && tension !== 'rupture' ? 'border-primary/60 ring-1 ring-primary/25' : 'border-border',
                  )}
                >
                  <span className="flex w-full items-start gap-1.5">
                    <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-pretty">
                      {plat.nom}
                    </span>
                    {tension && (
                      <span className={cn(
                        "mt-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        tension === 'rupture' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning-foreground'
                      )}>
                        {tension === 'rupture' ? 'Épuisé' : 'Bientôt vide'}
                      </span>
                    )}
                  </span>

                  <span className="flex w-full items-end justify-between gap-2">
                    <span className="font-display text-base font-semibold tnum">
                      {fcfa(plat.prix)}
                    </span>
                    {qte > 0 ? (
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary font-display text-xs font-bold text-primary-foreground tnum">
                        {qte}
                      </span>
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors group-hover:bg-primary/15 group-hover:text-primary">
                        <PlusIcon className="size-4" />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
