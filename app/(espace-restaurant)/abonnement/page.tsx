'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightIcon,
  CalendarClockIcon,
  ReceiptTextIcon,
  WalletIcon,
} from 'lucide-react'
import { Badge, Card, CardTitle, EmptyState, PageHeader, Progress, StatTile } from '@/components/kit'
import { LIBELLES_STATUT, PLANS_ABONNEMENT, montantPalier } from '@/lib/auth'
import { fcfa } from '@/lib/data'

type DonneesAbonnement = {
  abonnement: {
    id: string
    plan: 'mensuel' | 'annuel'
    palier: 'starter' | 'pro' | 'premium'
    statut: 'actif' | 'decouverte' | 'expire' | 'en_attente'
    dateDebut: string
    dateFin: string
    montant: number
    joursRestants: number
    decouverteActionsRestantes: number | null
  } | null
  paiements: {
    id: string
    montant: number
    mode: string
    motif: string
    date: string
  }[]
  restaurant: { nom: string; quartier: string } | null
}

export default function PageAbonnement() {
  const [donnees, setDonnees] = useState<DonneesAbonnement | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState(false)
  const [tentative, setTentative] = useState(0)

  useEffect(() => {
    setChargement(true)
    setErreur(false)
    fetch('/api/back-office/abonnement', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDonnees)
      .catch(() => setErreur(true))
      .finally(() => setChargement(false))
  }, [tentative])

  if (chargement) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Chargement de ton abonnement…</p>
      </div>
    )
  }

  const abonnement = donnees?.abonnement ?? null
  // Le statut n'est affiché que quand `abonnement` existe (branche
  // gardée ci-dessous) — le repli ne peut jamais s'afficher.
  const statut = abonnement?.statut ?? 'expire'
  // Jamais de valeur fantôme : si le compteur manque en découverte, on
  // affiche épuisé plutôt que d'inventer un quota.
  const actionsRestantes = abonnement?.decouverteActionsRestantes ?? 0

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  return (
    <div className="flex flex-col">
      <PageHeader
        titre="Mon abonnement"
        sous="L’abonnement ouvre l’accès au back-office. Sans paiement actif, la gestion quotidienne est suspendue."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        {erreur ? (
          <EmptyState
            titre="Impossible de charger ton abonnement"
            texte="Le serveur ne répond pas pour le moment. Réessaie dans un instant."
            action={
              <button
                type="button"
                onClick={() => setTentative((t) => t + 1)}
                className="rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
              >
                Réessayer
              </button>
            }
          />
        ) : !abonnement ? (
          <EmptyState
            titre="Aucun abonnement actif"
            texte="Cet établissement n’a pas encore d’abonnement. Choisis un plan pour rouvrir le back-office."
            action={
              <Link
                href="/abonnement/renouveler"
                className="rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
              >
                Souscrire un abonnement
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                libelle="Statut"
                valeur={
                  <Badge
                    ton={statut === 'actif' ? 'succes' : statut === 'decouverte' ? 'primaire' : statut === 'en_attente' ? 'attention' : 'alerte'}
                    className="text-sm"
                  >
                    {LIBELLES_STATUT[statut]}
                  </Badge>
                }
                detail={donnees?.restaurant?.nom}
                icone={<ReceiptTextIcon className="size-3.5" />}
              />
              <StatTile
                libelle="Plan"
                valeur={`${PLANS_ABONNEMENT[abonnement.palier].libelle} · ${abonnement.plan}`}
                detail={`${fcfa(montantPalier(abonnement.palier, abonnement.plan))} · ${PLANS_ABONNEMENT[abonnement.palier].detail}`}
                icone={<WalletIcon className="size-3.5" />}
              />
              <StatTile
                libelle="Échéance"
                valeur={formatDate(abonnement.dateFin)}
                detail={
                  abonnement.joursRestants >= 0
                    ? `${abonnement.joursRestants} jour${abonnement.joursRestants > 1 ? 's' : ''} restants`
                    : 'échu depuis ' + Math.abs(abonnement.joursRestants) + ' jour(s)'
                }
                icone={<CalendarClockIcon className="size-3.5" />}
              />
            </div>

            {statut === 'decouverte' && (
              <div className="animate-halo flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/8 p-4">
                <ReceiptTextIcon className="size-5 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    Mode découverte — tu explores Alba avec des données d'exemple
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {actionsRestantes > 0 ? (
                      <>
                        Il te reste{' '}
                        <span className="font-semibold text-foreground tnum">
                          {actionsRestantes} action{actionsRestantes > 1 ? 's' : ''} réelle{actionsRestantes > 1 ? 's' : ''}
                        </span>{' '}
                        (encaissements, création d'employés). Quand tu es prêt :
                      </>
                    ) : (
                      'Actions réelles épuisées — active Alba pour continuer.'
                    )}
                  </p>
                </div>
                <Link
                  href="/abonnement/renouveler?raison=activation-requise"
                  className="rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
                >
                  Activer mon restaurant
                </Link>
              </div>
            )}

            {statut === 'actif' && abonnement.joursRestants <= 7 && (
              <div className="animate-halo rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-warning">
                    Bientôt l’échéance ({abonnement.joursRestants} jours)
                  </p>
                  <Progress valeur={Math.max(0, (abonnement.joursRestants / 30) * 100)} ton="attention" />
                  <p className="text-xs text-muted-foreground">
                    Renouvelle à l’avance : le back-office ne s’interrompt pas.
                  </p>
                </div>
              </div>
            )}

            {(statut === 'expire' || statut === 'en_attente') && (
              <div className="animate-halo rounded-xl border border-destructive/25 bg-destructive/10 p-4">
                <p className="text-sm font-semibold">
                  {statut === 'expire'
                    ? 'Abonnement expiré — le back-office est suspendu.'
                    : 'Paiement en attente de confirmation par le super admin.'}
                </p>
                <Link
                  href="/abonnement/renouveler"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
                >
                  Renouveler maintenant
                  <ArrowRightIcon className="size-3.5" />
                </Link>
              </div>
            )}

            <Card>
              <CardTitle
                aside={
                  <Link
                    href="/abonnement/renouveler"
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    Renouveler <ArrowRightIcon className="size-3" />
                  </Link>
                }
              >
                Historique des paiements
              </CardTitle>
              {donnees && donnees.paiements.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Aucun paiement enregistré pour le moment.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {(donnees?.paiements ?? []).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-sm font-medium">{p.motif}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDate(p.date)} · {p.mode}
                        </span>
                      </div>
                      <span className="font-display text-sm font-semibold tnum">
                        {fcfa(p.montant)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
