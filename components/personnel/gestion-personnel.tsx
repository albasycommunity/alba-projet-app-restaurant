'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRightIcon,
  CheckIcon,
  LoaderIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  UserPlusIcon,
} from 'lucide-react'
import {
  LIBELLES_PERMISSION,
  TOUTES_LES_PERMISSIONS,
  type Permission,
} from '@/lib/auth'
import { Badge, Card, CardTitle, EmptyState, Sheet } from '@/components/kit'
import { initialesDe } from '@/lib/auth-contexte'
import { EVENEMENT_ONBOARDING_RAFRAICHIR } from '@/components/onboarding/onboarding-client'
import { cn } from '@/lib/utils'

type Membre = {
  id: string
  email: string
  nom: string
  actif: boolean
  permissions: Permission[]
  creeLe: string
}

const CHAMP =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'

/** Pastille de permission — une par zone métier, jamais la facturation. */
function PastillePermission({
  permission,
  active,
  onToggle,
}: {
  permission: Permission
  active: boolean
  onToggle: () => void
}) {  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={active}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-300 ease-[var(--ease-organic)]',
        active
          ? 'border-primary/50 bg-primary/12 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background',
        )}
      >
        {active && <CheckIcon className="size-3" />}
      </span>
      {LIBELLES_PERMISSION[permission]}
    </button>
  )
}

function GroupePermissions({
  permissions,
  onChange,
  erreur,
}: {
  permissions: Permission[]
  /** recoit la permission cliquée ; la bascule se fait par mise à jour fonctionnelle */
  onChange: (permission: Permission) => void
  erreur?: string | null
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        Zones autorisées
      </span>
      <div className="grid grid-cols-2 gap-2">
        {TOUTES_LES_PERMISSIONS.map((p) => (
          <PastillePermission
            key={p}
            permission={p}
            active={permissions.includes(p)}
            onToggle={() => onChange(p)}
          />
        ))}
      </div>
      {erreur && <span className="text-[11px] text-destructive">{erreur}</span>}
    </div>
  )
}

