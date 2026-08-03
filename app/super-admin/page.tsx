'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  BanIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  KeyRoundIcon,
  LoaderIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SmartphoneIcon,
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
  PALIERS_ABONNEMENT,
  PLANS_ABONNEMENT,
  Role,
  montantPalier,
  type PalierAbonnement,
  type PlanAbonnement,
  type StatutAbonnement,
} from '@/lib/auth'
import { fcfa } from '@/lib/data'
import { LogoMark } from '@/components/landing/logo'

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
    essais: number
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

type Onglet = 'vue' | 'restaurants' | 'comptes' | 'paiement'

function statutTon(s: StatutAbonnement) {
  return s === 'actif'
    ? ('succes' as const)
    : s === 'essai'
      ? ('primaire' as const)
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
        titre={
          <span className="flex items-center gap-3">
            <LogoMark className="size-10" />
            Super admin
          </span>
        }
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
            { valeur: 'paiement', libelle: 'Moyens de paiement' },
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
              {onglet === 'paiement' && <MoyensPaiement />}
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
          detail={`${stats.essais} en essai · ${stats.enAttente} en attente · ${stats.expires} expirés`}
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
                        {a.statut === 'actif' || a.statut === 'essai'
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
    palier: 'starter' as PalierAbonnement,
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
        palier: 'starter',
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
          <span className="text-xs font-medium text-muted-foreground">Palier</span>
          <select
            value={formulaire.palier}
            onChange={(e) =>
              setFormulaire({ ...formulaire, palier: e.target.value as PalierAbonnement })
            }
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
          >
            {PALIERS_ABONNEMENT.map((p) => (
              <option key={p} value={p}>
                {PLANS_ABONNEMENT[p].libelle} —{' '}
                {fcfa(montantPalier(p, 'mensuel'))}/mois ·{' '}
                {fcfa(montantPalier(p, 'annuel'))}/an
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Périodicité</span>
          <select
            value={formulaire.plan}
            onChange={(e) =>
              setFormulaire({ ...formulaire, plan: e.target.value as PlanAbonnement })
            }
            className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60 focus:ring-3 focus:ring-primary/15"
          >
            <option value="mensuel">Mensuel — {fcfa(montantPalier(formulaire.palier, 'mensuel'))}</option>
            <option value="annuel">Annuel — {fcfa(montantPalier(formulaire.palier, 'annuel'))} (2 mois offerts)</option>
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

/* ------------------------- Moyens de paiement ------------------------- */

type VueNabooPay = {
  actif: boolean
  apiKeyConfiguree: boolean
  webhookSecretConfiguree: boolean
  etat: string
  mock: boolean
}

type DonneesPaiement = {
  numerosMobileMoney: Record<string, string>
  naboopay: VueNabooPay
  fournisseurs: { code: string; nom: string; etat: string }[]
  webhookUrl: string
}

const ETATS_NABOOPAY: Record<string, { libelle: string; ton: 'succes' | 'primaire' | 'attention' | 'alerte' | 'neutre' }> = {
  actif: { libelle: 'Actif', ton: 'succes' },
  actif_simulation: { libelle: 'Actif (simulation)', ton: 'primaire' },
  simulation_desactive: { libelle: 'Simulation, désactivé', ton: 'neutre' },
  incomplet: { libelle: 'Activé sans clé API', ton: 'alerte' },
  configure_desactive: { libelle: 'Configuré, désactivé', ton: 'neutre' },
  non_configure: { libelle: 'Non configuré', ton: 'alerte' },
  bientot: { libelle: 'Bientôt', ton: 'neutre' },
}

function MoyensPaiement() {
  const [donnees, setDonnees] = useState<DonneesPaiement | null>(null)
  const [numeros, setNumeros] = useState<Record<string, string>>({})
  const [naboopay, setNaboopay] = useState({
    actif: false,
    apiKey: '',
    webhookSecret: '',
  })
  const [chargement, setChargement] = useState(true)
  const [enregistrement, setEnregistrement] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    try {
      const reponse = await fetch('/api/super-admin/paiement', {
        cache: 'no-store',
      })
      const d = await reponse.json()
      if (!reponse.ok) {
        setErreur(d.erreur ?? 'Impossible de charger la configuration.')
        return
      }
      setDonnees(d)
      setNumeros(d.numerosMobileMoney)
      setNaboopay({ actif: d.naboopay.actif, apiKey: '', webhookSecret: '' })
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  async function enregistrer() {
    setErreur(null)
    setMessage(null)
    setEnregistrement(true)
    try {
      const reponse = await fetch('/api/super-admin/paiement', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numerosMobileMoney: numeros,
          naboopay: {
            actif: naboopay.actif,
            apiKey: naboopay.apiKey,
            webhookSecret: naboopay.webhookSecret,
          },
        }),
      })
      const d = await reponse.json()
      if (!reponse.ok) {
        setErreur(d.erreur ?? 'Enregistrement impossible.')
        return
      }
      setMessage(d.message ?? 'Configuration enregistrée.')
      charger()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setEnregistrement(false)
    }
  }

  const champ =
    'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'

  if (chargement && !donnees) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Chargement de la configuration…
      </p>
    )
  }
  if (!donnees) return null

  const etatNabooPay = ETATS_NABOOPAY[donnees.naboopay.etat] ?? ETATS_NABOOPAY.non_configure

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2.5 text-xs text-success">
          {message}
        </p>
      )}
      {erreur && (
        <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {erreur}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Numéros de réception (fallback manuel) */}
        <Card>
          <CardTitle
            aside={<SmartphoneIcon className="size-4 text-muted-foreground" />}
          >
            Numéros de réception mobile money
          </CardTitle>
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Affichés aux restaurateurs sur le flux de paiement manuel
            (fallback). Laisse vide pour afficher « Numéro non configuré » —
            aucun faux numéro ne sera jamais montré.
          </p>
          <div className="flex flex-col gap-3">
            {Object.keys(numeros).map((mode) => (
              <label key={mode} className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {mode}
                </span>
                <input
                  value={numeros[mode] ?? ''}
                  onChange={(e) =>
                    setNumeros({ ...numeros, [mode]: e.target.value })
                  }
                  placeholder="+221 78 48 54 767"
                  className={champ}
                />
              </label>
            ))}
          </div>
        </Card>

        {/* Paiement automatique */}
        <Card className="border-primary/30">
          <CardTitle
            aside={<Badge ton={etatNabooPay.ton}>{etatNabooPay.libelle}</Badge>}
          >
            Paiement automatique — NabooPay
          </CardTitle>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Quand c'est actif et configuré, les restaurateurs paient en ligne :
            création de transaction, redirection vers le checkout, confirmation
            instantanée par webhook et activation automatique de l'abonnement.
            En cas de clé manquante ou d'erreur, le flux manuel prend le relais.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Clé API NabooPay{' '}
                {donnees.naboopay.apiKeyConfiguree && (
                  <span className="text-success">· configurée</span>
                )}
              </span>
              <input
                type="password"
                value={naboopay.apiKey}
                onChange={(e) =>
                  setNaboopay({ ...naboopay, apiKey: e.target.value })
                }
                placeholder={
                  donnees.naboopay.apiKeyConfiguree
                    ? '••••••••••••'
                    : 'Ex. nb_live_…'
                }
                autoComplete="off"
                className={champ}
              />
              <span className="text-[10px] text-muted-foreground">
                Laisse vide pour conserver la clé actuelle.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Secret de signature webhook{' '}
                {donnees.naboopay.webhookSecretConfiguree && (
                  <span className="text-success">· configuré</span>
                )}
              </span>
              <input
                type="password"
                value={naboopay.webhookSecret}
                onChange={(e) =>
                  setNaboopay({ ...naboopay, webhookSecret: e.target.value })
                }
                placeholder={
                  donnees.naboopay.webhookSecretConfiguree
                    ? '••••••••••••'
                    : 'whsec_…'
                }
                autoComplete="off"
                className={champ}
              />
              <span className="text-[10px] text-muted-foreground">
                Laisse vide pour conserver le secret actuel.
              </span>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                URL du webhook à enregistrer chez NabooPay
              </span>
              <input
                readOnly
                value={donnees.webhookUrl}
                onFocus={(e) => e.currentTarget.select()}
                className={champ}
              />
              <span className="text-[10px] text-muted-foreground">
                À coller dans le dashboard NabooPay une fois le site en ligne —
                l'URL locale (localhost) n'est pas joignable depuis Internet.
              </span>
            </label>

            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">
                Proposer le paiement automatique aux restaurateurs
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={naboopay.actif}
                onClick={() =>
                  setNaboopay({ ...naboopay, actif: !naboopay.actif })
                }
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  naboopay.actif ? 'bg-success' : 'bg-secondary'
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-transform ${
                    naboopay.actif
                      ? 'translate-x-[22px]'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <p className="rounded-lg border border-warning/25 bg-warning/10 px-3 py-2.5 text-[11px] leading-relaxed text-warning">
              Les clés sont stockées côté serveur et jamais réaffichées :
              après enregistrement, seul l'état « configurée » est visible.
              <br />
              {donnees.naboopay.mock
                ? 'Mode simulation actif (NABOOPAY_MOCK) : aucune clé réelle requise pour tester le flux.'
                : 'Pour tester sans clé réelle : lance le serveur avec NABOOPAY_MOCK=mock.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Fournisseurs — structure extensible */}
      <Card>
        <CardTitle
          aside={<CreditCardIcon className="size-4 text-muted-foreground" />}
        >
          Fournisseurs de paiement
        </CardTitle>
        <ul className="flex flex-col divide-y divide-border">
          {donnees.fournisseurs.map((f) => {
            const etat =
              ETATS_NABOOPAY[f.etat] ?? ETATS_NABOOPAY.non_configure
            return (
              <li
                key={f.code}
                className="flex items-center gap-3 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <WalletIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.nom}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {f.etat === 'bientot'
                      ? 'Intégrable plus tard via la même structure — sans refonte.'
                      : 'Configuration au-dessus'}
                  </p>
                </div>
                <Badge ton={etat.ton}>{etat.libelle}</Badge>
              </li>
            )
          })}
        </ul>
      </Card>

      <button
        type="button"
        disabled={enregistrement}
        onClick={enregistrer}
        className="flex items-center gap-2 self-start rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03] disabled:opacity-50"
      >
        {enregistrement ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <SaveIcon className="size-4" />
        )}
        Enregistrer les moyens de paiement
      </button>
    </div>
  )
}
