import {
  ArrowRightIcon,
  ShareIcon,
  TargetIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { Badge, Card, CardTitle, PageHeader } from '@/components/kit'
import { CountUp } from '@/components/count-up'
import { NOM_COOKIE_SESSION } from '@/lib/auth'
import { verifierSession } from '@/lib/server/auth'
import { PilotageConsulte } from '@/components/onboarding/onboarding-client'
import {
  AFFLUENCE,
  CA_JOUR,
  MENU,
  OBJECTIF_JOUR,
  PAIEMENTS_JOUR,
  STOCK,
  TICKETS_JOUR,
  fcfa,
} from '@/lib/data'

const maxAffluence = Math.max(...AFFLUENCE.map((a) => a.ca))
const topPlats = [...MENU].sort((a, b) => b.vendusJour - a.vendusJour).slice(0, 5)
const alertesStock = STOCK.filter((i) => i.stock < i.seuil)
const partObjectif = Math.round((CA_JOUR / OBJECTIF_JOUR) * 100)

async function prenomConnexion(): Promise<string> {
  try {
    const token = (await cookies()).get(NOM_COOKIE_SESSION)?.value
    if (!token) return 'à bord'
    const jwt = await verifierSession(token)
    return jwt?.nom.split(' ')[0] ?? 'à bord'
  } catch {
    return 'à bord'
  }
}

export default async function PilotagePage() {
  const prenom = await prenomConnexion()
  return (
    <div className="flex flex-col">
      {/* Étape 5 de l'onboarding : cette visite réelle coûte le flag « stats ». */}
      <PilotageConsulte />
      <PageHeader
        titre={`Bonjour ${prenom}`}
        sous="Voilà où en est ta journée. Le rapport partira tout seul sur WhatsApp à la fermeture."
        action={
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
          >
            <ShareIcon className="size-4" />
            Envoyer le rapport
          </button>
        }
      />

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-3 lg:p-8">
        {/* CA du jour */}
        <Card className="animate-rise ring-glow lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Chiffre d’affaires aujourd’hui
              </span>
              <p className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                <CountUp valeur={CA_JOUR} />
                <span className="ml-1 text-2xl text-muted-foreground">FCFA</span>
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge ton="succes">
                  <TrendingUpIcon className="size-3" />
                  +18 % vs hier
                </Badge>
                <span className="text-xs text-muted-foreground tnum">
                  {TICKETS_JOUR} tickets · panier{' '}
                  {fcfa(Math.round(CA_JOUR / TICKETS_JOUR))}
                </span>
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
                  style={{ width: `${partObjectif}%` }}
                />
              </div>
              <span className="font-display text-sm font-semibold text-primary tnum">
                {partObjectif} %
              </span>
            </div>
          </div>

          {/* Heures d'affluence */}
          <div className="mt-6">
            <CardTitle
              aside={
                <span className="text-[11px] text-muted-foreground">
                  Pic à 13h
                </span>
              }
            >
              Heures d’affluence
            </CardTitle>
            <div className="flex h-32 items-end gap-1.5">
              {AFFLUENCE.map((a, i) => {
                const h = Math.round((a.ca / maxAffluence) * 100)
                const pic = a.ca === maxAffluence
                return (
                  <div
                    key={a.heure}
                    className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-full rounded-t-md transition-all duration-700 ease-[var(--ease-spring)] ${
                        pic ? 'bg-primary' : 'bg-primary/25'
                      }`}
                      style={{
                        height: `${h}%`,
                        animation: `alba-rise 0.6s var(--ease-organic) ${i * 40}ms both`,
                      }}
                      title={`${a.heure} — ${a.ca} k FCFA`}
                    />
                    <span className="text-[10px] text-muted-foreground tnum">
                      {a.heure}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Réconciliation des encaissements */}
        <Card className="animate-rise">
          <CardTitle
            aside={<Badge ton="succes">Réconcilié</Badge>}
          >
            Encaissements du jour
          </CardTitle>
          <ul className="flex flex-col gap-3">
            {PAIEMENTS_JOUR.map((p) => (
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
            Aucun écart entre la caisse physique et le mobile money. Jërëjëf
            Sokhna.
          </p>
        </Card>

        {/* Plats les plus vendus + marge */}
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
                    {p.vendusJour}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{p.nom}</span>
                    <span className="text-xs text-muted-foreground tnum">
                      {fcfa(p.prix)} · food cost {p.foodCost} %
                    </span>
                  </div>
                  <Badge ton={marge >= 65 ? 'succes' : marge >= 58 ? 'attention' : 'alerte'}>
                    marge {marge} %
                  </Badge>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Ce qui demande une décision maintenant */}
        <Card className="animate-rise">
          <CardTitle>À décider maintenant</CardTitle>
          <ul className="flex flex-col gap-2">
            {alertesStock.map((i) => (
              <li
                key={i.id}
                className="animate-halo flex items-center gap-3 rounded-lg border border-destructive/25 bg-destructive/8 p-3"
              >
                <TriangleAlertIcon className="size-4 shrink-0 text-destructive" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{i.nom}</span>
                  <span className="text-xs text-muted-foreground tnum">
                    {i.stock} {i.unite} restants · seuil {i.seuil}
                  </span>
                </div>
              </li>
            ))}
            <li className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 p-3">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm font-medium">
                  2 relevés HACCP à faire
                </span>
                <span className="text-xs text-muted-foreground">
                  Avant le service du soir
                </span>
              </div>
              <Link
                href="/hygiene"
                className="ml-auto text-[11px] font-medium text-primary hover:underline"
              >
                Ouvrir
              </Link>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
