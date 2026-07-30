'use client'

import { useMemo, useState } from 'react'
import {
  ActivityIcon,
  AlertOctagonIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  LifeBuoyIcon,
  ShieldCheckIcon,
  TrendingDownIcon,
  UsersIcon,
} from 'lucide-react'
import {
  PLANS,
  TENANTS,
  fcfa,
  mrrTotal,
  planPar,
  tauxChurn,
  tenantsARisque,
  type StatutTenant,
  type Tenant,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  PageHeader,
  Segments,
  Sheet,
  StatTile,
} from '@/components/kit'
import { CountUp } from '@/components/count-up'
import { cn } from '@/lib/utils'

const LIBELLE_STATUT: Record<StatutTenant, { libelle: string; ton: 'succes' | 'attention' | 'alerte' }> = {
  actif: { libelle: 'Actif', ton: 'succes' },
  risque: { libelle: 'À risque', ton: 'attention' },
  churn: { libelle: 'Résilié', ton: 'alerte' },
}

type Filtre = 'tous' | StatutTenant

/**
 * Console alba : le tableau de bord de l'éditeur, pas du restaurateur.
 * Une identité plus sobre que le reste de l'app — les mêmes matériaux,
 * moins de célébration, plus de contrôle.
 */
export function ConsoleClient() {
  const { notifier } = useAlba()
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [assistance, setAssistance] = useState<Tenant | null>(null)

  const mrr = mrrTotal(TENANTS)
  const churn = tauxChurn(TENANTS)
  const actifs = TENANTS.filter((t) => t.statut !== 'churn')
  const aRisque = tenantsARisque(TENANTS)

  const visibles = useMemo(
    () => (filtre === 'tous' ? TENANTS : TENANTS.filter((t) => t.statut === filtre)),
    [filtre],
  )

  const repartitionPlans = PLANS.map((p) => ({
    plan: p,
    nb: TENANTS.filter((t) => t.plan === p.id && t.statut !== 'churn').length,
  }))

  const ouvrirAssistance = (t: Tenant) => {
    vibrer(12)
    setAssistance(t)
  }

  const confirmerAssistance = () => {
    if (!assistance) return
    notifier({
      ton: 'info',
      titre: `Session ouverte — ${assistance.nom}`,
      detail: 'Accès consenti et journalisé dans le registre d’audit, expirera dans 30 min.',
    })
    vibrer([10, 20, 10])
    setAssistance(null)
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        titre="Console alba"
        sous="Vue globale des restaurants qui tournent sur alba — pas ce qu’un restaurateur voit."
      />

      <Contenu className="flex flex-col gap-6">
        {/* Statut de service */}
        <Card className="flex flex-wrap items-center gap-3 border-success/25 bg-success/6">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/20 text-success">
            <CheckCircle2Icon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-sm font-medium">Tous les systèmes sont opérationnels</span>
            <span className="text-[11px] text-muted-foreground tnum">
              99.98 % de disponibilité sur les 30 derniers jours
            </span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-success">
            <ActivityIcon className="size-3.5" />
            Statut public à jour
          </span>
        </Card>

        {/* Indicateurs clés */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            libelle="MRR"
            icone={<TrendingDownIcon className="size-3.5 rotate-180" />}
            valeur={<CountUp valeur={mrr} suffixe=" F" />}
            detail="revenu mensuel récurrent"
            ton="primaire"
          />
          <StatTile
            libelle="Tenants actifs"
            icone={<Building2Icon className="size-3.5" />}
            valeur={String(actifs.length)}
            detail={`sur ${TENANTS.length} au total`}
          />
          <StatTile
            libelle="Taux de churn"
            icone={<AlertOctagonIcon className="size-3.5" />}
            valeur={`${churn} %`}
            detail="ce mois-ci"
            ton={churn > 5 ? 'alerte' : 'succes'}
          />
          <StatTile
            libelle="À risque"
            icone={<TrendingDownIcon className="size-3.5" />}
            valeur={String(aRisque.length)}
            detail="usage en forte baisse"
            ton={aRisque.length > 0 ? 'alerte' : 'succes'}
          />
        </div>

        {/* Répartition par plan */}
        <Card>
          <CardTitle>Répartition par plan</CardTitle>
          <ul className="flex flex-col gap-3">
            {repartitionPlans.map(({ plan, nb }) => {
              const part = Math.round((nb / Math.max(1, actifs.length)) * 100)
              return (
                <li key={plan.id} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm">{plan.nom}</span>
                    <span className="text-xs text-muted-foreground tnum">
                      {nb} tenant{nb > 1 ? 's' : ''} · {part} %
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-[var(--ease-organic)]"
                      style={{ width: `${part}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Tenants à risque */}
        {aRisque.length > 0 && (
          <Card className="border-warning/30 bg-warning/6">
            <CardTitle aside={<Badge ton="attention">{aRisque.length} à surveiller</Badge>}>
              Tenants à risque
            </CardTitle>
            <ul className="flex flex-col gap-2">
              {aRisque.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-warning/25 bg-card/60 p-3"
                >
                  <ArrowDownRightIcon className="size-4 shrink-0 text-warning" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{t.nom}</span>
                    <span className="text-[11px] text-muted-foreground tnum">
                      {t.ville} · usage {t.usageVsMoisDernier} % vs mois dernier · dernière activité{' '}
                      {t.derniereActivite}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => ouvrirAssistance(t)}
                    className="ml-auto shrink-0 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-background transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]"
                  >
                    Contacter
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Liste des tenants */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-sm font-semibold tracking-tight">
              Tous les restaurants
            </h2>
            <Segments
              valeur={filtre}
              onChange={setFiltre}
              options={[
                { valeur: 'tous', libelle: 'Tous' },
                { valeur: 'actif', libelle: 'Actifs' },
                { valeur: 'risque', libelle: 'À risque', compte: aRisque.length },
                { valeur: 'churn', libelle: 'Résiliés' },
              ]}
            />
          </div>

          <div className="flex flex-col gap-2">
            {visibles.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{t.nom}</span>
                    <Badge ton={LIBELLE_STATUT[t.statut].ton}>
                      {LIBELLE_STATUT[t.statut].libelle}
                    </Badge>
                  </div>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {t.ville} · {planPar(t.plan).nom} · client depuis {t.clientDepuis}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <div className="flex flex-col">
                    <span className="font-display text-sm font-semibold tnum">
                      {fcfa(t.mrr)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">MRR</span>
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={cn(
                        'flex items-center justify-end gap-0.5 font-display text-sm font-semibold tnum',
                        t.usageVsMoisDernier >= 0 ? 'text-success' : 'text-destructive',
                      )}
                    >
                      {t.usageVsMoisDernier >= 0 ? (
                        <ArrowUpRightIcon className="size-3.5" />
                      ) : (
                        <ArrowDownRightIcon className="size-3.5" />
                      )}
                      {Math.abs(t.usageVsMoisDernier)} %
                    </span>
                    <span className="text-[10px] text-muted-foreground">usage</span>
                  </div>
                  <div className="hidden flex-col sm:flex">
                    <span className="flex items-center gap-1 font-display text-sm font-semibold tnum">
                      <UsersIcon className="size-3.5 text-muted-foreground" />
                      {t.employes}
                    </span>
                    <span className="text-[10px] text-muted-foreground">équipe</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => ouvrirAssistance(t)}
                    disabled={t.statut === 'churn'}
                    aria-label={`Assistance pour ${t.nom}`}
                    className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-30"
                  >
                    <LifeBuoyIcon className="size-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Contenu>

      {/* Connexion assistée — consentement et traçabilité avant tout accès */}
      <Sheet
        ouvert={assistance !== null}
        onFermer={() => setAssistance(null)}
        titre={assistance ? `Assistance — ${assistance.nom}` : ''}
        sous="L’accès n’est ouvert qu’avec l’accord du restaurateur et reste journalisé."
        pied={
          assistance && (
            <button
              type="button"
              onClick={confirmerAssistance}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              <ShieldCheckIcon className="size-5" />
              Confirmer et se connecter
            </button>
          )
        }
      >
        {assistance && (
          <div className="flex flex-col gap-3 text-sm">
            <p className="text-pretty leading-relaxed text-muted-foreground">
              Cette session s’ouvrira dans l’espace de{' '}
              <span className="font-medium text-foreground">{assistance.nom}</span> en
              lecture-assistance pour du dépannage. Elle sera automatiquement
              consignée dans le registre d’audit avec ton identité, l’heure et la
              durée d’accès, et expirera après 30 minutes.
            </p>
            <div className="flex items-center gap-2 rounded-lg bg-secondary/50 p-3 text-xs text-muted-foreground">
              <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
              Le restaurateur voit cette connexion apparaître dans son propre journal.
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}
