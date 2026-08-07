'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  FlameIcon,
  ReceiptTextIcon,
  ScaleIcon,
  ShareIcon,
  TargetIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react'
import {
  Badge,
  Card,
  CardTitle,
  EmptyState,
  PageHeader,
  Sheet,
  StatTile,
} from '@/components/kit'
import { CountUp } from '@/components/count-up'
import { useAlba, vibrer } from '@/lib/store'
import { useAuth } from '@/lib/auth-contexte'
import {
  MENU,
  OBJECTIF_JOUR,
  fcfa,
  fcfaCourt,
} from '@/lib/data'

/** Rapport de fin de service, prêt à coller dans WhatsApp. */
function redigerRapport(nomRestaurant: string, d: {
  caJour: number
  tickets: number
  panierMoyen: number
  partObjectif: number
  margeJour: number
  foodCostJour: number
  pertesJour: number
  parMode: { mode: string; montant: number }[]
  top: { nom: string; vendus: number }[]
  alertes: string[]
  coutRH: number
  ratioRH: number
}) {
  const lignes = [
    `${nomRestaurant} — rapport du jour`,
    '',
    `Chiffre d'affaires : ${fcfa(d.caJour)}`,
    `Objectif : ${d.partObjectif} % de ${fcfa(OBJECTIF_JOUR)}`,
    `Tickets : ${d.tickets} · panier moyen ${fcfa(d.panierMoyen)}`,
    `Marge brute : ${fcfa(d.margeJour)} · food cost ${d.foodCostJour} %`,
    `Masse salariale : ${fcfa(d.coutRH)} (${d.ratioRH} % du CA)`,
    d.pertesJour > 0 ? `Pertes déclarées : ${fcfa(d.pertesJour)}` : null,
    '',
    'Encaissements',
    ...d.parMode.map((p) => `· ${p.mode} : ${fcfa(p.montant)}`),
    '',
    'Plats qui ont marché',
    ...d.top.map((p, i) => `${i + 1}. ${p.nom} — ${p.vendus} vendus`),
  ]
  if (d.alertes.length > 0) {
    lignes.push('', 'À traiter demain', ...d.alertes.map((a) => `· ${a}`))
  }
  return lignes.filter((l) => l !== null).join('\n')
}

