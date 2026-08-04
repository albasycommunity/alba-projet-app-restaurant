import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { dateValide } from '@/lib/rh'
import { exigerRole } from '@/lib/server/auth'
import { modifierFicheRh } from '@/lib/server/rh'
import { trouverUtilisateur } from '@/lib/server/bdd'
import { logger } from '@/lib/server/logger'

const LONGUEUR_MAX = { poste: 80, telephone: 40, contactUrgence: 120, notes: 1000 }

/**
 * Modification de la fiche RH d'un employé (poste, téléphone, contact
 * d'urgence, notes) — réservée au RESTAURANT_ADMIN. L'employé ne modifie
 * jamais sa propre fiche : c'est la gérante qui la tient à jour. Chaque
 * champ est validé manuellement (type, longueur) avant écriture.
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const { id } = await context.params
  const cible = await trouverUtilisateur(id)
  if (!cible || cible.role !== Role.STAFF) {
    return NextResponse.json({ erreur: 'Membre introuvable.' }, { status: 404 })
  }
  // Anti-IDOR : on ne touche jamais à la fiche d'un employé d'un autre restaurant.
  if (cible.restaurantId !== restaurantId) {
    return NextResponse.json(
      { erreur: 'Ce membre ne fait pas partie de ton restaurant.' },
      { status: 403 },
    )
  }

  const corps = await req.json().catch(() => null)
  const patch: {
    poste?: string
    dateEmbauche?: string
    telephone?: string | null
    contactUrgence?: string | null
    notes?: string | null
  } = {}

  if (corps?.poste !== undefined) {
    const poste = typeof corps.poste === 'string' ? corps.poste.trim() : ''
    if (poste.length < 2 || poste.length > LONGUEUR_MAX.poste) {
      return NextResponse.json(
        { erreur: 'Le poste doit faire entre 2 et 80 caractères.' },
        { status: 400 },
      )
    }
    patch.poste = poste
  }

  if (corps?.dateEmbauche !== undefined) {
    if (!dateValide(corps.dateEmbauche)) {
      return NextResponse.json(
        { erreur: 'Date d’embauche invalide (format : AAAA-MM-JJ).' },
        { status: 400 },
      )
    }
    patch.dateEmbauche = corps.dateEmbauche
  }

  const champTexte = (
    valeur: unknown,
    max: number,
  ): { ok: true; valeur: string | null } | { ok: false; erreur: string } => {
    if (typeof valeur !== 'string') {
      return { ok: true, valeur: null }
    }
    const net = valeur.trim()
    if (net.length > max) {
      return { ok: false, erreur: `Texte trop long (${max} caractères maximum).` }
    }
    return { ok: true, valeur: net || null }
  }

  if (corps?.telephone !== undefined) {
    const t = champTexte(corps.telephone, LONGUEUR_MAX.telephone)
    if (!t.ok) return NextResponse.json({ erreur: t.erreur }, { status: 400 })
    patch.telephone = t.valeur
  }

  if (corps?.contactUrgence !== undefined) {
    const t = champTexte(corps.contactUrgence, LONGUEUR_MAX.contactUrgence)
    if (!t.ok) return NextResponse.json({ erreur: t.erreur }, { status: 400 })
    patch.contactUrgence = t.valeur
  }

  if (corps?.notes !== undefined) {
    const t = champTexte(corps.notes, LONGUEUR_MAX.notes)
    if (!t.ok) return NextResponse.json({ erreur: t.erreur }, { status: 400 })
    patch.notes = t.valeur
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { erreur: 'Rien à modifier.' },
      { status: 400 },
    )
  }

  try {
    const fiche = await modifierFicheRh(id, patch)
    if (!fiche) {
      return NextResponse.json(
        { erreur: 'Fiche RH introuvable pour ce membre.' },
        { status: 404 },
      )
    }
    return NextResponse.json({ ok: true, fiche })
  } catch {
    logger('rh', 'erreur', 'Échec modification fiche RH', {
      cibleId: id,
      restaurantId,
    })
    return NextResponse.json(
      { erreur: 'Impossible de modifier cette fiche.' },
      { status: 500 },
    )
  }
}