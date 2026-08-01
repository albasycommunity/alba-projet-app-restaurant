'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BanIcon,
  CheckCircle2Icon,
  KeyRoundIcon,
  LoaderIcon,
  PlusIcon,
  RefreshCwIcon,
  StoreIcon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react'
import {
  Badge,
  Card,
  CardTitle,
  PageHeader,
  Segments,
  Sheet,
  StatTile,
} from '@/components/kit'
import {
  LIBELLES_STATUT,
  PLANS_ABONNEMENT,
  Role,
  type PlanAbonnement,
  type StatutAbonnement,
} from '@/lib/auth'
import { fcfa } from '@/lib/data'

type AbonnementVue = {
  id: string
  plan: PlanAbonnement
  statut: StatutAbonnement
  montant: number
  dateFin: string
  joursRestants: number
}

type RestaurantVue = {
  id: string
  nom: string
  quartier: string
  gerant: string
  actif: boolean
  abonnement: AbonnementVue | null
}

type UtilisateurVue = {
  id: string
  email: string
  nom: string
  role: Role
  restaurantId: string | null
  actif: boolean
  creeLe: string
}

type PaiementVue = {
  id: string
  restaurantNom: string
  montant: number
  mode: string
  motif: string
  date: string
}

type Overview = {
  stats: {
    restaurants: number
    restaurantsActifs: number
    admins: number
    abonnementsActifs: number
    enAttente: number
    expires: number
    mrq: number
    revenus: number
    commandesClients: number
    clients: number
  }
  restaurants: RestaurantVue[]
  admins: UtilisateurVue[]
  paiementsRecents: PaiementVue[]
}

type Onglet = 'vue' | 'restaurants' | 'comptes'

function statutTon(s: StatutAbonnement) {
  return s === 'actif'
    ? ('succes' as const)
    : s === 'en_attente'
      ? ('attention' as const)
      : ('alerte' as const)
}

export default function PageSuperAdmin() {
  const [onglet, setOnglet] = useState<Onglet>('vue')
  const [donnees, setDonnees] = useState<Overview | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [creerOuvert, setCreerOuvert] = useState(false)
  const [enTravail, setEnTravail] = useState(false)

  const charger = useCallback(async () => {
    setChargement(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/super-admin/overview', {
        cache: 'no-store',
      })
      const d = await reponse.json()
      if (!reponse.ok) {
        setErreur(d.erreur ?? 'Impossible de charger les données.')
        return
      }
      setDonnees(d)
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  async function action(url: string, corps: Record<string, unknown>) {
    setEnTravail(true)
    setMessage(null)
    setErreur(null)
    try {
      const reponse = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      })
      const d = await reponse.json()
      if (!reponse.ok) {
        setErreur(d.erreur ?? 'Action impossible.')
        return
      }
      if (d.nouveauMotDePasse) {
        setMessage(
          `Nouveau mot de passe : ${d.nouveauMotDePasse} — à transmettre au responsable.`,
        )
      } else if (d.message) {
        setMessage(d.message)
      }
      charger()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setEnTravail(false)
    }
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        titre="Super admin"
        sous="Vue globale de la plateforme : abonnements, restaurants inscrits et comptes des chefs."
      />

      <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <Segments<Onglet>
          valeur={onglet}
          onChange={setOnglet}
          options={[
            { valeur: 'vue', libelle: 'Vue d’ensemble' },
            { valeur: 'restaurants', libelle: 'Restaurants & abonnements' },
            { valeur: 'comptes', libelle: 'Comptes' },
          ]}
        />

        {erreur && (
          <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
            {message}
          </p>
        )}

        {chargement && !donnees ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Chargement de la plateforme…
          </p>
        ) : (
          donnees && (
            <>
              {onglet === 'vue' && (
                <VueEnsemble donnees={donnees} />
              )}
              {onglet === 'restaurants' && (
                <Restaurants
                  donnees={donnees}
                  enTravail={enTravail}
                  onAction={action}
                  onCreer={() => setCreerOuvert(true)}
                />
              )}
              {onglet === 'comptes' && (
                <Comptes donnees={donnees} enTravail={enTravail} onAction={action} />
              )}
            </>
          )
        )}
      </div>

      <CreerRestaurant
        ouvert={creerOuvert}
        onFermer={() => setCreerOuvert(false)}
        onCree={() => {
          setCreerOuvert(false)
          charger()
          setMessage('Restaurant créé : compte admin et abonnement actif.')
        }}
      />
    </div>
  )
}

/* ------------------------------ Vue d'ensemble ------------------------------ */

