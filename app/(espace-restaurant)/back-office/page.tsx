'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRightIcon,
  ClipboardCheckIcon,
  FlameIcon,
  HeartIcon,
  PackageIcon,
  PlusIcon,
  ReceiptTextIcon,
  ScanBarcodeIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { Badge, Card, CardTitle, EmptyState, PageHeader, Sheet, StatTile } from '@/components/kit'
import { useAlba } from '@/lib/store'
import { useAuth } from '@/lib/auth-contexte'
import { useMenu } from '@/components/menu-store'
import { GestionPersonnel } from '@/components/personnel/gestion-personnel'
import { CATEGORIES, fcfa, type Categorie } from '@/lib/data'

const OUTILS = [
  { href: '/caisse', label: 'Caisse', detail: 'Encaisser cash, Wave, Orange Money', icon: ScanBarcodeIcon },
  { href: '/cuisine', label: 'Cuisine', detail: 'File des commandes en cours', icon: FlameIcon },
  { href: '/stock', label: 'Stock', detail: 'Ruptures, péremptions, réappro', icon: PackageIcon },
  { href: '/hygiene', label: 'Hygiène', detail: 'Relevés HACCP et preuves photo', icon: ClipboardCheckIcon },
  { href: '/equipe', label: 'Équipe', detail: 'Pointage, planning, formations', icon: UsersIcon },
  { href: '/clients', label: 'Clients', detail: 'Fidélité, points, relances', icon: HeartIcon },
]

type AbonnementInfo = {
  abonnement: {
    plan: 'mensuel' | 'annuel'
    statut: 'actif' | 'essai' | 'expire' | 'en_attente'
    dateFin: string
    montant: number
    joursRestants: number
  } | null
}

