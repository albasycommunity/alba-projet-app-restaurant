'use client'

import { useEffect, useState, type ReactNode } from 'react'
import {
  CalendarDaysIcon,
  CheckIcon,
  ClipboardCheckIcon,
  Clock3Icon,
  CoffeeIcon,
  KeyRoundIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  PhoneIcon,
  PlayIcon,
  ShieldAlertIcon,
  UserRoundIcon,
} from 'lucide-react'
import {
  LIBELLES_STATUT_ABSENCE,
  LIBELLES_TYPE_ABSENCE,
  LIBELLES_TYPE_POINTAGE,
  TYPES_ABSENCE,
  type AbsenceRh,
  type FicheRh,
  type PointageRh,
  type TypeAbsence,
  type TypePointage,
} from '@/lib/rh'
import { useAuth } from '@/lib/auth-contexte'
import { vibrer } from '@/lib/store'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  EmptyState,
  PageHeader,
  Segments,
  StatTile,
} from '@/components/kit'
import { cn } from '@/lib/utils'

const CHAMP =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'
const CHAMP_TEXTE =
  'w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-3 focus:ring-primary/15'

function dateLisible(iso: string) {
  const [annee, mois, jour] = iso.slice(0, 10).split('-').map(Number)
  const d = new Date(annee, mois - 1, jour)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function heureLisible(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Ancienneté lisible depuis la date d'embauche — la fiche en quelques mots. */
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
  return 'moins d\u2019un mois'
}

function aujourdhuiLocal() {
  const maintenant = new Date()
  const local = new Date(
    maintenant.getTime() - maintenant.getTimezoneOffset() * 60_000,
  )
  return local.toISOString().slice(0, 10)
}

const TON_STATUT: Record<AbsenceRh['statut'], 'attention' | 'succes' | 'alerte'> = {
  declaree: 'attention',
  justifiee: 'succes',
  refusee: 'alerte',
}

/**
 * Prochain geste de pointage selon le dernier pointage du jour :
 * rien → Arrivée, arrivée → Pause, pause → Reprise, reprise → Départ,
 * départ → plus rien, la journée est terminée.
 */
function prochainPointage(
  dernier: PointageRh | null,
): { type: TypePointage; libelle: string } | null {
  if (dernier === null) return { type: 'arrivee', libelle: 'Arrivée' }
  if (dernier.type === 'arrivee') return { type: 'pause', libelle: 'Pause' }
  if (dernier.type === 'pause') return { type: 'reprise', libelle: 'Reprise' }
  if (dernier.type === 'reprise') return { type: 'depart', libelle: 'Départ' }
  return null
}

const ICONE_POINTAGE: Record<TypePointage, ReactNode> = {
  arrivee: <LogInIcon className="size-4" />,
  pause: <CoffeeIcon className="size-4" />,
  reprise: <PlayIcon className="size-4" />,
  depart: <LogOutIcon className="size-4" />,
}

/** Statut de présence du jour, dérivé du dernier pointage. */
function statutPresence(dernier: PointageRh | null): {
  valeur: string
  ton: 'neutre' | 'primaire' | 'succes' | 'alerte'
  detail: string
} {
  if (dernier === null) {
    return {
      valeur: 'Pas encore arrivé',
      ton: 'neutre',
      detail: 'Ton premier pointage ouvre ta journée.',
    }
  }
  if (dernier.type === 'arrivee') {
    return {
      valeur: 'Arrivée',
      ton: 'succes',
      detail: `En poste depuis ${heureLisible(dernier.horodatage)}.`,
    }
  }
  if (dernier.type === 'pause') {
    return {
      valeur: 'En pause',
      ton: 'primaire',
      detail: `Depuis ${heureLisible(dernier.horodatage)} — le service t'attend.`,
    }
  }
  if (dernier.type === 'reprise') {
    return {
      valeur: 'Repartie',
      ton: 'succes',
      detail: `De retour depuis ${heureLisible(dernier.horodatage)}.`,
    }
  }
  return {
    valeur: 'Terminé',
    ton: 'neutre',
    detail: `Journée fermée à ${heureLisible(dernier.horodatage)}. À demain.`,
  }
}

/**
 * Mon compte — l'espace personnel de chaque membre de l'équipe.
 * Fiche RH (lecture seule : c'est la gérante qui la tient à jour),
 * pointages, déclaration d'absence, historique et changement de mot de
 * passe. Accessible sans aucune permission métier.
 */
export function MonCompteClient() {
  const { utilisateur } = useAuth()
  const [fiche, setFiche] = useState<FicheRh | null>(null)
  const [pointages, setPointages] = useState<PointageRh[] | null>(null)
  const [absences, setAbsences] = useState<AbsenceRh[] | null>(null)
  const [dernierPointage, setDernierPointage] = useState<PointageRh | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  const charger = async () => {
    try {
      const reponse = await fetch('/api/rh/mon-compte', { cache: 'no-store' })
      if (!reponse.ok) {
        setErreur('Impossible de charger ton espace personnel.')
        return
      }
      const donnees = await reponse.json()
      setFiche(donnees.fiche)
      setPointages(donnees.pointages)
      setAbsences(donnees.absences)
      setDernierPointage(donnees.dernierPointage ?? null)
      setErreur(null)
    } catch {
      setErreur('Le serveur ne répond pas.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => {
    charger()
  }, [])

  // Pointage réussi : la séquence avance immédiatement, sans recharger
  // toute la page — l'état vient du serveur (le pointage persisté), jamais
  // d'un optimisme aveugle.
  const apresPointage = (pointage: PointageRh) => {
    setPointages((avant) => [pointage, ...(avant ?? [])])
    setDernierPointage(pointage)
    setErreur(null)
  }

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader
        titre="Mon compte"
        sous={`Ton espace personnel, ${utilisateur?.nom?.split(' ')[0] ?? 'camarade'}. Pointages, absences et mot de passe — sans passer par la gérante.`}
      />

      {erreur && (
        <Contenu>
          <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        </Contenu>
      )}

      <BandeauJournee
        dernierPointage={dernierPointage}
        absences={absences}
        fiche={fiche}
        chargement={chargement}
      />

      <Contenu className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <MesPointages
            pointages={pointages}
            dernierPointage={dernierPointage}
            chargement={chargement}
            onPointage={apresPointage}
            onErreur={setErreur}
          />
          <FichePersonnelle fiche={fiche} chargement={chargement} />
        </div>
        <div className="flex flex-col gap-4">
          <DeclarerAbsence
            absences={absences}
            onDeclaree={() => {
              setAbsences(null)
              charger()
            }}
            onErreur={setErreur}
          />
          <ChangerMotDePasse onErreur={setErreur} />
        </div>
      </Contenu>

      <Contenu>
        <HistoriqueAbsences absences={absences} chargement={chargement} />
      </Contenu>
    </div>
  )
}

/* ---------------------------- Bandeau du jour ---------------------------- */

/** Trois chiffres clés en un coup d'œil : présence, absences, ancienneté. */
function BandeauJournee({
  dernierPointage,
  absences,
  fiche,
  chargement,
}: {
  dernierPointage: PointageRh | null
  absences: AbsenceRh[] | null
  fiche: FicheRh | null
  chargement: boolean
}) {
  const presence = statutPresence(dernierPointage)
  const enAttente = absences?.filter((a) => a.statut === 'declaree').length

  return (
    <Contenu className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile
        libelle="Présence"
        icone={<Clock3Icon className="size-3.5" />}
        valeur={chargement ? '…' : presence.valeur}
        detail={chargement ? 'Chargement…' : presence.detail}
        ton={presence.ton}
      />
      <StatTile
        libelle="Absences en attente"
        icone={<ClipboardCheckIcon className="size-3.5" />}
        valeur={chargement || absences === null ? '…' : String(enAttente ?? 0)}
        detail={
          chargement || absences === null
            ? 'Chargement…'
            : (enAttente ?? 0) > 0
              ? 'En attente de ta gérante.'
              : 'Tout est traité.'
        }
        ton={
          !chargement && absences !== null && (enAttente ?? 0) > 0
            ? 'alerte'
            : 'neutre'
        }
      />
      <StatTile
        libelle="Ancienneté"
        icone={<CalendarDaysIcon className="size-3.5" />}
        valeur={
          chargement
            ? '…'
            : fiche === null
              ? '—'
              : anciennete(fiche.dateEmbauche)
        }
        detail={
          chargement
            ? 'Chargement…'
            : fiche === null
              ? "Ta fiche n'est pas encore renseignée."
              : `Depuis le ${dateLisible(fiche.dateEmbauche)}.`
        }
      />
    </Contenu>
  )
}

/* --------------------------- Fiche personnelle --------------------------- */

function FichePersonnelle({
  fiche,
  chargement,
}: {
  fiche: FicheRh | null
  chargement: boolean
}) {
  return (
    <Card>
      <CardTitle
        aside={
          <UserRoundIcon className="size-4 text-muted-foreground" />
        }
      >
        Ma fiche
      </CardTitle>
      {chargement ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin text-primary" />
          Chargement…
        </p>
      ) : fiche === null ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ta fiche n'est pas encore renseignée — ta gérante la complète
            depuis l'onglet RH.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Tes pointages et tes absences restent enregistrés, pas d'inquiétude.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          <LigneFiche
            icone={<UserRoundIcon className="size-3.5" />}
            libelle="Poste"
            valeur={fiche.poste}
          />
          <LigneFiche
            icone={<CalendarDaysIcon className="size-3.5" />}
            libelle="Arrivée dans l'équipe"
            valeur={dateLisible(fiche.dateEmbauche)}
          />
          <LigneFiche
            icone={<PhoneIcon className="size-3.5" />}
            libelle="Téléphone"
            valeur={fiche.telephone ?? 'Non renseigné'}
          />
          <LigneFiche
            icone={<ShieldAlertIcon className="size-3.5" />}
            libelle="Contact d'urgence"
            valeur={fiche.contactUrgence ?? 'Non renseigné'}
          />
        </ul>
      )}
    </Card>
  )
}

