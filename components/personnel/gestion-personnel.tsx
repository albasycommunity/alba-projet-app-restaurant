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
import { Badge, Card, CardTitle, EmptyState } from '@/components/kit'
import { initialesDe } from '@/lib/auth-contexte'
import { cn } from '@/lib/utils'
import { FormulaireCreationMembre, FormulaireEditionMembre } from './formulaire-membre'

export type Membre = {
  id: string
  email: string
  nom: string
  actif: boolean
  permissions: Permission[]
  creeLe: string
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
  const [succes, setSucces] = useState<string | null>(null)
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

  async function basculerActif(membre: Membre) {
    setErreur(null)
    setSucces(null)
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
      setSucces(`Le compte de ${membre.nom} a été ${membre.actif ? 'désactivé' : 'réactivé'}.`)
      setTimeout(() => setSucces(null), 3000)
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
              onClick={() => {
                setErreur(null)
                setCreation(true)
              }}
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

      {succes && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-rise rounded-full border border-success/30 bg-success/15 px-4 py-2 text-sm font-medium text-success shadow-lg backdrop-blur-md">
          {succes}
        </div>
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
              onClick={() => {
                setErreur(null)
                setCreation(true)
              }}
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
                  onClick={() => {
                    setErreur(null)
                    setEdition(membre)
                  }}
                  aria-label={`Modifier ${membre.nom}`}
                  data-tooltip="Modifier le compte"
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
                  data-tooltip={membre.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
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

      <FormulaireCreationMembre
        ouvert={creation}
        onFermer={() => setCreation(false)}
        onSucces={(message) => {
          setSucces(message)
          setTimeout(() => setSucces(null), 3000)
          charger()
        }}
        onVerrouPalier={setVerrouPalier}
      />

      <FormulaireEditionMembre
        membre={edition}
        onFermer={() => setEdition(null)}
        onSucces={(message) => {
          setSucces(message)
          setTimeout(() => setSucces(null), 3000)
          charger()
        }}
      />
    </Card>
  )
}