function VueEnsemble({ donnees }: { donnees: Overview }) {
  const { stats, paiementsRecents } = donnees
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          libelle="Restaurants inscrits"
          valeur={stats.restaurants}
          detail={`${stats.restaurantsActifs} actifs`}
          icone={<StoreIcon className="size-3.5" />}
        />
        <StatTile
          libelle="Abonnements actifs"
          valeur={stats.abonnementsActifs}
          detail={`${stats.enAttente} en attente · ${stats.expires} expirés`}
          icone={<WalletIcon className="size-3.5" />}
          ton={stats.enAttente > 0 ? 'primaire' : 'succes'}
        />
        <StatTile
          libelle="Revenu mensuel récurrent"
          valeur={fcfa(stats.mrq)}
          detail="somme des abonnements actifs"
          icone={<RefreshCwIcon className="size-3.5" />}
          ton="primaire"
        />
        <StatTile
          libelle="Commandes clients"
          valeur={stats.commandesClients}
          detail={`${stats.clients} clients inscrits`}
          icone={<UsersIcon className="size-3.5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle
            aside={
              <span className="text-[11px] text-muted-foreground">
                {stats.revenus.toLocaleString('fr-FR')} F cumulés
              </span>
            }
          >
            Paiements récents
          </CardTitle>
          {paiementsRecents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Aucun paiement enregistré.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {paiementsRecents.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">
                      {p.restaurantNom}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(p.date).toLocaleDateString('fr-FR')} · {p.mode} · {p.motif}
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

        <Card>
          <CardTitle>Statut de la plateforme</CardTitle>
          <ul className="flex flex-col gap-2">
            <li className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
              <span>Base de données</span>
              <Badge ton="succes">En ligne</Badge>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
              <span>Synchronisation des ventes</span>
              <Badge ton="succes">OK</Badge>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
              <span>Paiements en attente de confirmation</span>
              <Badge ton={stats.enAttente > 0 ? 'attention' : 'succes'}>
                {stats.enAttente}
              </Badge>
            </li>
            <li className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
              <span>Comptes admin restaurant</span>
              <Badge ton="neutre">{stats.admins}</Badge>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

/* ------------------------- Restaurants & abonnements ------------------------ */

function Restaurants({
  donnees,
  enTravail,
  onAction,
  onCreer,
}: {
  donnees: Overview
  enTravail: boolean
  onAction: (url: string, corps: Record<string, unknown>) => void
  onCreer: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onCreer}
        className="flex items-center gap-2 self-start rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
      >
        <PlusIcon className="size-4" />
        Inscrire un restaurant
      </button>

      <Card>
        <CardTitle
          aside={
            <Badge ton="neutre">
              {donnees.restaurants.length} restaurant{donnees.restaurants.length > 1 ? 's' : ''}
            </Badge>
          }
        >
          Restaurants et abonnements
        </CardTitle>
        <ul className="flex flex-col divide-y divide-border">
          {donnees.restaurants.map((r) => {
            const a = r.abonnement
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <StoreIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.nom}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {r.quartier} · gérant : {r.gerant}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {a ? (
                    <>
                      <Badge ton={statutTon(a.statut)}>
                        {LIBELLES_STATUT[a.statut]}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground tnum">
                        {fcfa(a.montant)} / {a.plan}
                        {' · '}
                        {a.statut === 'actif'
                          ? `${a.joursRestants} j restants`
                          : `échéance ${new Date(a.dateFin).toLocaleDateString('fr-FR')}`}
                      </span>
                    </>
                  ) : (
                    <Badge ton="alerte">Aucun abonnement</Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={enTravail || a?.statut === 'actif'}
                    onClick={() =>
                      onAction(`/api/super-admin/subscriptions/${a?.id}`, {
                        statut: 'actif',
                      })
                    }
                    className="flex items-center gap-1 rounded-lg bg-success/15 px-2.5 py-1.5 text-[11px] font-medium text-success transition-colors hover:bg-success/25 disabled:opacity-40"
                  >
                    <CheckCircle2Icon className="size-3.5" />
                    Activer
                  </button>
                  <button
                    type="button"
                    disabled={enTravail || a?.statut !== 'actif'}
                    onClick={() =>
                      onAction(`/api/super-admin/subscriptions/${a?.id}`, {
                        statut: 'expire',
                      })
                    }
                    className="flex items-center gap-1 rounded-lg bg-destructive/15 px-2.5 py-1.5 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/25 disabled:opacity-40"
                  >
                    <BanIcon className="size-3.5" />
                    Suspendre
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

/* --------------------------------- Comptes ---------------------------------- */

function Comptes({
  donnees,
  enTravail,
  onAction,
}: {
  donnees: Overview
  enTravail: boolean
  onAction: (url: string, corps: Record<string, unknown>) => void
}) {
  return (
    <Card>
      <CardTitle
        aside={
          <Badge ton="neutre">
            {donnees.admins.length} admin{donnees.admins.length > 1 ? 's' : ''} restaurant
          </Badge>
        }
      >
        Comptes admin restaurant
      </CardTitle>
      <ul className="flex flex-col divide-y divide-border">
        {donnees.admins.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
              {u.nom
                .split(/\s+/)
                .filter(Boolean)
                .map((m) => m[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{u.nom}</p>
              <p className="truncate text-[11px] text-muted-foreground">
                {u.email}
              </p>
            </div>
            <Badge ton={u.actif ? 'succes' : 'alerte'}>
              {u.actif ? 'Actif' : 'Désactivé'}
            </Badge>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                disabled={enTravail}
                onClick={() =>
                  onAction(`/api/super-admin/users/${u.id}`, {
                    reinitialiserMotDePasse: true,
                  })
                }
                className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
              >
                <KeyRoundIcon className="size-3.5" />
                Réinitialiser le mot de passe
              </button>
              <button
                type="button"
                disabled={enTravail}
                onClick={() =>
                  onAction(`/api/super-admin/users/${u.id}`, {
                    actif: !u.actif,
                  })
                }
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 ${
                  u.actif
                    ? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
                    : 'bg-success/15 text-success hover:bg-success/25'
                }`}
              >
                {u.actif ? <BanIcon className="size-3.5" /> : <CheckCircle2Icon className="size-3.5" />}
                {u.actif ? 'Désactiver' : 'Réactiver'}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}

/* --------------------------- Inscription restaurant -------------------------- */

function CreerRestaurant({
  ouvert,
  onFermer,
  onCree,
}: {
  ouvert: boolean
  onFermer: () => void
  onCree: () => void
}) {
  const [formulaire, setFormulaire] = useState({
    nom: '',
    quartier: '',
    gerant: '',
    email: '',
    motDePasse: '',
    plan: 'mensuel' as PlanAbonnement,
  })
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  async function inscrire() {
    setErreur(null)
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/super-admin/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulaire),
      })
      const d = await reponse.json()
      if (!reponse.ok) {
        setErreur(d.erreur ?? 'Inscription impossible.')
        return
      }
      setFormulaire({
        nom: '',
        quartier: '',
        gerant: '',
        email: '',
        motDePasse: '',
        plan: 'mensuel',
      })
      onCree()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setEnvoi(false)
    }
  }

  const champ = 'h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'

  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Inscrire un restaurant"
      sous="Crée le restaurant, son compte admin et son abonnement en un geste."
      large
      pied={
        <button
          type="button"
          disabled={
            envoi ||
            !formulaire.nom ||
            !formulaire.quartier ||
            !formulaire.gerant ||
            !formulaire.email ||
            formulaire.motDePasse.length < 8
          }
          onClick={inscrire}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
        >
          {envoi ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <>
              <PlusIcon className="size-4" />
              Inscrire et activer l’abonnement
            </>
          )}
        </button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Nom du restaurant</span>
          <input
            value={formulaire.nom}
            onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })}
            placeholder="Chez Fatou"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Quartier</span>
          <input
            value={formulaire.quartier}
            onChange={(e) => setFormulaire({ ...formulaire, quartier: e.target.value })}
            placeholder="Ngor, Dakar"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Nom du gérant</span>
          <input
            value={formulaire.gerant}
            onChange={(e) => setFormulaire({ ...formulaire, gerant: e.target.value })}
            placeholder="Fatou Ndiaye"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Email de connexion</span>
          <input
            type="email"
            value={formulaire.email}
            onChange={(e) => setFormulaire({ ...formulaire, email: e.target.value })}
            placeholder="chef@restaurant.sn"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Mot de passe (8 caractères min.)
          </span>
          <input
            value={formulaire.motDePasse}
            onChange={(e) => setFormulaire({ ...formulaire, motDePasse: e.target.value })}
            placeholder="••••••••"
            className={champ}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Plan d’abonnement</span>
          <select
            value={formulaire.plan}
            onChange={(e) =>
              setFormulaire({ ...formulaire, plan: e.target.value as PlanAbonnement })
            }
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
          >
            {(Object.keys(PLANS_ABONNEMENT) as PlanAbonnement[]).map((p) => (
              <option key={p} value={p}>
                {PLANS_ABONNEMENT[p].libelle} — {fcfa(PLANS_ABONNEMENT[p].montant)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {erreur && (
        <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {erreur}
        </p>
      )}
    </Sheet>
  )
}