function LigneFiche({
  icone,
  libelle,
  valeur,
}: {
  icone: ReactNode
  libelle: string
  valeur: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
        {icone}
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] text-muted-foreground">{libelle}</span>
        <span className="truncate text-sm font-medium">{valeur}</span>
      </div>
    </li>
  )
}

/* ---------------------------- Mes pointages ---------------------------- */

/**
 * La journée en une carte : le prochain geste de pointage en évidence,
 * puis les scans du jour. Si la requête échoue, rien n'avance : le bouton
 * reste au même état et l'erreur s'affiche, sans jamais bloquer la page.
 */
function MesPointages({
  pointages,
  dernierPointage,
  chargement,
  onPointage,
  onErreur,
}: {
  pointages: PointageRh[] | null
  dernierPointage: PointageRh | null
  chargement: boolean
  onPointage: (p: PointageRh) => void
  onErreur: (message: string) => void
}) {
  const [envoi, setEnvoi] = useState(false)
  const prochain = prochainPointage(dernierPointage)

  const pointer = async () => {
    if (!prochain) return
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/rh/pointer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: prochain.type }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        onErreur(donnees.erreur ?? 'Pointage impossible.')
        return
      }
      vibrer(14)
      onPointage(donnees.pointage)
    } catch {
      onErreur('Le serveur ne répond pas. Ta journée reste comme elle est — réessaie.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card>
      <CardTitle
        aside={
          <span className="text-[11px] text-muted-foreground">
            derniers scans
          </span>
        }
      >
        Mes pointages
      </CardTitle>
      {chargement ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin text-primary" />
          Chargement…
        </p>
      ) : !pointages || pointages.length === 0 ? (
        <EmptyState
          titre="Journée encore vierge"
          texte="Ton premier geste — pointer ton arrivée — ouvre la journée. Le reste suit tout seul."
          action={
            prochain && (
              <BoutonPointage
                prochain={prochain}
                envoi={envoi}
                onClick={pointer}
              />
            )
          }
        />
      ) : (
        <>
          {prochain ? (
            <BoutonPointage
              prochain={prochain}
              envoi={envoi}
              onClick={pointer}
              className="mb-3 w-full"
            />
          ) : (
            <p className="mb-3 flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2.5 text-xs font-medium text-success">
              <CheckIcon className="size-3.5" />
              Terminé pour aujourd'hui. Bonne soirée.
            </p>
          )}
          <ul className="flex flex-col divide-y divide-border">
            {pointages.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <Clock3Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="font-display text-xs font-semibold text-muted-foreground tnum">
                  {heureLisible(p.horodatage)}
                </span>
                <span className="ml-auto">
                  <Badge
                    ton={
                      p.type === 'arrivee' || p.type === 'reprise'
                        ? 'succes'
                        : p.type === 'pause'
                          ? 'attention'
                          : 'neutre'
                    }
                  >
                    {LIBELLES_TYPE_POINTAGE[p.type]}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  )
}

/** Le geste du moment : grand, au pouce, avec le libellé exact de l'étape. */
function BoutonPointage({
  prochain,
  envoi,
  onClick,
  className,
}: {
  prochain: { type: TypePointage; libelle: string }
  envoi: boolean
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={envoi}
      className={cn(
        'flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50',
        className,
      )}
    >
      {envoi ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        ICONE_POINTAGE[prochain.type]
      )}
      {envoi ? 'Enregistrement…' : prochain.libelle}
    </button>
  )
}

/* ---------------------------- Déclarer une absence ---------------------------- */

function DeclarerAbsence({
  absences,
  onDeclaree,
  onErreur,
}: {
  absences: AbsenceRh[] | null
  onDeclaree: () => void
  onErreur: (message: string) => void
}) {
  const [date, setDate] = useState(aujourdhuiLocal())
  const [type, setType] = useState<TypeAbsence>('absence')
  const [motif, setMotif] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const declarer = async () => {
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/rh/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, motif: motif.trim() || undefined }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        onErreur(donnees.erreur ?? 'Déclaration impossible.')
        return
      }
      setMotif('')
      onDeclaree()
    } catch {
      onErreur('Le serveur ne répond pas.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card>
      <CardTitle
        aside={
          <span className="text-[11px] text-muted-foreground">
            {absences !== null &&
              `${absences.filter((a) => a.statut === 'declaree').length} en attente`}
          </span>
        }
      >
        Déclarer une absence
      </CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          declarer()
        }}
        className="flex flex-col gap-3"
      >
        <Segments
          valeur={type}
          onChange={setType}
          options={TYPES_ABSENCE.map((t) => ({
            valeur: t,
            libelle: LIBELLES_TYPE_ABSENCE[t],
          }))}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={CHAMP}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Motif (facultatif)
          </span>
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Un mot pour ta gérante…"
            className={CHAMP_TEXTE}
          />
        </label>
        <button
          type="submit"
          disabled={envoi}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
        >
          {envoi ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <>
              <CalendarDaysIcon className="size-4" />
              Déclarer
            </>
          )}
        </button>
      </form>
    </Card>
  )
}