export function PilotageClient() {
  const { indicateurs, etat, notifier } = useAlba()
  const { utilisateur, restaurantNom } = useAuth()
  const [rapportOuvert, setRapportOuvert] = useState(false)
  const [copie, setCopie] = useState(false)

  const prenom = utilisateur?.nom?.split(' ')[0] ?? 'à bord'

  const topPlats = useMemo(
    () =>
      MENU.map((p) => ({
        ...p,
        vendus: indicateurs.ventesParPlat.get(p.id) ?? 0,
      }))
        .sort((a, b) => b.vendus - a.vendus)
        .slice(0, 5),
    [indicateurs.ventesParPlat],
  )

  const maxAffluence = Math.max(1, ...indicateurs.affluence.map((a) => a.ca))
  const creneauCourant = `${String(new Date().getHours()).padStart(2, '0')}h`

  const alertes = useMemo(() => {
    const liste = indicateurs.alertesStock.map(
      (i) => `${i.nom} : ${i.stock} ${i.unite} restants (seuil ${i.seuil})`,
    )
    if (indicateurs.haccpRestant > 0) {
      liste.push(`${indicateurs.haccpRestant} relevé(s) HACCP non fait(s)`)
    }
    for (const p of indicateurs.peremptions) {
      liste.push(`${p.nom} périme dans ${p.joursRestants} jour(s)`)
    }
    return liste
  }, [indicateurs.alertesStock, indicateurs.haccpRestant, indicateurs.peremptions])

  const rapport = useMemo(
    () =>
      redigerRapport(restaurantNom ?? 'Mon restaurant', {
        caJour: indicateurs.caJour,
        tickets: indicateurs.tickets,
        panierMoyen: indicateurs.panierMoyen,
        partObjectif: indicateurs.partObjectif,
        margeJour: indicateurs.margeJour,
        foodCostJour: indicateurs.foodCostJour,
        pertesJour: indicateurs.pertesJour,
        parMode: indicateurs.parMode,
        top: topPlats.map((p) => ({ nom: p.nom, vendus: p.vendus })),
        alertes,
        coutRH: indicateurs.coutRH,
        ratioRH: indicateurs.ratioRH,
      }),
    [indicateurs, topPlats, alertes, restaurantNom],
  )

  const envoyerWhatsApp = () => {
    vibrer(14)
    window.open(
      `https://wa.me/?text=${encodeURIComponent(rapport)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(rapport)
      setCopie(true)
      window.setTimeout(() => setCopie(false), 2000)
    } catch {
      notifier({
        ton: 'alerte',
        titre: 'Copie impossible',
        detail: 'Sélectionne le texte à la main pour le partager.',
      })
    }
  }

  const restePourObjectif = Math.max(0, OBJECTIF_JOUR - indicateurs.caJour)
  const ticketsLocaux = etat.commandes.filter((c) => c.id.startsWith('local-')).length

  // Aucun encaissement réel encore : on ne montre pas de zéros trompeurs,
  // on invite à la première vente.
  const aucuneDonnee =
    indicateurs.tickets === 0 &&
    indicateurs.caJour === 0 &&
    indicateurs.totalDecaissements === 0

  if (aucuneDonnee) {
    return (
      <div className="flex flex-col">
        <PageHeader
          titre={`Bonjour ${prenom}`}
          sous="Le pilotage se remplit tout seul à chaque encaissement, ici."
        />
        <div className="p-4 sm:p-6 lg:p-8">
          <EmptyState
            titre="Aucune vente encaissée aujourd’hui"
            texte="Enregistre ton premier ticket à la caisse : le chiffre d’affaires, la réconciliation et la rentabilité apparaîtront ici, calculés sur tes vraies ventes."
            action={
              <Link
                href="/caisse"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-sm hover:brightness-110"
              >
                <ReceiptTextIcon className="size-4" />
                Prendre un ticket
              </Link>
            }
          />
          {etat.enAttente.length > 0 && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              {etat.enAttente.length} ticket(s) déjà encaissé(s) en attente de
              synchronisation — ils apparaîtront dès qu’ils remonteront.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        titre={`Bonjour ${prenom}`}
        sous="Chaque chiffre ci-dessous se recalcule à l’encaissement. Rien n’est figé."
        action={
          <button
            type="button"
            onClick={() => setRapportOuvert(true)}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
          >
            <ShareIcon className="size-4" />
            Rapport du jour
          </button>
        }
      />

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3 lg:p-8">
        {/* Chiffre d'affaires réel de la session */}
        <Card className="animate-rise ring-glow lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chiffre d’affaires aujourd’hui
              </span>
              <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                <CountUp valeur={indicateurs.caJour} />
                <span className="ml-1 text-2xl text-muted-foreground">FCFA</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {indicateurs.tickets > 0 && (
                  <Badge ton="succes">
                    <TrendingUpIcon className="size-3" />
                    Encaissements de la journée
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground tnum">
                  {indicateurs.tickets} ticket{indicateurs.tickets > 1 ? 's' : ''} · panier{' '}
                  {fcfa(indicateurs.panierMoyen)}
                </span>
                {ticketsLocaux > 0 && (
                  <Badge ton="primaire">
                    {ticketsLocaux} encaissé{ticketsLocaux > 1 ? 's' : ''} sur ce
                    poste
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TargetIcon className="size-3.5" />
                Objectif {fcfa(OBJECTIF_JOUR)}
              </span>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-[var(--ease-organic)]"
                  style={{ width: `${indicateurs.partObjectif}%` }}
                />
              </div>
              <span className="font-display text-sm font-semibold text-primary tnum">
                {indicateurs.partObjectif} %
              </span>
              <span className="text-[11px] text-muted-foreground tnum">
                {restePourObjectif > 0
                  ? `${fcfaCourt(restePourObjectif)} pour y arriver`
                  : 'Objectif atteint'}
              </span>
            </div>
          </div>

          {/* Heures d'affluence — le créneau en cours grossit à chaque vente */}
          <div className="mt-6">
            <CardTitle
              aside={
                <span className="text-[11px] text-muted-foreground">
                  Créneau en cours {creneauCourant}
                </span>
              }
            >
              Heures d’affluence
            </CardTitle>
            <div className="flex h-32 items-stretch gap-1.5">
              {indicateurs.affluence.map((a, i) => {
                const h = Math.round((a.ca / maxAffluence) * 100)
                const maintenant = a.heure === creneauCourant
                return (
                  <div
                    key={a.heure}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <div
                      className={`w-full rounded-t-md transition-[height] duration-700 ease-[var(--ease-spring)] ${
                        maintenant
                          ? 'bg-primary'
                          : a.ca === maxAffluence
                            ? 'bg-primary/60'
                            : 'bg-primary/25'
                      }`}
                      style={{
                        height: `${Math.max(h, 3)}%`,
                        animation: `alba-rise 0.6s var(--ease-organic) ${i * 40}ms both`,
                      }}
                      data-tooltip={`${a.heure} — ${a.ca} k FCFA`}
                    />
                    <span
                      className={`text-[10px] tnum ${
                        maintenant
                          ? 'font-semibold text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {a.heure}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Encaissements par mode, recalculés */}
        <Card className="animate-rise">
          <CardTitle
            aside={
              <Badge ton={etat.enAttente.length > 0 ? 'attention' : 'succes'}>
                {etat.enAttente.length > 0
                  ? `${etat.enAttente.length} en attente`
                  : 'Réconcilié'}
              </Badge>
            }
          >
            Encaissements du jour
          </CardTitle>
          <ul className="flex flex-col gap-3">
            {indicateurs.parMode.map((p) => (
              <li key={p.mode} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm">{p.mode}</span>
                  <span className="font-display text-sm font-semibold tnum">
                    {fcfa(p.montant)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-[var(--ease-organic)]"
                    style={{ width: `${p.part}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-secondary/60 p-3 text-xs leading-relaxed text-muted-foreground">
            {etat.enAttente.length > 0
              ? 'Des tickets attendent le réseau. Ils remonteront tout seuls, le total ci-dessus les compte déjà.'
              : 'Aucun écart entre la caisse physique et le mobile money. Jërëjëf Sokhna.'}
          </p>
        </Card>

        {/* La rentabilité réelle, pas seulement le CA */}
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-5">
          <StatTile
            libelle="Marge brute du jour"
            valeur={fcfa(indicateurs.margeJour)}
            detail={`après ${fcfa(indicateurs.coutMatiereJour)} de matière`}
            icone={<ScaleIcon className="size-3.5" />}
            ton={indicateurs.margeJour > 0 ? 'succes' : 'alerte'}
          />
          <StatTile
            libelle="Food cost réel"
            valeur={`${indicateurs.foodCostJour} %`}
            detail={
              indicateurs.pertesJour > 0
                ? `dont ${fcfa(indicateurs.pertesJour)} de pertes`
                : 'aucune perte déclarée'
            }
            ton={indicateurs.foodCostJour > 40 ? 'alerte' : 'neutre'}
          />
          <StatTile
            libelle="En cuisine"
            valeur={indicateurs.enCuisine}
            detail="commandes à sortir"
            icone={<FlameIcon className="size-3.5" />}
            ton={indicateurs.enCuisine > 6 ? 'alerte' : 'neutre'}
          />
          <StatTile
            libelle="Équipe présente"
            valeur={indicateurs.equipePresente}
            detail={`sur ${etat.equipe.length} personnes`}
            icone={<UsersIcon className="size-3.5" />}
          />
          <StatTile
            libelle="Masse salariale"
            valeur={fcfa(indicateurs.coutRH)}
            detail={`${indicateurs.ratioRH} % du CA`}
            icone={<WalletIcon className="size-3.5" />}
            ton={indicateurs.ratioRH > 35 ? 'alerte' : 'neutre'}
          />
        </div>

        {/* Plats les plus vendus, marge recalculée sur les prix d'achat du stock */}
        <Card className="animate-rise lg:col-span-2">
          <CardTitle
            aside={
              <Link
                href="/stock"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Food cost détaillé
                <ArrowRightIcon className="size-3" />
              </Link>
            }
          >
            Plats les plus vendus
          </CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {topPlats.map((p) => {
              const marge = 100 - p.foodCost
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary font-display text-xs font-semibold tnum">
                    {p.vendus}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{p.nom}</span>
                    <span className="text-xs text-muted-foreground tnum">
                      {fcfa(p.prix)} · {fcfa(p.prix * p.vendus)} générés
                    </span>
                  </div>
                  <Badge
                    ton={marge >= 65 ? 'succes' : marge >= 58 ? 'attention' : 'alerte'}
                  >
                    marge {marge} %
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Décisions du moment, tirées de l'état réel */}
        <Card className="animate-rise">
          <CardTitle
            aside={
              <span className="text-[11px] text-muted-foreground tnum">
                {indicateurs.alertesStock.length + (indicateurs.haccpRestant > 0 ? 1 : 0)}{' '}
                point(s)
              </span>
            }
          >
            À décider maintenant
          </CardTitle>
          <ul className="flex flex-col gap-2">
            {indicateurs.alertesStock.length === 0 &&
              indicateurs.haccpRestant === 0 && (
                <li className="rounded-lg border border-success/25 bg-success/8 p-3 text-sm">
                  Rien d’urgent. Stock au-dessus des seuils et relevés à jour.
                </li>
              )}
            {indicateurs.alertesStock.map((i) => {
              const jours = indicateurs.autonomie(i.id, i.stock)
              return (
                <li
                  key={i.id}
                  className="animate-halo flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/8 p-3"
                >
                  <TriangleAlertIcon className="size-4 shrink-0 text-destructive" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{i.nom}</span>
                    <span className="text-xs text-muted-foreground tnum">
                      {i.stock} {i.unite} restants ·{' '}
                      {Number.isFinite(jours)
                        ? `${jours} j au rythme du jour`
                        : `seuil ${i.seuil}`}
                    </span>
                  </div>
                  <Link
                    href="/stock"
                    className="ml-auto shrink-0 text-[11px] font-medium text-primary hover:underline"
                  >
                    Réappro
                  </Link>
                </li>
              )
            })}
            {indicateurs.haccpRestant > 0 && (
              <li className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium tnum">
                    {indicateurs.haccpRestant} relevé
                    {indicateurs.haccpRestant > 1 ? 's' : ''} HACCP à faire
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Avant la fin du service
                  </span>
                </div>
                <Link
                  href="/hygiene"
                  className="ml-auto shrink-0 text-[11px] font-medium text-primary hover:underline"
                >
                  Ouvrir
                </Link>
              </li>
            )}
          </ul>
        </Card>
      </div>

      <Sheet
        ouvert={rapportOuvert}
        onFermer={() => setRapportOuvert(false)}
        titre="Rapport du jour"
        sous="Généré à partir des encaissements réels. Relis-le avant d’envoyer."
        large
        pied={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copier}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3 text-sm font-medium transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              {copie ? (
                <CheckIcon className="size-4 text-success" />
              ) : (
                <CopyIcon className="size-4" />
              )}
              {copie ? 'Copié' : 'Copier'}
            </button>
            <button
              type="button"
              onClick={envoyerWhatsApp}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              <ShareIcon className="size-4" />
              Envoyer sur WhatsApp
            </button>
          </div>
        }
      >
        <pre className="rounded-xl bg-secondary/60 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {rapport}
        </pre>
      </Sheet>
    </div>
  )
}