export default function PageBackOffice() {
  const { indicateurs, etat } = useAlba()
  const { utilisateur } = useAuth()
  const { plats, ajouterPlat, modifierPlat, basculerRupture, retirerPlat } = useMenu()

  const [abonnement, setAbonnement] = useState<AbonnementInfo['abonnement'] | null>(null)
  const [formulaire, setFormulaire] = useState(false)
  const [nouveau, setNouveau] = useState({
    nom: '',
    prix: 0,
    categorie: 'Plats' as Categorie,
    preparation: 8,
  })

  useEffect(() => {
    fetch('/api/back-office/abonnement', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: AbonnementInfo) => setAbonnement(d.abonnement))
      .catch(() => setAbonnement(null))
  }, [])

  const statut = abonnement?.statut ?? 'actif'
  const jours = abonnement?.joursRestants ?? 30
  const bientotExpiration = statut === 'actif' && jours <= 7
  const inactif = statut !== 'actif'

  return (
    <div className="flex flex-col">
      <PageHeader
        titre="Back-office"
        sous={`Bienvenue ${utilisateur?.nom ?? 'à bord'} — le menu, les outils du service et le suivi de l’abonnement, au même endroit.`}
        action={
          <button
            type="button"
            onClick={() => setFormulaire(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
          >
            <PlusIcon className="size-4" />
            Nouveau plat
          </button>
        }
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        {/* Bannière abonnement */}
        {inactif ? (
          <div className="animate-halo flex flex-wrap items-center gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
            <ReceiptTextIcon className="size-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Abonnement {statut === 'expire' ? 'expiré' : 'en attente de paiement'}
              </p>
              <p className="text-xs text-muted-foreground">
                Le back-office est suspendu jusqu’à la confirmation du paiement par le super admin.
              </p>
            </div>
            <Link
              href="/abonnement/renouveler"
              className="rounded-lg bg-destructive px-3.5 py-2 text-xs font-medium text-destructive-foreground"
            >
              Renouveler maintenant
            </Link>
          </div>
        ) : bientotExpiration ? (
          <div className="animate-halo flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
            <ReceiptTextIcon className="size-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Ton abonnement expire dans {jours} jour{jours > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Le {new Date(abonnement!.dateFin).toLocaleDateString('fr-FR')} — renouvelle pour garder le back-office ouvert.
              </p>
            </div>
            <Link
              href="/abonnement/renouveler"
              className="rounded-lg bg-warning px-3.5 py-2 text-xs font-medium text-warning-foreground"
            >
              Renouveler
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-success/25 bg-success/8 p-4">
            <ReceiptTextIcon className="size-5 shrink-0 text-success" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                Abonnement actif — {jours} jours restants
              </p>
              <p className="text-xs text-muted-foreground">
                Plan {abonnement?.plan} · {fcfa(abonnement?.montant ?? 0)} · échéance le{' '}
                {abonnement ? new Date(abonnement.dateFin).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
            <Link
              href="/abonnement"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Voir le détail <ArrowRightIcon className="size-3" />
            </Link>
          </div>
        )}

        {/* Chiffres du jour */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile libelle="CA aujourd'hui" valeur={fcfa(indicateurs.caJour)} detail={`panier moyen ${fcfa(indicateurs.panierMoyen)}`} />
          <StatTile libelle="Tickets" valeur={indicateurs.tickets} detail={etat.enAttente.length > 0 ? `${etat.enAttente.length} en attente de synchro` : 'tout est synchronisé'} />
          <StatTile libelle="En cuisine" valeur={indicateurs.enCuisine} detail="commandes en cours" ton="primaire" />
          <StatTile libelle="Ruptures stock" valeur={indicateurs.alertesStock.length} detail="à réapprovisionner" ton={indicateurs.alertesStock.length > 0 ? 'alerte' : 'succes'} />
        </div>

        {/* Gestion du menu */}
        <Card>
          <CardTitle
            aside={
              <Badge ton="neutre">
                {plats.filter((p) => p.actif).length} plats à la carte
              </Badge>
            }
          >
            Gestion du menu
          </CardTitle>          {plats.length === 0 ? (
            <EmptyState
              titre="Le menu est vide"
              texte="Ajoute ton premier plat avec le bouton « Nouveau plat »."
              action={
                <button
                  type="button"
                  onClick={() => setFormulaire(true)}
                  className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                >
                  Ajouter un plat
                </button>
              }
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {plats.map((plat) => (
                <li
                  key={plat.id}
                  className={`flex items-center gap-3 py-2.5 ${!plat.actif ? 'opacity-45' : ''}`}
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">{plat.nom}</span>
                      {plat.rupture && <Badge ton="alerte">Rupture</Badge>}
                      {!plat.actif && <Badge ton="neutre">Retiré</Badge>}
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {plat.categorie}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground tnum">
                      {fcfa(plat.prix)} · ~{plat.preparation} min
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => basculerRupture(plat.id)}
                      disabled={!plat.actif}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        plat.rupture
                          ? 'bg-destructive/15 text-destructive'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      } disabled:opacity-40`}
                    >
                      {plat.rupture ? 'Dispo' : 'Rupture'}
                    </button>
                    <button
                      type="button"
                      onClick={() => retirerPlat(plat.id)}
                      aria-label={`Retirer ${plat.nom} du menu`}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Outils du service */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {OUTILS.map((outil) => (
            <Link
              key={outil.href}
              href={outil.href}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.01]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <outil.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{outil.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {outil.detail}
                </p>
              </div>
              <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[var(--ease-spring)] group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        {/* Personnel : comptes STAFF, permissions, désactivation */}
        <GestionPersonnel />
      </div>

      {/* Formulaire nouveau plat */}
      <Sheet
        ouvert={formulaire}
        onFermer={() => setFormulaire(false)}
        titre="Nouveau plat"
        sous="Il apparaît immédiatement sur la carte client."
        pied={
          <button
            type="button"
            disabled={nouveau.nom.trim().length < 2 || nouveau.prix <= 0}
            onClick={() => {
              ajouterPlat(nouveau)
              setNouveau({ nom: '', prix: 0, categorie: 'Plats', preparation: 8 })
              setFormulaire(false)
            }}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
          >
            <PlusIcon className="size-4" />
            Ajouter à la carte
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Nom du plat</span>
            <input
              value={nouveau.nom}
              onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })}
              placeholder="Ex. : Thiébou blanc"
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Prix (FCFA)</span>
              <input
                type="number"
                min={100}
                step={100}
                value={nouveau.prix || ''}
                onChange={(e) => setNouveau({ ...nouveau, prix: +e.target.value })}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Temps de préparation</span>
              <input
                type="number"
                min={1}
                value={nouveau.preparation}
                onChange={(e) => setNouveau({ ...nouveau, preparation: +e.target.value })}
                className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Catégorie</span>
            <select
              value={nouveau.categorie}
              onChange={(e) => setNouveau({ ...nouveau, categorie: e.target.value as Categorie })}
              className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Sheet>
    </div>
  )
}