/* ------------------------------- Mes absences ------------------------------- */

function HistoriqueAbsences({
  absences,
  chargement,
}: {
  absences: AbsenceRh[] | null
  chargement: boolean
}) {
  return (
    <Card>
      <CardTitle aside={<span className="text-[11px] text-muted-foreground">mes demandes</span>}>
        Historique de mes absences
      </CardTitle>
      {chargement ? (
        <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
          <LoaderIcon className="size-4 animate-spin text-primary" />
          Chargement…
        </p>
      ) : !absences || absences.length === 0 ? (
        <EmptyState
          titre="Aucune absence déclarée"
          texte="Quand tu poses un congé, signales un retard ou restes chez toi un jour, ça s'affiche ici avec son statut."
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {absences.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="text-sm font-medium">
                  {LIBELLES_TYPE_ABSENCE[a.type]}
                  <span className="ml-2 text-muted-foreground tnum">
                    {dateLisible(a.date)}
                  </span>
                </span>
                {a.motif && (
                  <span className="truncate text-[11px] text-muted-foreground">
                    {a.motif}
                  </span>
                )}
              </div>
              <Badge ton={TON_STATUT[a.statut]}>
                {LIBELLES_STATUT_ABSENCE[a.statut]}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

/* -------------------------- Changer le mot de passe -------------------------- */

function ChangerMotDePasse({
  onErreur,
}: {
  onErreur: (message: string) => void
}) {
  const [actuel, setActuel] = useState('')
  const [nouveau, setNouveau] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [fait, setFait] = useState(false)

  const changer = async () => {
    setEnvoi(true)
    setFait(false)
    try {
      const reponse = await fetch('/api/rh/mon-compte/changer-mot-de-passe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motDePasseActuel: actuel,
          nouveauMotDePasse: nouveau,
        }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        onErreur(donnees.erreur ?? 'Changement impossible.')
        return
      }
      setActuel('')
      setNouveau('')
      setFait(true)
    } catch {
      onErreur('Le serveur ne répond pas.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Card>
      <CardTitle
        aside={<KeyRoundIcon className="size-4 text-muted-foreground" />}
      >
        Changer mon mot de passe
      </CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          changer()
        }}
        className="flex flex-col gap-3"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Mot de passe actuel
          </span>
          <input
            type="password"
            value={actuel}
            onChange={(e) => setActuel(e.target.value)}
            className={CHAMP}
            autoComplete="current-password"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Nouveau mot de passe
          </span>
          <input
            type="password"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            minLength={8}
            className={CHAMP}
            autoComplete="new-password"
            placeholder="8 caractères minimum"
          />
        </label>
        <button
          type="submit"
          disabled={envoi || actuel.length === 0 || nouveau.length < 8}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-50"
        >
          {envoi ? (
            <LoaderIcon className="size-4 animate-spin" />
          ) : (
            <>
              <KeyRoundIcon className="size-4" />
              Mettre à jour
            </>
          )}
        </button>
        {fait && (
          <p
            className={cn(
              'flex items-center gap-1.5 rounded-lg border border-success/25 bg-success/10 px-3 py-2 text-xs text-success',
            )}
          >
            <CheckIcon className="size-3.5" />
            Mot de passe mis à jour. Il est actif dès maintenant.
          </p>
        )}
      </form>
    </Card>
  )
}
