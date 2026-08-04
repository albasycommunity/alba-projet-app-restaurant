/**
 * Couche serveur RH (Phase 3) — côté serveur uniquement (jamais importé
 * du client).
 *
 * Les tables `fiches_rh`, `pointages` et `absences` vivent dans Supabase,
 * accédées via le MÊME client `service_role` que `lib/server/bdd.ts`
 * (aucun second client, jamais de client côté navigateur : toute
 * l'autorisation est faite en amont par les routes API, via
 * `exigerRole` — l'identité vient de la session, jamais du corps de la
 * requête).
 *
 * Règle RH sensible : tout ce qui touche la fiche d'un employé, la
 * justification des absences et la réinitialisation des mots de passe est
 * réservé au RESTAURANT_ADMIN — jamais accordé via `exigerPermission`,
 * même si l'employé possède la permission Équipe.
 *
 * Rétrocompatibilité : les comptes créés avant la migration n'ont pas de
 * fiche RH. Les lectures ne plantent jamais pour autant : `ficheRhDe`
 * renvoie `null` et l'appelant affiche un état « fiche non renseignée »
 * explicite (le backfill one-shot `scripts/backfill-fiches-rh.ts` crée
 * les fiches manquantes).
 *
 * Erreurs : jamais de détail Postgres vers le client — loggé côté
 * serveur (logger), message générique côté client, comme partout dans
 * `lib/server/bdd.ts`.
 */

import 'server-only'
import { nouveauId } from '@/lib/auth'
import type {
  AbsenceRh,
  EmployeRh,
  EquipeRhComplete,
  FicheRh,
  PointageRh,
  StatutAbsence,
  StatutPresence,
  TypeAbsence,
  TypePointage,
} from '@/lib/rh'
import { logger } from '@/lib/server/logger'
import { supabase } from '@/lib/server/supabase'

/** Message lisible d'une erreur Supabase (PostgrestError n'est pas une Error). */
function messageErreur(erreur: unknown): string {
  if (erreur instanceof Error) return erreur.message
  if (typeof erreur === 'object' && erreur !== null) {
    const e = erreur as { message?: unknown; details?: unknown; code?: unknown }
    const morceaux = [e.message, e.details, e.code]
      .filter((m) => typeof m === 'string' && m)
    if (morceaux.length > 0) return morceaux.join(' | ')
  }
  return String(erreur)
}

/** Erreur Supabase : loggée côté serveur, jamais renvoyée au client. */
function erreurRh(operation: string, erreur: unknown): never {
  logger('rh', 'erreur', 'Erreur Supabase', {
    operation,
    detail: messageErreur(erreur),
  })
  throw new Error('Erreur interne de la base de données.')
}

/** Timestamptz → ISO normalisé (format Z), stable pour les comparaisons. */
function iso(valeur: string | null | undefined): string | undefined {
  if (valeur === null || valeur === undefined) return undefined
  return new Date(valeur).toISOString()
}

function ficheDepuisLigne(l: Record<string, unknown>): FicheRh {
  return {
    utilisateurId: String(l.utilisateur_id),
    poste: String(l.poste),
    dateEmbauche: String(l.date_embauche).slice(0, 10),
    telephone: l.telephone !== null && l.telephone !== undefined ? String(l.telephone) : null,
    contactUrgence:
      l.contact_urgence !== null && l.contact_urgence !== undefined
        ? String(l.contact_urgence)
        : null,
    notes: l.notes !== null && l.notes !== undefined ? String(l.notes) : null,
    creeLe: iso(String(l.cree_le))!,
  }
}

function pointageDepuisLigne(l: Record<string, unknown>): PointageRh {
  return {
    id: String(l.id),
    utilisateurId: String(l.utilisateur_id),
    restaurantId: String(l.restaurant_id),
    type: l.type as TypePointage,
    horodatage: iso(String(l.horodatage))!,
  }
}

