'use client'

import { useEffect, useState } from 'react'
import { CheckIcon, LoaderIcon, UserPlusIcon } from 'lucide-react'
import {
  LIBELLES_PERMISSION,
  TOUTES_LES_PERMISSIONS,
  type Permission,
} from '@/lib/auth'
import { Sheet } from '@/components/kit'
import { cn } from '@/lib/utils'
import { EVENEMENT_ONBOARDING_RAFRAICHIR } from '@/components/onboarding/onboarding-client'
import type { Membre } from './gestion-personnel'

const CHAMP =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'

function PastillePermission({
  permission,
  active,
  onToggle,
}: {
  permission: Permission
  active: boolean
  onToggle: () => void
}) {
  return (
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

export function FormulaireCreationMembre({
  ouvert,
  onFermer,
  onSucces,
  onVerrouPalier,
}: {
  ouvert: boolean
  onFermer: () => void
  onSucces: (message: string) => void
  onVerrouPalier: (raison: string) => void
}) {
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState({
    nom: '',
    email: '',
    motDePasse: '',
    poste: '',
    permissions: [] as Permission[],
  })

  const basculerPermission = (permission: Permission) =>
    setFormulaire((f) => ({
      ...f,
      permissions: f.permissions.includes(permission)
        ? f.permissions.filter((x) => x !== permission)
        : [...f.permissions, permission],
    }))

  async function creer() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formulaire.email)) {
      setErreur('Email invalide')
      return
    }
    if (formulaire.motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
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
        if (donnees.raison === 'limite-staff') {
          onVerrouPalier(donnees.raison)
        }
        return
      }
      
      setFormulaire({ nom: '', email: '', motDePasse: '', poste: '', permissions: [] })
      onSucces('Le compte a bien été créé !')
      onFermer()
      window.dispatchEvent(new Event(EVENEMENT_ONBOARDING_RAFRAICHIR))
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onFermer}
      titre="Ajouter un membre du personnel"
      sous="Il ne verra que les zones cochées — jamais la facturation ni le back-office."
      pied={
        <button
          type="button"
          disabled={chargement}
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
        {erreur && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}
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
          onChange={basculerPermission}
        />
      </form>
    </Sheet>
  )
}

export function FormulaireEditionMembre({
  membre,
  onFermer,
  onSucces,
}: {
  membre: Membre | null
  onFermer: () => void
  onSucces: (message: string) => void
}) {
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [edition, setEdition] = useState<Membre | null>(null)

  useEffect(() => {
    if (membre) {
      setEdition(membre)
      setErreur(null)
    } else {
      setEdition(null)
    }
  }, [membre])

  const basculerPermission = (permission: Permission) =>
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
      
      onSucces('Les modifications ont été enregistrées.')
      onFermer()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }

  return (
    <Sheet
      ouvert={membre !== null}
      onFermer={onFermer}
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
          {erreur && (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
              {erreur}
            </p>
          )}
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
            onChange={basculerPermission}
          />
        </div>
      )}
    </Sheet>
  )
}
