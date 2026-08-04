'use client'

import { useEffect, useState } from 'react'
import {
  CheckIcon,
  ClipboardCheckIcon,
  EyeIcon,
  KeyRoundIcon,
  LoaderIcon,
  PhoneIcon,
  ShieldAlertIcon,
  UserRoundIcon,
  XIcon,
} from 'lucide-react'
import {
  LIBELLES_STATUT_ABSENCE,
  LIBELLES_TYPE_ABSENCE,
  type AbsenceRh,
  type EmployeRh,
} from '@/lib/rh'
import { Badge, Card, CardTitle, EmptyState, Sheet } from '@/components/kit'
import { cn } from '@/lib/utils'

type EquipeRh = {
  employes: EmployeRh[]
  absencesEnAttente: (AbsenceRh & { employeNom: string; declareeParNom: string })[]
  absencesTraitees: (AbsenceRh & { employeNom: string; declareeParNom: string })[]
}

function dateLisible(iso: string) {
  const [annee, mois, jour] = iso.slice(0, 10).split('-').map(Number)
  return new Date(annee, mois - 1, jour).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Ancienneté lisible depuis la date d'embauche — l'équipe en quelques mots. */
function anciennete(iso: string) {
  const [annee, mois] = iso.slice(0, 10).split('-').map(Number)
  const maintenant = new Date()
  let annees = maintenant.getFullYear() - annee
  let moisTotaux = maintenant.getMonth() + 1 - mois
  if (moisTotaux < 0) {
    annees -= 1
    moisTotaux += 12
  }
  if (annees >= 1) return `${annees} an${annees > 1 ? 's' : ''}`
  if (moisTotaux >= 1) return `${moisTotaux} mois`
  return 'moins d’un mois'
}

const TON_STATUT: Record<AbsenceRh['statut'], 'attention' | 'succes' | 'alerte'> = {
  declaree: 'attention',
  justifiee: 'succes',
  refusee: 'alerte',
}

/**
 * Onglet RH de l'Équipe — réservé à la gérante (jamais affiché pour un
 * STAFF, même avec la permission Équipe). Absences à traiter, fiches des
 * membres et réinitialisation des mots de passe. Toutes les données
 * viennent de la vue agrégée serveur, strictement limitée à son
 * restaurant.
 */
export function OngletRh() {
  const [donnees, setDonnees] = useState<EquipeRh | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enTraitement, setEnTraitement] = useState<string | null>(null)
  const [resetDe, setResetDe] = useState<EmployeRh | null>(null)
  const [motDePasseTemporaire, setMotDePasseTemporaire] = useState<string | null>(null)

  const charger = async () => {
    try {
      const reponse = await fetch('/api/rh/equipe', { cache: 'no-store' })
      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => null)
        setErreur(donnees?.erreur ?? 'Impossible de charger la vue RH.')
        return
      }
      setDonnees(await reponse.json())
      setErreur(null)
    } catch {
      setErreur('Le serveur ne répond pas.')
    }
  }

  useEffect(() => {
    charger()
  }, [])

  const traiter = async (id: string, statut: 'justifiee' | 'refusee') => {
    setEnTraitement(id)
    try {
      const reponse = await fetch(`/api/rh/absences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      })
      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => null)
        setErreur(donnees?.erreur ?? 'Traitement impossible.')
        return
      }
      await charger()
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setEnTraitement(null)
    }
  }

  const reinitialiser = async () => {
    if (!resetDe) return
    setErreur(null)
    try {
      const reponse = await fetch(
        `/api/rh/personnel/${resetDe.utilisateur.id}/reinitialiser-mot-de-passe`,
        { method: 'POST' },
      )
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees?.erreur ?? 'Réinitialisation impossible.')
        return
      }
      // Affichage UNIQUE : on ne garde le mot de passe que dans cet état
      // local, et on le vide dès que la modale se ferme.
      setMotDePasseTemporaire(donnees.motDePasseTemporaire)
      setResetDe(null)
    } catch {
      setErreur('Le serveur ne répond pas.')
    }
  }

  if (erreur && !donnees) {
    return (
      <EmptyState
        titre="Vue RH indisponible"
        texte={erreur}
      />
    )
  }

  if (!donnees) {
    return (
      <p className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <LoaderIcon className="size-4 animate-spin text-primary" />
        Chargement de la vue RH…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Card className="border-primary/25 bg-primary/6">
          <p className="text-sm leading-relaxed text-pretty">
            <span className="font-medium">C'est ici que ça se joue en douceur.</span>{' '}
            <span className="text-muted-foreground">
              Justifie ou refuse une absence, vérifie les fiches de l'équipe et
              réinitialise un mot de passe oublié. Rien de ce qui se passe ici
              n'est visible par les membres.
            </span>
          </p>
        </Card>

        {erreur && (
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          À traiter
          {donnees.absencesEnAttente.length > 0 && (
            <span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning tnum">
              {donnees.absencesEnAttente.length}
            </span>
          )}
        </h2>
        {donnees.absencesEnAttente.length === 0 ? (
          <Card>
            <p className="py-2 text-sm leading-relaxed text-muted-foreground">
              Rien en attente. Les déclarations de l'équipe arrivent ici dès
              qu'elles sont posées.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {donnees.absencesEnAttente.map((a) => (
              <Card key={a.id} className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <ClipboardCheckIcon className="size-4" />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {a.employeNom}
                      </span>
                      <Badge ton="attention">
                        {LIBELLES_TYPE_ABSENCE[a.type]}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground tnum">
                      {dateLisible(a.date)}
                      {a.motif && ` · « ${a.motif} »`}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={enTraitement === a.id}
                    onClick={() => traiter(a.id, 'justifiee')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2.5 text-xs font-semibold text-success-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:opacity-50"
                  >
                    {enTraitement === a.id ? (
                      <LoaderIcon className="size-3.5 animate-spin" />
                    ) : (
                      <CheckIcon className="size-3.5" />
                    )}
                    Justifier
                  </button>
                  <button
                    type="button"
                    disabled={enTraitement === a.id}
                    onClick={() => traiter(a.id, 'refusee')}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2.5 text-xs font-semibold text-destructive transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97] disabled:opacity-50"
                  >
                    <XIcon className="size-3.5" />
                    Refuser
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Les fiches de l'équipe
        </h2>
        <div className="grid gap-3 lg:grid-cols-2">
          {donnees.employes.map((e) => (
            <Card key={e.utilisateur.id} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl font-display text-xs font-semibold',
                    e.statutPresence === 'present'
                      ? 'bg-success/15 text-success'
                      : e.statutPresence === 'pause'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {e.utilisateur.nom
                    .split(' ')
                    .map((m) => m[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {e.utilisateur.nom}
                    </span>
                    {e.statutPresence === 'present' && (
                      <Badge ton="succes">en poste</Badge>
                    )}
                    {e.statutPresence === 'pause' && (
                      <Badge ton="attention">en pause</Badge>
                    )}
                    {!e.utilisateur.actif && <Badge ton="alerte">désactivé</Badge>}
                  </div>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {e.utilisateur.email}
                  </span>
                </div>
              </div>

              {e.fiche === null ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                  Fiche non renseignée — laisse-lui un poste et un contact pour
                  commencer.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <UserRoundIcon className="size-3" /> Poste
                    </span>
                    <span className="text-right font-medium text-foreground">
                      {e.fiche.poste}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <ClipboardCheckIcon className="size-3" /> Ancienneté
                    </span>
                    <span className="text-right font-medium text-foreground">
                      {anciennete(e.fiche.dateEmbauche)}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <PhoneIcon className="size-3" /> Téléphone
                    </span>
                    <span className="text-right font-medium text-foreground">
                      {e.fiche.telephone ?? '—'}
                    </span>
                  </li>
                  <li className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlertIcon className="size-3" /> Contact d'urgence
                    </span>
                    <span className="text-right font-medium text-foreground">
                      {e.fiche.contactUrgence ?? '—'}
                    </span>
                  </li>
                </ul>
              )}

              <button
                type="button"
                onClick={() => setResetDe(e)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <KeyRoundIcon className="size-3.5" />
                Réinitialiser le mot de passe
              </button>
            </Card>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-sm font-semibold tracking-tight">
          Historique des traitements
        </h2>
        {donnees.absencesTraitees.length === 0 ? (
          <Card>
            <p className="py-2 text-sm leading-relaxed text-muted-foreground">
              Aucune absence traitée pour le moment.
            </p>
          </Card>
        ) : (
          <Card>
            <ul className="flex flex-col divide-y divide-border">
              {donnees.absencesTraitees.slice(0, 10).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">
                      {a.employeNom}
                      <span className="ml-2 text-muted-foreground tnum">
                        {dateLisible(a.date)}
                      </span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {LIBELLES_TYPE_ABSENCE[a.type]}
                      {a.motif && ` · « ${a.motif} »`}
                    </span>
                  </div>
                  <Badge ton={TON_STATUT[a.statut]}>
                    {LIBELLES_STATUT_ABSENCE[a.statut]}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Confirmation avant réinitialisation */}
      <Sheet
        ouvert={resetDe !== null}
        onFermer={() => setResetDe(null)}
        titre={`Réinitialiser le mot de passe de ${resetDe?.utilisateur.nom.split(' ')[0] ?? ''} ?`}
        sous="Un mot de passe temporaire sera généré. Il ne sera affiché qu'une seule fois, juste après."
        pied={
          <button
            type="button"
            onClick={reinitialiser}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
          >
            <KeyRoundIcon className="size-4" />
            Générer un mot de passe temporaire
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          L'ancien mot de passe de {resetDe?.utilisateur.nom ?? ''} sera
          remplacé immédiatement. Transmets-lui le nouveau en main propre —
          personne d'autre ne pourra le récupérer.
        </p>
      </Sheet>

      {/* Affichage UNIQUE du mot de passe généré */}
      <Sheet
        ouvert={motDePasseTemporaire !== null}
        onFermer={() => setMotDePasseTemporaire(null)}
        titre="Mot de passe temporaire"
        sous="À transmettre en main propre — il ne sera plus jamais affiché."
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 p-5">
            <EyeIcon className="size-5 text-primary" />
            <span className="font-mono text-xl font-semibold tracking-wider">
              {motDePasseTemporaire}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Note-le maintenant : dès la fermeture de cette fenêtre, il sera
            perdu à tout jamais — seule la personne pourra le changer depuis
            son espace « Mon compte ».
          </p>
          <button
            type="button"
            onClick={() => setMotDePasseTemporaire(null)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
          >
            <CheckIcon className="size-4" />
            C'est noté, fermer
          </button>
        </div>
      </Sheet>
    </div>
  )
}
