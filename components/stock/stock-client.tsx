'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRightIcon,
  BanknoteIcon,
  CalendarClockIcon,
  CheckIcon,
  PackageIcon,
  ShareIcon,
  Trash2Icon,
  TrendingDownIcon,
  TriangleAlertIcon,
  TruckIcon,
} from 'lucide-react'
import {
  MENU,
  SEUIL_FOOD_COST,
  coutMatiere,
  fcfa,
  foodCostReel,
  type Ingredient,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  EmptyState,
  PageHeader,
  Progress,
  Segments,
  Sheet,
  StatTile,
  Stepper,
} from '@/components/kit'
import { CountUp } from '@/components/count-up'
import { cn } from '@/lib/utils'

type Onglet = 'urgent' | 'inventaire' | 'foodcost' | 'reappro'

const MOTIFS = ['Périmé', 'Casse', 'Erreur cuisine', 'Geste commercial']

/**
 * Stock. L'écran répond à une seule question : qu'est-ce qui va me manquer,
 * et qu'est-ce que je dois jeter avant ce soir. Le reste est consultable.
 */
export function StockClient() {
  const { etat, indicateurs, envoyer, notifier } = useAlba()
  const [onglet, setOnglet] = useState<Onglet>('urgent')
  const [recevoir, setRecevoir] = useState<Ingredient | null>(null)
  const [jeter, setJeter] = useState<Ingredient | null>(null)

  const aTraiter = useMemo(() => {
    const vus = new Set<string>()
    const liste: { ingredient: Ingredient; raison: 'rupture' | 'dlc' }[] = []
    for (const i of indicateurs.alertesStock) {
      vus.add(i.id)
      liste.push({ ingredient: i, raison: 'rupture' })
    }
    for (const i of indicateurs.peremptions) {
      if (vus.has(i.id)) continue
      liste.push({ ingredient: i, raison: 'dlc' })
    }
    return liste
  }, [indicateurs.alertesStock, indicateurs.peremptions])

  const platsRisque = useMemo(
    () =>
      [...MENU]
        .map((p) => ({ plat: p, cout: foodCostReel(p, etat.stock) }))
        .sort((a, b) => b.cout - a.cout),
    [etat.stock],
  )

  const enDanger = platsRisque.filter((p) => p.cout >= SEUIL_FOOD_COST).length

  const partagerCourse = () => {
    const lignes = indicateurs.reappro
      .map((r) => `• ${r.ingredient.nom} — ${r.quantite} ${r.ingredient.unite} (${r.ingredient.fournisseur})`)
      .join('\n')
    const texte = `Liste de courses — ${new Date().toLocaleDateString('fr-FR')}\n${lignes}\n\nTotal estimé : ${fcfa(
      indicateurs.reappro.reduce((s, r) => s + r.cout, 0),
    )}`
    const url = `https://wa.me/?text=${encodeURIComponent(texte)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    vibrer(14)
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader
        titre="Stock"
        sous="Ce qui va manquer, ce qui va tourner, et ce que chaque plat te coûte vraiment."
        action={
          indicateurs.reappro.length > 0 && (
            <button
              type="button"
              onClick={partagerCourse}
              className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
            >
              <ShareIcon className="size-4" />
              Liste de courses
            </button>
          )
        }
      />

      <Contenu className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          libelle="Valeur du stock"
          icone={<PackageIcon className="size-3.5" />}
          valeur={<CountUp valeur={indicateurs.valeurStock} suffixe=" F" />}
          detail={`${etat.stock.length} références suivies`}
        />
        <StatTile
          libelle="Food cost du jour"
          icone={<TrendingDownIcon className="size-3.5" />}
          valeur={`${indicateurs.foodCostJour} %`}
          detail={`marge brute ${fcfa(indicateurs.margeJour)}`}
          ton={indicateurs.foodCostJour >= SEUIL_FOOD_COST ? 'alerte' : 'succes'}
        />
        <StatTile
          libelle="Ruptures"
          icone={<TriangleAlertIcon className="size-3.5" />}
          valeur={String(indicateurs.alertesStock.length)}
          detail="sous le seuil de sécurité"
          ton={indicateurs.alertesStock.length > 0 ? 'alerte' : 'succes'}
        />
        <StatTile
          libelle="Pertes du jour"
          icone={<Trash2Icon className="size-3.5" />}
          valeur={fcfa(indicateurs.pertesJour)}
          detail={`${etat.pertes.length} sortie${etat.pertes.length > 1 ? 's' : ''} déclarée${etat.pertes.length > 1 ? 's' : ''}`}
          ton={indicateurs.pertesJour > 15000 ? 'alerte' : 'neutre'}
        />
      </Contenu>

      <Contenu>
        <Segments
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { valeur: 'urgent', libelle: 'À traiter', compte: aTraiter.length },
            { valeur: 'reappro', libelle: 'Réappro', compte: indicateurs.reappro.length },
            { valeur: 'foodcost', libelle: 'Food cost', compte: enDanger },
            { valeur: 'inventaire', libelle: 'Inventaire' },
          ]}
        />
      </Contenu>

      <Contenu>
        {onglet === 'urgent' && (
          <SectionUrgent
            liste={aTraiter}
            onRecevoir={setRecevoir}
            onJeter={setJeter}
          />
        )}

        {onglet === 'reappro' && (
          <SectionReappro onRecevoir={setRecevoir} />
        )}

        {onglet === 'foodcost' && <SectionFoodCost plats={platsRisque} />}

        {onglet === 'inventaire' && (
          <SectionInventaire onRecevoir={setRecevoir} onJeter={setJeter} />
        )}
      </Contenu>

      <FeuilleReception
        ingredient={recevoir}
        onFermer={() => setRecevoir(null)}
        onValider={(quantite) => {
          if (!recevoir) return
          envoyer({ type: 'reapprovisionner', id: recevoir.id, quantite })
          notifier({
            ton: 'succes',
            titre: `${recevoir.nom} réceptionné`,
            detail: `+${quantite} ${recevoir.unite} · lot tracé pour le contrôle sanitaire.`,
          })
          vibrer([10, 40, 14])
          setRecevoir(null)
        }}
      />

      <FeuillePerte
        ingredient={jeter}
        onFermer={() => setJeter(null)}
        onValider={(quantite, motif) => {
          if (!jeter) return
          envoyer({ type: 'declarerPerte', id: jeter.id, quantite, motif })
          notifier({
            ton: 'alerte',
            titre: `${quantite} ${jeter.unite} de ${jeter.nom} sortis`,
            detail: `${motif} — ${fcfa(quantite * jeter.prixUnitaire)} enregistrés en perte.`,
          })
          vibrer(18)
          setJeter(null)
        }}
      />
    </div>
  )
}

/* ------------------------------ À traiter ------------------------------ */

function SectionUrgent({
  liste,
  onRecevoir,
  onJeter,
}: {
  liste: { ingredient: Ingredient; raison: 'rupture' | 'dlc' }[]
  onRecevoir: (i: Ingredient) => void
  onJeter: (i: Ingredient) => void
}) {
  const { indicateurs, etat } = useAlba()

  if (liste.length === 0) {
    return (
      <EmptyState
        titre="Rien qui presse"
        texte="Aucune rupture, aucune date qui tourne. Le stock est propre — profites-en pour souffler."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {liste.map(({ ingredient: i, raison }, index) => {
        const jours = indicateurs.autonomie(i.id, i.stock)
        const parJour = indicateurs.consommationJour.get(i.id) ?? 0
        return (
          <Card
            key={i.id}
            className={cn(
              'animate-rise flex flex-col gap-3',
              raison === 'rupture'
                ? 'border-destructive/30 bg-destructive/6'
                : 'border-warning/30 bg-warning/6',
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-xl',
                  raison === 'rupture'
                    ? 'animate-halo bg-destructive/15 text-destructive'
                    : 'bg-warning/15 text-warning',
                )}
              >
                {raison === 'rupture' ? (
                  <TriangleAlertIcon className="size-5" />
                ) : (
                  <CalendarClockIcon className="size-5" />
                )}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold tracking-tight">
                    {i.nom}
                  </h3>
                  {raison === 'rupture' ? (
                    <Badge ton="alerte">sous le seuil</Badge>
                  ) : (
                    <Badge ton="attention">à utiliser — {i.dlc}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-pretty">
                  {raison === 'rupture'
                    ? `Il reste ${i.stock} ${i.unite} pour un seuil de ${i.seuil}. ${
                        Number.isFinite(jours)
                          ? `Au rythme d’aujourd’hui, tu tiens ${jours} jour${jours >= 2 ? 's' : ''}.`
                          : 'Aucune sortie enregistrée aujourd’hui.'
                      }`
                    : `${i.stock} ${i.unite} en chambre froide. Passe-le en premier au service (FIFO) ou sors-le du stock.`}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                <span className="tnum">
                  {i.stock} {i.unite}
                </span>
                <span className="tnum">seuil {i.seuil}</span>
              </div>
              <Progress
                valeur={(i.stock / Math.max(i.seuil * 2, 1)) * 100}
                ton={raison === 'rupture' ? 'alerte' : 'attention'}
              />
              {parJour > 0 && (
                <span className="text-[11px] text-muted-foreground tnum">
                  {parJour} {i.unite} consommés aujourd’hui · {i.fournisseur}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRecevoir(i)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]"
              >
                <TruckIcon className="size-4" />
                Réceptionner
              </button>
              <button
                type="button"
                onClick={() => onJeter(i)}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
                Sortir
              </button>
            </div>
          </Card>
        )
      })}

      {etat.pertes.length > 0 && (
        <Card>
          <CardTitle
            aside={
              <span className="text-[11px] text-muted-foreground tnum">
                {fcfa(etat.pertes.reduce((s, p) => s + p.cout, 0))}
              </span>
            }
          >
            Sorties déclarées aujourd’hui
          </CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {etat.pertes.slice(0, 6).map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 py-2 first:pt-0 last:pb-0"
              >
                <ArrowDownRightIcon className="size-4 shrink-0 text-destructive" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{p.nom}</span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    {p.quantite} {p.unite} · {p.motif} · {p.heure}
                  </span>
                </div>
                <span className="shrink-0 font-display text-sm font-semibold text-destructive tnum">
                  −{fcfa(p.cout)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------- Réappro ------------------------------- */

function SectionReappro({ onRecevoir }: { onRecevoir: (i: Ingredient) => void }) {
  const { indicateurs, etat } = useAlba()

  if (indicateurs.reappro.length === 0) {
    return (
      <EmptyState
        titre="Rien à commander"
        texte="Tous les postes couvrent au moins deux jours de service au rythme actuel."
      />
    )
  }

  const total = indicateurs.reappro.reduce((s, r) => s + r.cout, 0)
  const parFournisseur = new Map<string, typeof indicateurs.reappro>()
  for (const r of indicateurs.reappro) {
    const clef = r.ingredient.fournisseur
    parFournisseur.set(clef, [...(parFournisseur.get(clef) ?? []), r])
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="ring-glow flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Commande suggérée
          </span>
          <p className="font-display text-2xl font-semibold tracking-tight">
            <CountUp valeur={total} suffixe=" F" />
          </p>
          <span className="text-xs text-muted-foreground">
            Calculée sur ta consommation réelle d’aujourd’hui, pas sur une moyenne.
          </span>
        </div>
        <Badge ton="primaire">
          <BanknoteIcon className="size-3" />
          {parFournisseur.size} fournisseur{parFournisseur.size > 1 ? 's' : ''}
        </Badge>
      </Card>

      {[...parFournisseur.entries()].map(([fournisseur, lignes]) => (
        <Card key={fournisseur}>
          <CardTitle
            aside={
              <span className="text-[11px] text-muted-foreground tnum">
                {fcfa(lignes.reduce((s, l) => s + l.cout, 0))}
              </span>
            }
          >
            {fournisseur}
          </CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {lignes.map((r) => (
              <li key={r.ingredient.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">
                    {r.ingredient.nom}
                  </span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    {r.ingredient.stock} {r.ingredient.unite} en stock ·{' '}
                    {Number.isFinite(r.jours)
                      ? `${r.jours} j d’autonomie`
                      : 'pas de sortie aujourd’hui'}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-display text-sm font-semibold tnum">
                    +{r.quantite} {r.ingredient.unite}
                  </span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    {fcfa(r.cout)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onRecevoir(r.ingredient)}
                  aria-label={`Réceptionner ${r.ingredient.nom}`}
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90',
                    r.urgent
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-secondary text-foreground',
                  )}
                >
                  <TruckIcon className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      {etat.receptions.length > 0 && (
        <Card>
          <CardTitle>Réceptions du jour</CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {etat.receptions.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <CheckIcon className="size-4 shrink-0 text-success" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{r.nom}</span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    lot {r.lot} · {r.fournisseur} · {r.heure}
                  </span>
                </div>
                <span className="shrink-0 font-display text-sm font-semibold text-success tnum">
                  +{r.quantite} {r.unite}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

/* ------------------------------ Food cost ------------------------------ */

function SectionFoodCost({
  plats,
}: {
  plats: { plat: (typeof MENU)[number]; cout: number }[]
}) {
  const { etat, indicateurs } = useAlba()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle
          aside={
            <span className="text-[11px] text-muted-foreground">
              seuil d’alerte {SEUIL_FOOD_COST} %
            </span>
          }
        >
          Ce que chaque plat te coûte
        </CardTitle>
        <ul className="flex flex-col divide-y divide-border">
          {plats.map(({ plat, cout }) => {
            const matiere = coutMatiere(plat, etat.stock)
            const vendus = indicateurs.ventesParPlat.get(plat.id) ?? 0
            const margeUnitaire = plat.prix - matiere
            const alerte = cout >= SEUIL_FOOD_COST
            return (
              <li key={plat.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {plat.nom}
                  </span>
                  <Badge ton={alerte ? 'alerte' : cout >= 32 ? 'attention' : 'succes'}>
                    {cout} %
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      valeur={cout}
                      ton={alerte ? 'alerte' : cout >= 32 ? 'attention' : 'succes'}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground tnum">
                    {fcfa(matiere)} → {fcfa(plat.prix)}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground tnum">
                  {vendus} vendus aujourd’hui · {fcfa(margeUnitaire)} de marge par
                  assiette · {fcfa(margeUnitaire * vendus)} gagnés
                </span>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle>Le calcul, en clair</CardTitle>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Ventes de plats</span>
            <span className="font-display font-semibold tnum">
              {fcfa(indicateurs.coutMatiereJour + indicateurs.margeJour + indicateurs.pertesJour)}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Coût matière</span>
            <span className="font-display font-semibold text-destructive tnum">
              −{fcfa(indicateurs.coutMatiereJour)}
            </span>
          </li>
          <li className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Pertes déclarées</span>
            <span className="font-display font-semibold text-destructive tnum">
              −{fcfa(indicateurs.pertesJour)}
            </span>
          </li>
          <li className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
            <span className="font-medium">Marge brute du jour</span>
            <span className="font-display text-lg font-semibold text-success tnum">
              {fcfa(indicateurs.margeJour)}
            </span>
          </li>
        </ul>
      </Card>
    </div>
  )
}

/* ----------------------------- Inventaire ----------------------------- */

function SectionInventaire({
  onRecevoir,
  onJeter,
}: {
  onRecevoir: (i: Ingredient) => void
  onJeter: (i: Ingredient) => void
}) {
  const { etat, envoyer, indicateurs } = useAlba()

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {etat.stock.map((i) => {
        const jours = indicateurs.autonomie(i.id, i.stock)
        const sous = i.stock < i.seuil
        return (
          <Card key={i.id} className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h3 className="truncate font-display text-sm font-semibold tracking-tight">
                  {i.nom}
                </h3>
                <span className="truncate text-[11px] text-muted-foreground">
                  {i.fournisseur} · lot {i.lotRecu ?? '—'}
                </span>
              </div>
              {sous ? (
                <Badge ton="alerte">bas</Badge>
              ) : i.joursRestants !== undefined && i.joursRestants <= 2 ? (
                <Badge ton="attention">{i.dlc}</Badge>
              ) : (
                <Badge ton="succes">ok</Badge>
              )}
            </div>

            <Stepper
              libelle={i.nom}
              valeur={i.stock}
              unite={i.unite}
              pas={i.unite === 'boîtes' ? 1 : 0.5}
              max={9999}
              onChange={(v) =>
                envoyer({ type: 'ajusterStock', id: i.id, delta: +(v - i.stock).toFixed(2) })
              }
            />

            <div className="flex flex-col gap-1">
              <Progress
                valeur={(i.stock / Math.max(i.seuil * 2, 1)) * 100}
                ton={sous ? 'alerte' : 'succes'}
              />
              <div className="flex items-baseline justify-between text-[11px] text-muted-foreground tnum">
                <span>
                  {Number.isFinite(jours) ? `${jours} j d’autonomie` : 'pas de sortie'}
                </span>
                <span>{fcfa(i.stock * i.prixUnitaire)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRecevoir(i)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs font-medium transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]"
              >
                <TruckIcon className="size-3.5" />
                Recevoir
              </button>
              <button
                type="button"
                onClick={() => onJeter(i)}
                disabled={i.stock <= 0}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
              >
                <Trash2Icon className="size-3.5" />
                Sortir
              </button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ------------------------------- Feuilles ------------------------------- */

function FeuilleReception({
  ingredient,
  onFermer,
  onValider,
}: {
  ingredient: Ingredient | null
  onFermer: () => void
  onValider: (quantite: number) => void
}) {
  const { indicateurs } = useAlba()
  const suggestion = ingredient
    ? (indicateurs.reappro.find((r) => r.ingredient.id === ingredient.id)?.quantite ??
      ingredient.lot)
    : 0
  const [quantite, setQuantite] = useState(suggestion)

  // La quantité proposée suit l'ingrédient ouvert : le geste par défaut
  // est toujours celui qu'il faut faire.
  useEffect(() => {
    setQuantite(suggestion)
  }, [suggestion])

  return (
    <Sheet
      ouvert={ingredient !== null}
      onFermer={onFermer}
      titre={ingredient ? `Réception — ${ingredient.nom}` : ''}
      sous="Le lot est horodaté automatiquement pour la traçabilité HACCP."
      pied={
        ingredient && (
          <button
            type="button"
            onClick={() => onValider(quantite)}
            disabled={quantite <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-40"
          >
            <CheckIcon className="size-5" />
            Entrer {quantite} {ingredient.unite} en stock
          </button>
        )
      }
    >
      {ingredient && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-xl bg-secondary/50 p-4">
            <Stepper
              libelle="quantité reçue"
              valeur={quantite}
              unite={ingredient.unite}
              pas={ingredient.lot >= 10 ? 5 : 1}
              min={0}
              onChange={setQuantite}
            />
            <p className="text-center text-xs text-muted-foreground">
              Conditionnement habituel : {ingredient.lot} {ingredient.unite} chez{' '}
              {ingredient.fournisseur}
            </p>
          </div>

          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Stock actuel</span>
              <span className="font-display font-semibold tnum">
                {ingredient.stock} {ingredient.unite}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3">
              <span className="text-muted-foreground">Après réception</span>
              <span className="font-display font-semibold text-success tnum">
                {+(ingredient.stock + quantite).toFixed(2)} {ingredient.unite}
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
              <span className="text-muted-foreground">Coût de la livraison</span>
              <span className="font-display font-semibold tnum">
                {fcfa(quantite * ingredient.prixUnitaire)}
              </span>
            </li>
          </ul>
        </div>
      )}
    </Sheet>
  )
}

function FeuillePerte({
  ingredient,
  onFermer,
  onValider,
}: {
  ingredient: Ingredient | null
  onFermer: () => void
  onValider: (quantite: number, motif: string) => void
}) {
  const [quantite, setQuantite] = useState(1)
  const [motif, setMotif] = useState(MOTIFS[0])

  // Chaque ouverture repart d'une déclaration vierge.
  useEffect(() => {
    if (!ingredient) return
    setQuantite(Math.min(1, ingredient.stock))
    setMotif(ingredient.joursRestants !== undefined ? 'Périmé' : MOTIFS[1])
  }, [ingredient])

  return (
    <Sheet
      ouvert={ingredient !== null}
      onFermer={onFermer}
      titre={ingredient ? `Sortie — ${ingredient.nom}` : ''}
      sous="Déclarer une perte évite les écarts d’inventaire en fin de mois."
      pied={
        ingredient && (
          <button
            type="button"
            onClick={() => onValider(quantite, motif)}
            disabled={quantite <= 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-4 font-display text-base font-semibold text-destructive-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-40"
          >
            <Trash2Icon className="size-5" />
            Sortir {quantite} {ingredient.unite}
          </button>
        )
      }
    >
      {ingredient && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-secondary/50 p-4">
            <Stepper
              libelle="quantité sortie"
              valeur={quantite}
              unite={ingredient.unite}
              pas={ingredient.unite === 'boîtes' ? 1 : 0.5}
              min={0}
              max={ingredient.stock}
              onChange={setQuantite}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Motif
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {MOTIFS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotif(m)}
                  aria-pressed={motif === m}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ease-[var(--ease-spring)] active:scale-[0.97]',
                    motif === m
                      ? 'border-primary/50 bg-primary/12 text-foreground'
                      : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="rounded-lg bg-destructive/8 p-3 text-xs leading-relaxed text-muted-foreground">
            Cette sortie représente{' '}
            <span className="font-semibold text-destructive tnum">
              {fcfa(quantite * ingredient.prixUnitaire)}
            </span>{' '}
            de marchandise. Elle apparaîtra dans ta marge du jour.
          </p>
        </div>
      )}
    </Sheet>
  )
}