function absenceDepuisLigne(l: Record<string, unknown>): AbsenceRh {
  return {
    id: String(l.id),
    utilisateurId: String(l.utilisateur_id),
    restaurantId: String(l.restaurant_id),
    date: String(l.date).slice(0, 10),
    type: l.type as TypeAbsence,
    statut: l.statut as StatutAbsence,
    motif: l.motif !== null && l.motif !== undefined ? String(l.motif) : null,
    justificatifUrl:
      l.justificatif_url !== null && l.justificatif_url !== undefined
        ? String(l.justificatif_url)
        : null,
    declareePar: String(l.declaree_par),
    traiteePar:
      l.traitee_par !== null && l.traitee_par !== undefined
        ? String(l.traitee_par)
        : null,
    creeLe: iso(String(l.cree_le))!,
    traiteeLe:
      l.traitee_le !== null && l.traitee_le !== undefined
        ? iso(String(l.traitee_le)) ?? null
        : null,
  }
}

/* ------------------------------- fiches RH ------------------------------- */

/** Crée (ou réécrit) la fiche RH d'un utilisateur. Idempotent par utilisateur. */
export async function creerFicheRh(input: {
  utilisateurId: string
  poste: string
  dateEmbauche?: string
  telephone?: string
  contactUrgence?: string
  notes?: string
}): Promise<FicheRh> {
  const ligne = {
    utilisateur_id: input.utilisateurId,
    poste: input.poste.trim(),
    date_embauche: input.dateEmbauche ?? new Date().toISOString().slice(0, 10),
    telephone: input.telephone?.trim() || null,
    contact_urgence: input.contactUrgence?.trim() || null,
    notes: input.notes?.trim() || null,
  }
  const { data, error } = await supabase
    .from('fiches_rh')
    .upsert(ligne, { onConflict: 'utilisateur_id' })
    .select('*')
    .single()
  if (error || !data) erreurRh('écriture fiche_rh', error)
  return ficheDepuisLigne(data as Record<string, unknown>)
}

/** Fiche RH d'un utilisateur, ou `null` si elle n'existe pas encore. */
export async function ficheRhDe(utilisateurId: string): Promise<FicheRh | null> {
  const { data, error } = await supabase
    .from('fiches_rh')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .maybeSingle()
  if (error) erreurRh('lecture fiche_rh', error)
  return data ? ficheDepuisLigne(data as Record<string, unknown>) : null
}

/** Met à jour les champs fournis d'une fiche RH (un champ absent reste tel quel). */
export async function modifierFicheRh(
  utilisateurId: string,
  patch: {
    poste?: string
    dateEmbauche?: string
    telephone?: string | null
    contactUrgence?: string | null
    notes?: string | null
  },
): Promise<FicheRh | null> {
  const ligne: Record<string, unknown> = {}
  if (patch.poste !== undefined) ligne.poste = patch.poste.trim()
  if (patch.dateEmbauche !== undefined) ligne.date_embauche = patch.dateEmbauche
  if (patch.telephone !== undefined) ligne.telephone = patch.telephone?.trim() || null
  if (patch.contactUrgence !== undefined)
    ligne.contact_urgence = patch.contactUrgence?.trim() || null
  if (patch.notes !== undefined) ligne.notes = patch.notes?.trim() || null

  if (Object.keys(ligne).length === 0) return ficheRhDe(utilisateurId)

  const { data, error } = await supabase
    .from('fiches_rh')
    .update(ligne)
    .eq('utilisateur_id', utilisateurId)
    .select('*')
    .maybeSingle()
  if (error) erreurRh('modification fiche_rh', error)
  return data ? ficheDepuisLigne(data as Record<string, unknown>) : null
}

/* -------------------------------- pointages -------------------------------- */

/** Persiste un scan (arrivée, pause, reprise, départ) — chaque geste devient une ligne. */
export async function enregistrerPointage(input: {
  utilisateurId: string
  restaurantId: string
  type: TypePointage
}): Promise<PointageRh> {
  const ligne = {
    id: nouveauId('pt'),
    utilisateur_id: input.utilisateurId,
    restaurant_id: input.restaurantId,
    type: input.type,
    horodatage: new Date().toISOString(),
  }
  const { data, error } = await supabase
    .from('pointages')
    .insert(ligne)
    .select('*')
    .single()
  if (error || !data) erreurRh('écriture pointage', error)
  return pointageDepuisLigne(data as Record<string, unknown>)
}

