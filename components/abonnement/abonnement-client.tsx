'use client'

import { useMemo, useState } from 'react'
import {
  ArrowUpRightIcon,
  Building2Icon,
  CheckIcon,
  CreditCardIcon,
  CrownIcon,
  DownloadIcon,
  PackageIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TriangleAlertIcon,
  UsersIcon,
  ZapIcon,
} from 'lucide-react'
import {
  ABONNEMENT,
  EQUIPE,
  FACTURES,
  MODES_PAIEMENT,
  PLANS,
  fcfa,
  planPar,
  type ModePaiement,
  type PlanId,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import { Badge, Card, CardTitle, Contenu, PageHeader, Progress, Sheet } from '@/components/kit'
import { CountUp } from '@/components/count-up'
import { cn } from '@/lib/utils'

const ICONES_PLAN: Record<PlanId, typeof ZapIcon> = {
  essentiel: ZapIcon,
  pro: SparklesIcon,
  groupe: CrownIcon,
}

type MoyenPaiement = ModePaiement | 'Carte bancaire'

/**
 * Abonnement. Une seule idée par section : ce que je paye, ce que ça me
 * donne, et ce qui se passe si un prélèvement rate — jamais une coupure
 * brutale en plein service.
 */
export function AbonnementClient() {
  const { notifier } = useAlba()
  const [planActuel, setPlanActuel] = useState<PlanId>(ABONNEMENT.plan)
  const [statut, setStatut] = useState(ABONNEMENT.statut)
  const [moyen, setMoyen] = useState<MoyenPaiement>(ABONNEMENT.modePaiement)
  const [choix, setChoix] = useState<PlanId | null>(null)
  const [ouvrirPaiement, setOuvrirPaiement] = useState(false)

  const plan = planPar(planActuel)
  const employesActifs = EQUIPE.length
  const partEmployes = plan.employesMax
    ? Math.round((employesActifs / plan.employesMax) * 100)
    : 0
  const partPoints = plan.pointsDeVente
    ? Math.round((ABONNEMENT.pointsDeVenteActifs / plan.pointsDeVente) * 100)
    : 0
  const procheLimite = plan.employesMax !== null && partEmployes >= 80

  const factureAregler = useMemo(
    () => FACTURES.find((f) => f.statut === 'echouee'),
    [],
  )

  const confirmerChangement = (id: PlanId) => {
    setPlanActuel(id)
    setChoix(null)
    vibrer([10, 30, 14])
    notifier({
      ton: 'succes',
      titre: `Plan ${planPar(id).nom} activé`,
      detail:
        id === 'groupe'
          ? 'Un chargé de compte alba te contacte sous 24 h pour finaliser.'
          : 'Le nouveau tarif s’applique dès le prochain prélèvement.',
    })
  }

  const confirmerPaiement = (m: MoyenPaiement) => {
    setMoyen(m)
    setOuvrirPaiement(false)
    if (statut === 'grace') setStatut('actif')
    vibrer(14)
    notifier({
      ton: 'succes',
      titre: `${m} enregistré comme moyen de paiement`,
      detail: 'Utilisé pour tous les prochains prélèvements automatiques.',
    })
  }

  const exporter = () => {
    vibrer(12)
    notifier({
      ton: 'info',
      titre: 'Export préparé',
      detail: 'Tes données t’appartiennent — l’archive complète part par e-mail.',
    })
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        titre="Abonnement"
        sous="Le plan grandit avec ton restaurant. Payé comme tu payes déjà, sans surprise."
        action={
          <button
            type="button"
            onClick={exporter}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
          >
            <DownloadIcon className="size-4" />
            Exporter mes données
          </button>
        }
      />

      <Contenu className="flex flex-col gap-6">
        {statut === 'grace' && (
          <Card className="animate-halo border-warning/40 bg-warning/8">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
                <TriangleAlertIcon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="font-display text-sm font-semibold">
                  Un prélèvement n’est pas passé
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {factureAregler
                    ? `${fcfa(factureAregler.montant)} pour ${factureAregler.periode}, via ${factureAregler.mode}. `
                    : ''}
                  Il te reste{' '}
                  <span className="font-medium text-foreground tnum">
                    {ABONNEMENT.joursGraceRestants} jours
                  </span>{' '}
                  de période de grâce — ton restaurant continue de tourner normalement
                  pendant ce temps. On ne coupe jamais un service en cours.
                </p>
                <button
                  type="button"
                  onClick={() => setOuvrirPaiement(true)}
                  className="mt-2 w-fit rounded-lg bg-warning px-3 py-2 text-xs font-semibold text-background transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]"
                >
                  Régulariser maintenant
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Plan actuel + usage */}
        <Card className="animate-rise ring-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Plan actuel
              </span>
              <div className="flex items-center gap-2">
                <p className="font-display text-3xl font-semibold tracking-tight">
                  {plan.nom}
                </p>
                {plan.populaire && <Badge ton="primaire">le plus choisi</Badge>}
                <Badge ton={statut === 'actif' ? 'succes' : 'attention'}>
                  {statut === 'actif' ? 'actif' : 'en grâce'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.prix !== null ? (
                  <>
                    <CountUp valeur={plan.prix} suffixe=" F" /> / mois · prochain
                    prélèvement le {ABONNEMENT.prochainPrelevement}
                  </>
                ) : (
                  'Tarif sur devis, adapté au nombre de restaurants'
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3 py-2">
              <CreditCardIcon className="size-4 text-primary" />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-medium">{moyen}</span>
                <button
                  type="button"
                  onClick={() => setOuvrirPaiement(true)}
                  className="text-left text-[11px] text-primary hover:underline"
                >
                  Modifier
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2Icon className="size-3.5" />
                  Points de vente
                </span>
                <span className="tnum">
                  {ABONNEMENT.pointsDeVenteActifs} /{' '}
                  {plan.pointsDeVente ?? 'illimité'}
                </span>
              </div>
              <Progress
                valeur={plan.pointsDeVente ? partPoints : 8}
                ton={partPoints >= 90 ? 'alerte' : 'primaire'}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <UsersIcon className="size-3.5" />
                  Employés
                </span>
                <span className="tnum">
                  {employesActifs} / {plan.employesMax ?? 'illimité'}
                </span>
              </div>
              <Progress
                valeur={plan.employesMax ? partEmployes : 8}
                ton={partEmployes >= 90 ? 'alerte' : partEmployes >= 80 ? 'attention' : 'primaire'}
              />
            </div>
          </div>

          {procheLimite && (
            <div className="animate-pop mt-4 flex items-start gap-3 rounded-xl border border-primary/35 bg-primary/8 p-3.5">
              <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-pretty">
                Ton équipe approche la limite du plan {plan.nom}. Passer à{' '}
                <span className="font-medium">
                  {planActuel === 'essentiel' ? 'Pro' : 'Groupe'}
                </span>{' '}
                évite toute coupure au prochain recrutement.
              </p>
            </div>
          )}
        </Card>

        {/* Comparatif des plans */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold tracking-tight">
            Changer de formule
          </h2>
          <div className="grid gap-3 lg:grid-cols-3">
            {PLANS.map((p) => {
              const Icone = ICONES_PLAN[p.id]
              const actif = p.id === planActuel
              return (
                <Card
                  key={p.id}
                  className={cn(
                    'flex flex-col gap-4',
                    p.populaire && !actif && 'border-primary/40',
                    actif && 'ring-glow',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                      <Icone className="size-5" />
                    </span>
                    {p.populaire && <Badge ton="primaire">populaire</Badge>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle>{p.nom}</CardTitle>
                    <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
                      {p.accroche}
                    </p>
                    <p className="mt-1 font-display text-2xl font-semibold tracking-tight tnum">
                      {p.prix !== null ? `${fcfa(p.prix)}` : 'Sur devis'}
                      {p.prix !== null && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {' '}
                          / mois
                        </span>
                      )}
                    </p>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {p.avantages.map((a) => (
                      <li key={a} className="flex items-start gap-2 text-sm">
                        <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                        <span className="text-pretty">{a}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    disabled={actif}
                    onClick={() => setChoix(p.id)}
                    className={cn(
                      'mt-auto flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:cursor-default',
                      actif
                        ? 'bg-secondary text-muted-foreground'
                        : 'bg-primary text-primary-foreground hover:brightness-110',
                    )}
                  >
                    {actif ? 'Plan actuel' : p.id === 'groupe' ? 'Être rappelé' : 'Passer à ce plan'}
                  </button>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Historique de facturation */}
        <Card>
          <CardTitle
            aside={
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ShieldCheckIcon className="size-3" />
                Certifiable pour un dossier de crédit
              </span>
            }
          >
            Historique des factures
          </CardTitle>
          <ul className="flex flex-col divide-y divide-border">
            {FACTURES.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{f.periode}</span>
                  <span className="text-[11px] text-muted-foreground tnum">
                    {f.date} · {f.mode}
                  </span>
                </div>
                <span className="shrink-0 font-display text-sm font-semibold tnum">
                  {fcfa(f.montant)}
                </span>
                <Badge ton={f.statut === 'payee' ? 'succes' : 'alerte'} className="shrink-0">
                  {f.statut === 'payee' ? 'Payée' : 'Échouée'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        <p className="rounded-xl bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground text-pretty">
          Facturation automatique, relances douces avant échéance, jamais de
          coupure en plein service : une période de grâce protège toujours ton
          restaurant le temps de régulariser.
        </p>
      </Contenu>

      {/* Confirmation de changement de plan */}
      <Sheet
        ouvert={choix !== null}
        onFermer={() => setChoix(null)}
        titre={choix ? `Passer au plan ${planPar(choix).nom}` : ''}
        sous={
          choix === 'groupe'
            ? 'Un chargé de compte confirme les conditions avec toi avant activation.'
            : 'Le changement prend effet immédiatement, le prorata s’ajuste sur la prochaine facture.'
        }
        pied={
          choix && (
            <button
              type="button"
              onClick={() => confirmerChangement(choix)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              <CheckIcon className="size-5" />
              {choix === 'groupe' ? 'Demander à être rappelé' : `Confirmer le plan ${planPar(choix).nom}`}
            </button>
          )
        }
      >
        {choix && (
          <ul className="flex flex-col gap-2">
            {planPar(choix).avantages.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm">
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-success" />
                <span className="text-pretty">{a}</span>
              </li>
            ))}
          </ul>
        )}
      </Sheet>

      {/* Moyen de paiement récurrent */}
      <Sheet
        ouvert={ouvrirPaiement}
        onFermer={() => setOuvrirPaiement(false)}
        titre="Moyen de paiement"
        sous="Utilisé pour le prélèvement automatique de chaque mois, sur les mêmes rails que tes clients."
      >
        <div className="grid grid-cols-2 gap-2">
          {MODES_PAIEMENT.map((m) => (
            <button
              key={m.mode}
              type="button"
              onClick={() => confirmerPaiement(m.mode)}
              className={cn(
                'flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.97]',
                moyen === m.mode
                  ? 'border-success/50 bg-success/8'
                  : 'border-border bg-card hover:border-primary/45',
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-background"
                  style={{ background: m.couleur }}
                  aria-hidden="true"
                >
                  {m.raccourci}
                </span>
                <span className="min-w-0 truncate text-sm font-medium">{m.mode}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => confirmerPaiement('Carte bancaire')}
            className={cn(
              'col-span-2 flex items-center gap-2 rounded-xl border p-3 text-left transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.97]',
              moyen === 'Carte bancaire'
                ? 'border-success/50 bg-success/8'
                : 'border-border bg-card hover:border-primary/45',
            )}
          >
            <CreditCardIcon className="size-5 text-primary" />
            <span className="text-sm font-medium">Carte bancaire</span>
          </button>
        </div>
      </Sheet>
    </div>
  )
}
