/**
 * Modèle de données RH (Phase 3) — types partagés entre le serveur
 * (`lib/server/rh.ts`) et le client (Mon compte, onglet RH de l'Équipe).
 *
 * Les tables `fiches_rh`, `pointages` et `absences` sont écrites
 * EXCLUSIVEMENT via la couche serveur : jamais de client Supabase dans
 * le navigateur, jamais de `restaurantId`/`utilisateurId` accepté du
 * client pour une action sensible — l'identité vient de la session.
 */

export const TYPES_POINTAGE = ['arrivee', 'pause', 'reprise', 'depart'] as const
export type TypePointage = (typeof TYPES_POINTAGE)[number]

export const LIBELLES_TYPE_POINTAGE: Record<TypePointage, string> = {
  arrivee: 'Arrivée',
  pause: 'Départ en pause',
  reprise: 'Retour de pause',
  depart: 'Fin de service',
}

export function typePointageValide(valeur: unknown): valeur is TypePointage {
  return (
    typeof valeur === 'string' &&
    (TYPES_POINTAGE as readonly string[]).includes(valeur)
  )
}

export const TYPES_ABSENCE = ['absence', 'retard', 'conge'] as const
export type TypeAbsence = (typeof TYPES_ABSENCE)[number]

export const LIBELLES_TYPE_ABSENCE: Record<TypeAbsence, string> = {
  absence: 'Absence',
  retard: 'Retard',
  conge: 'Congé',
}

export function typeAbsenceValide(valeur: unknown): valeur is TypeAbsence {
  return (
    typeof valeur === 'string' &&
    (TYPES_ABSENCE as readonly string[]).includes(valeur)
  )
}

export const STATUTS_ABSENCE = ['declaree', 'justifiee', 'refusee'] as const
export type StatutAbsence = (typeof STATUTS_ABSENCE)[number]

export const LIBELLES_STATUT_ABSENCE: Record<StatutAbsence, string> = {
  declaree: 'Déclarée',
  justifiee: 'Justifiée',
  refusee: 'Refusée',
}

export function statutAbsenceValide(valeur: unknown): valeur is StatutAbsence {
  return (
    typeof valeur === 'string' &&
    (STATUTS_ABSENCE as readonly string[]).includes(valeur)
  )
}

/** Une fiche RH : les infos d'emploi, séparées des données d'authentification. */
export type FicheRh = {
  utilisateurId: string
  poste: string
  dateEmbauche: string
  telephone: string | null
  contactUrgence: string | null
  notes: string | null
  creeLe: string
}

/** Un mouvement de pointage persisté (chaque scan devient une ligne). */
export type PointageRh = {
  id: string
  utilisateurId: string
  restaurantId: string
  type: TypePointage
  horodatage: string
}

/** Une absence déclarée par l'employé, suivie jusqu'à sa justification. */
export type AbsenceRh = {
  id: string
  utilisateurId: string
  restaurantId: string
  date: string
  type: TypeAbsence
  statut: StatutAbsence
  motif: string | null
  justificatifUrl: string | null
  declareePar: string
  traiteePar: string | null
  creeLe: string
  traiteeLe: string | null
}

/** Statut de présence dérivé du dernier pointage du jour. */
export type StatutPresence = 'present' | 'pause' | 'absent'

/** Format attendu pour la date d'une absence : AAAA-MM-JJ. */
export function dateValide(valeur: unknown): valeur is string {
  if (typeof valeur !== 'string') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valeur)) return false
  const date = new Date(`${valeur}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === valeur
}

/** Date du jour au format AAAA-MM-JJ (fuseau du serveur, comme la BDD). */
export function aujourdhuiIso() {
  const maintenant = new Date()
  const local = new Date(
    maintenant.getTime() - maintenant.getTimezoneOffset() * 60_000,
  )
  return local.toISOString().slice(0, 10)
}

/** Un membre de l'équipe dans la vue RH de la gérante. */
export type EmployeRh = {
  utilisateur: {
    id: string
    nom: string
    email: string
    actif: boolean
  }
  /** `null` = fiche non renseignée (compte créé avant la migration). */
  fiche: FicheRh | null
  statutPresence: StatutPresence
  dernierPointage: PointageRh | null
}

/** Vue RH agrégée d'un restaurant (employés + absences). */
export type EquipeRhComplete = {
  employes: EmployeRh[]
  absencesEnAttente: (AbsenceRh & { employeNom: string; declareeParNom: string })[]
  absencesTraitees: (AbsenceRh & { employeNom: string; declareeParNom: string })[]
}