export function GestionPersonnel({
  mettreEnAvantCreation = false,
}: {
  /**
   * Onboarding : pendant le parcours découverte, la création du premier
   * membre est l'étape à faire — le bouton passe au premier plan.
   */
  mettreEnAvantCreation?: boolean
}) {
  const [membres, setMembres] = useState<Membre[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [verrouPalier, setVerrouPalier] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)
  const [edition, setEdition] = useState<Membre | null>(null)
  const [chargement, setChargement] = useState(false)

  const [formulaire, setFormulaire] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    poste: '',
    permissions: [] as Permission[],
  })

  async function charger() {
    const reponse = await fetch('/api/back-office/personnel', {
      cache: 'no-store',
    })
    if (!reponse.ok) {
      setMembres([])
      setErreur('Impossible de charger le personnel.')
      return
    }
    const donnees = await reponse.json()
    setMembres(donnees.personnel)
    setErreur(null)
  }

  useEffect(() => {
    charger()
  }, [])

  /** Bascule fonctionnelle : les clics rapides ne perdent aucune case. */
  const basculerPermissionCreation = (permission: Permission) =>
    setFormulaire((f) => ({
      ...f,
      permissions: f.permissions.includes(permission)
        ? f.permissions.filter((x) => x !== permission)
        : [...f.permissions, permission],
    }))

  const basculerPermissionEdition = (permission: Permission) =>
    setEdition((e) =>
      e
        ? {
            ...e,
            permissions: e.permissions.includes(permission)
              ? e.permissions.filter((x) => x !== permission)
              : [...e.permissions, permission],
          }
        : e,
    )

  async function creer() {
    if (formulaire.permissions.length === 0) {
      setErreur('Coche au moins une zone pour ce membre.')
      return
    }
    setChargement(true)
    setErreur(null)
    try {
      const reponse = await fetch('/api/back-office/personnel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulaire),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Création impossible.')
        // Verrou de palier : la limite de STAFF est dépassée — proposer la
        // mise à niveau au gérant (jamais au staff, qui n'a pas cet écran).
        if (donnees.raison === 'limite-staff') {
          setVerrouPalier(donnees.raison)
        }
        return
      }
      setCreation(false)
      setVerrouPalier(null)
      setFormulaire({ nom: '', email: '', motDePasse: '', poste: '', permissions: [] })
      await charger()
      // Onboarding : le 1er membre peut boucler le parcours — l'orchestrateur
      // se rafraîchit tout de suite (pas besoin d'attendre une navigation).
      window.dispatchEvent(new Event(EVENEMENT_ONBOARDING_RAFRAICHIR))
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }

  async function enregistrerModification() {
    if (!edition) return
    if (edition.permissions.length === 0) {
      setErreur('Coche au moins une zone pour ce membre.')
      return
    }
    setChargement(true)
    setErreur(null)
    try {
      const reponse = await fetch(`/api/back-office/personnel/${edition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: edition.nom, permissions: edition.permissions }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Modification impossible.')
        return
      }
      setEdition(null)
      await charger()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }

  async function basculerActif(membre: Membre) {
    setErreur(null)
    try {
      const reponse = await fetch(`/api/back-office/personnel/${membre.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !membre.actif }),
      })
      if (!reponse.ok) {
        const donnees = await reponse.json()
        setErreur(donnees.erreur ?? 'Opération impossible.')
        return
      }
      await charger()
    } catch {
      setErreur('Le serveur ne répond pas.')
    }
  }

  return (
    <Card id="personnel">
      <CardTitle
        aside={
          <div className="flex items-center gap-2">
            {mettreEnAvantCreation && (
              <Badge ton="primaire">Étape du parcours</Badge>
            )}
            <button
              type="button"
              onClick={() => setCreation(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]',
                mettreEnAvantCreation &&
                  'animate-halo ring-2 ring-primary/50',
              )}
            >
              <UserPlusIcon className="size-3.5" />
              Ajouter un membre
            </button>
          </div>
        }
      >
        Personnel
      </CardTitle>

      {erreur && (
        <p className="mb-3 rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
          {erreur}
        </p>
      )}

      {verrouPalier === 'limite-staff' && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/8 p-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Ton plan Starter inclut 1 membre du personnel actif. Passe au plan
            Pro pour une équipe illimitée — les comptes existants ne sont
            jamais désactivés.
          </p>
          <Link
            href="/abonnement/renouveler?plan=pro&raison=limite-staff"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground"
          >
            Passer au plan Pro
            <ArrowUpRightIcon className="size-3" />
          </Link>
        </div>
      )}

      {membres === null ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin text-primary" />
          Chargement du personnel…
        </div>
      ) : membres.length === 0 ? (
        <EmptyState
          titre="Aucun membre du personnel"
          texte="Crée le premier compte : caissière, cuisinier, responsable stock… Chacun n'aura accès qu'aux zones que tu lui donnes."
          action={
            <button
              type="button"
              onClick={() => setCreation(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            >
              <PlusIcon className="size-3.5" />
              Ajouter un membre
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {membres.map((membre) => (
            <li key={membre.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
                {initialesDe(membre.nom)}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      !membre.actif && 'opacity-45',
                    )}
                  >
                    {membre.nom}
                  </span>
                  {membre.actif ? (
                    <Badge ton="succes">Actif</Badge>
                  ) : (
                    <Badge ton="alerte">Désactivé</Badge>
                  )}
                </div>
                <span className="truncate text-[11px] text-muted-foreground">
                  {membre.email}
                </span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {membre.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {LIBELLES_PERMISSION[p]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEdition(membre)}
                  aria-label={`Modifier ${membre.nom}`}
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => basculerActif(membre)}
                  aria-label={
                    membre.actif
                      ? `Désactiver ${membre.nom}`
                      : `Réactiver ${membre.nom}`
                  }
                  title={
                    membre.actif ? 'Désactiver' : 'Réactiver'
                  }
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg transition-colors',
                    membre.actif
                      ? 'text-muted-foreground hover:bg-destructive/15 hover:text-destructive'
                      : 'text-success hover:bg-success/15',
                  )}
                >
                  <PowerIcon className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Création d'un membre */}
      <Sheet
        ouvert={creation}
        onFermer={() => setCreation(false)}
        titre="Ajouter un membre du personnel"
        sous="Il ne verra que les zones cochées — jamais la facturation ni le back-office."
        pied={
          <button
            type="button"
            disabled={
              chargement ||
              formulaire.nom.trim().length < 2 ||
              formulaire.email.length < 3 ||
              formulaire.motDePasse.length < 8 ||
              formulaire.poste.trim().length < 2
            }
            onClick={creer}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
          >
            {chargement ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <>
                <UserPlusIcon className="size-4" />
                Créer le compte
              </>
            )}
          </button>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            creer()
          }}
          className="flex flex-col gap-4"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Nom complet
            </span>
            <input
              value={formulaire.nom}
              onChange={(e) =>
                setFormulaire({ ...formulaire, nom: e.target.value })
              }
              placeholder="Ex. : Aïssatou Diallo"
              className={CHAMP}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Poste
            </span>
            <input
              value={formulaire.poste}
              onChange={(e) =>
                setFormulaire({ ...formulaire, poste: e.target.value })
              }
              placeholder="Ex. : Caissière, Cuisinier"
              className={CHAMP}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Email
            </span>
            <input
              type="email"
              value={formulaire.email}
              onChange={(e) =>
                setFormulaire({ ...formulaire, email: e.target.value })
              }
              placeholder="toi@restaurant.sn"
              className={CHAMP}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Mot de passe
            </span>
            <input
              type="password"
              minLength={8}
              value={formulaire.motDePasse}
              onChange={(e) =>
                setFormulaire({ ...formulaire, motDePasse: e.target.value })
              }
              placeholder="8 caractères minimum"
              className={CHAMP}
            />
          </label>
          <GroupePermissions
            permissions={formulaire.permissions}
            onChange={basculerPermissionCreation}
          />
        </form>
      </Sheet>

      {/* Modification d'un membre */}
      <Sheet
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        titre={`Modifier — ${edition?.nom ?? ''}`}
        sous="Change ses zones autorisées ou son nom. Le changement est effectif à sa prochaine action."
        pied={
          <button
            type="button"
            disabled={chargement}
            onClick={enregistrerModification}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
          >
            {chargement ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              'Enregistrer'
            )}
          </button>
        }
      >
        {edition && (
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Nom complet
              </span>
              <input
                value={edition.nom}
                onChange={(e) =>
                  setEdition({ ...edition, nom: e.target.value })
                }
                className={CHAMP}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Email
              </span>
              <span className="flex h-11 items-center rounded-lg border border-border bg-secondary/40 px-3 text-sm text-muted-foreground">
                {edition.email}
              </span>
            </div>
            <GroupePermissions
              permissions={edition.permissions}
              onChange={basculerPermissionEdition}
            />
          </div>
        )}
      </Sheet>
    </Card>
  )
}