/** Dernier pointage du jour d'un utilisateur — sert à dériver présent/pause/absent. */
export async function dernierPointageDuJour(
  utilisateurId: string,
): Promise<PointageRh | null> {
  const maintenant = new Date()
  const debutJour = new Date(
    maintenant.getTime() - maintenant.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 10)
  const { data, error } = await supabase
    .from('pointages')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .gte('horodatage', debutJour)
    .order('horodatage', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) erreurRh('lecture dernier pointage', error)
  return data ? pointageDepuisLigne(data as Record<string, unknown>) : null
}

/** Derniers pointages d'un utilisateur (ordre antichronologique). */
export async function pointagesRecents(
  utilisateurId: string,
  limite = 30,
): Promise<PointageRh[]> {
  const { data, error } = await supabase
    .from('pointages')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .order('horodatage', { ascending: false })
    .limit(limite)
  if (error) erreurRh('lecture pointages récents', error)
  return (data ?? []).map((l) => pointageDepuisLigne(l as Record<string, unknown>))
}

/* -------------------------------- absences -------------------------------- */

/** Déclare une absence pour un employé (toujours pour lui-même, depuis la session). */
export async function declarerAbsence(input: {
  utilisateurId: string
  restaurantId: string
  declareePar: string
  date: string
  type: TypeAbsence
  motif?: string
}): Promise<AbsenceRh> {
  const ligne = {
    id: nouveauId('ab'),
    utilisateur_id: input.utilisateurId,
    restaurant_id: input.restaurantId,
    date: input.date,
    type: input.type,
    statut: 'declaree' as const,
    motif: input.motif?.trim() || null,
    declaree_par: input.declareePar,
  }
  const { data, error } = await supabase
    .from('absences')
    .insert(ligne)
    .select('*')
    .single()
  if (error || !data) erreurRh('écriture absence', error)
  return absenceDepuisLigne(data as Record<string, unknown>)
}

/** Absences d'un utilisateur (ordre antichronologique). */
export async function absencesDe(utilisateurId: string): Promise<AbsenceRh[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('utilisateur_id', utilisateurId)
    .order('date', { ascending: false })
    .order('cree_le', { ascending: false })
  if (error) erreurRh('lecture absences', error)
  return (data ?? []).map((l) => absenceDepuisLigne(l as Record<string, unknown>))
}

/** Absences encore à traiter d'un restaurant — la file d'attente de la cheffe. */
export async function absencesEnAttente(
  restaurantId: string,
): Promise<AbsenceRh[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('statut', 'declaree')
    .order('date', { ascending: true })
    .order('cree_le', { ascending: true })
  if (error) erreurRh('lecture absences en attente', error)
  return (data ?? []).map((l) => absenceDepuisLigne(l as Record<string, unknown>))
}

/**
 * Traite une absence (justifiee / refusee). Vérifie d'abord que l'absence
 * appartient bien au restaurant demandeur — jamais de modification d'une
 * absence d'un autre restaurant, même si l'ID est deviné.
 */
export async function traiterAbsence(input: {
  id: string
  restaurantId: string
  statut: StatutAbsence
  traiteePar: string
}): Promise<AbsenceRh | null> {
  const { data: existante, error: erreurLecture } = await supabase
    .from('absences')
    .select('*')
    .eq('id', input.id)
    .maybeSingle()
  if (erreurLecture) erreurRh('lecture absence à traiter', erreurLecture)
  if (!existante) return null
  if (String(existante.restaurant_id) !== input.restaurantId) return null

  const { data, error } = await supabase
    .from('absences')
    .update({
      statut: input.statut,
      traitee_par: input.traiteePar,
      traitee_le: new Date().toISOString(),
    })
    .eq('id', input.id)
    .select('*')
    .single()
  if (error || !data) erreurRh('traitement absence', error)
  return absenceDepuisLigne(data as Record<string, unknown>)
}

/** Toutes les absences (traitées et en attente) d'un restaurant. */
async function absencesDuRestaurant(restaurantId: string): Promise<AbsenceRh[]> {
  const { data, error } = await supabase
    .from('absences')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('cree_le', { ascending: false })
  if (error) erreurRh('lecture absences du restaurant', error)
  return (data ?? []).map((l) => absenceDepuisLigne(l as Record<string, unknown>))
}

