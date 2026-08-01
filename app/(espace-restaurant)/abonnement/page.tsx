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
import { LIBELLES_STATUT, PLANS_ABONNEMENT } from '@/lib/auth'
import { fcfa } from '@/lib/data'

type DonneesAbonnement = {
  abonnement: {
    id: string
    plan: 'mensuel' | 'annuel'
    statut: 'actif' | 'essai' | 'expire' | 'en_attente'
    dateDebut: string
    dateFin: string
    montant: number
    joursRestants: number
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

  useEffect(() => {
    fetch('/api/back-office/abonnement', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setDonnees)
      .catch(() => setDonnees(null))
      .finally(() => setChargement(false))
  }, [])

  if (chargement) {
    return (
      <div className="p-8">
        <p className="text-sm text-muted-foreground">Chargement de ton abonnement…</p>
      </div>
    )
  }

  const abonnement = donnees?.abonnement ?? null
  const statut = abonnement?.statut ?? 'expire'

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
        {!abonnement ? (
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
                    ton={statut === 'actif' ? 'succes' : statut === 'essai' ? 'primaire' : statut === 'en_attente' ? 'attention' : 'alerte'}
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
                valeur={PLANS_ABONNEMENT[abonnement.plan].libelle}
                detail={fcfa(abonnement.montant) + ' · ' + PLANS_ABONNEMENT[abonnement.plan].detail}
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

            {statut === 'essai' && (
              <div className="animate-halo rounded-xl border border-primary/30 bg-primary/8 p-4">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold">
                    Essai gratuit — {abonnement.joursRestants} jour
                    {abonnement.joursRestants > 1 ? 's' : ''} restant
                    {abonnement.joursRestants > 1 ? 's' : ''}
                  </p>
                  <Progress valeur={Math.max(0, (abonnement.joursRestants / 15) * 100)} ton="primaire" />
                  <p className="text-xs text-muted-foreground">
                    {abonnement.joursRestants <= 7
                      ? `L'essai se termine bientôt. Choisis ton plan payant (${PLANS_ABONNEMENT[abonnement.plan].libelle.toLowerCase()}) pour continuer sans interruption.`
                      : `Profite de tout le back-office pendant ton essai. À l'échéance, passe au plan ${PLANS_ABONNEMENT[abonnement.plan].libelle.toLowerCase()} pour continuer.`}
                  </p>
                </div>
                <Link
                  href="/abonnement/renouveler"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground"
                >
                  Passer au plan payant
                  <ArrowRightIcon className="size-3.5" />
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