/* --------------------------- vue agrégée de la cheffe --------------------------- */

/**
 * Vue RH agrégée d'un restaurant : fiches RH + statut de présence dérivé
 * du dernier pointage du jour + absences (en attente et traitées), le
 * tout STRICTEMENT limité au `restaurantId` passé — jamais l'équipe d'un
 * autre restaurant (l'appelant le dérive de la session de la gérante).
 */
export async function equipeRhComplete(
  restaurantId: string,
): Promise<EquipeRhComplete> {
  const { data: utilisateurs, error: erreurUtilisateurs } = await supabase
    .from('utilisateurs')
    .select('id, nom, email, actif, role, restaurant_id')
    .eq('restaurant_id', restaurantId)
    .order('nom')
  if (erreurUtilisateurs) erreurRh('lecture utilisateurs (équipe RH)', erreurUtilisateurs)

  const employes = (utilisateurs ?? [])
    .filter((l) => l.role === 'STAFF' || l.role === 'RESTAURANT_ADMIN')
    .map((l) => ({
      id: String(l.id),
      nom: String(l.nom),
      email: String(l.email),
      actif: Boolean(l.actif),
    }))
  const ids = employes.map((e) => e.id)

  const vide = { data: null, error: null } as const

  const [fiches, pointages, absences] = await Promise.all([
    ids.length === 0
      ? Promise.resolve(vide)
      : supabase.from('fiches_rh').select('*').in('utilisateur_id', ids),
    ids.length === 0
      ? Promise.resolve(vide)
      : supabase
          .from('pointages')
          .select('*')
          .in('utilisateur_id', ids)
          .gte('horodatage', debutJourIso())
          .order('horodatage', { ascending: false }),
    absencesDuRestaurant(restaurantId),
  ])
  if (fiches.error) erreurRh('lecture fiches (équipe RH)', fiches.error)
  if (pointages.error) erreurRh('lecture pointages (équipe RH)', pointages.error)

  const ficheParUtilisateur = new Map<string, FicheRh>()
  for (const ligne of fiches.data ?? []) {
    const fiche = ficheDepuisLigne(ligne as Record<string, unknown>)
    ficheParUtilisateur.set(fiche.utilisateurId, fiche)
  }

  const dernierParUtilisateur = new Map<string, PointageRh>()
  for (const ligne of pointages.data ?? []) {
    const pointage = pointageDepuisLigne(ligne as Record<string, unknown>)
    if (!dernierParUtilisateur.has(pointage.utilisateurId)) {
      dernierParUtilisateur.set(pointage.utilisateurId, pointage)
    }
  }

  const statutDe = (pointage: PointageRh | undefined): StatutPresence => {
    if (!pointage) return 'absent'
    if (pointage.type === 'pause') return 'pause'
    if (pointage.type === 'depart') return 'absent'
    return 'present'
  }

  const nomDe = (id: string) =>
    employes.find((e) => e.id === id)?.nom ?? 'Membre'
  const absencesAvecNoms = absences.map((a) => ({
    ...a,
    employeNom: nomDe(a.utilisateurId),
    declareeParNom: nomDe(a.declareePar),
  }))

  return {
    employes: employes.map((e) => {
      const dernier = dernierParUtilisateur.get(e.id)
      return {
        utilisateur: e,
        fiche: ficheParUtilisateur.get(e.id) ?? null,
        statutPresence: statutDe(dernier),
        dernierPointage: dernier ?? null,
      }
    }),
    absencesEnAttente: absencesAvecNoms.filter((a) => a.statut === 'declaree'),
    absencesTraitees: absencesAvecNoms.filter((a) => a.statut !== 'declaree'),
  }
}

/** Début de journée (fuseau serveur) au format ISO — pour le pointage du jour. */
function debutJourIso() {
  const maintenant = new Date()
  return new Date(
    maintenant.getTime() - maintenant.getTimezoneOffset() * 60_000,
  )
    .toISOString()
    .slice(0, 10)
}
