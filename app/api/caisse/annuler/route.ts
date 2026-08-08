import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/server/supabase'
import { verifierAccesRestaurant } from '@/lib/server/bdd'
import { sessionDepuisRequete } from '@/lib/server/auth'
import { nouveauId } from '@/lib/auth'

/**
 * Vérification PIN anti-vol (IC-01) + journal d'annulation (IC-03).
 *
 * Le PIN ne vit PLUS côté client : il est lu depuis la variable
 * d'environnement ALBA_PIN_MANAGER (défaut '1234' en dev).
 * Jamais renvoyé au navigateur.
 *
 * Corps attendu : { commandeId, commandeRef, montant, pin, motif? }
 * Réponse :
 *   - 200 { autorise: true }           → annulation autorisée
 *   - 403 { erreur: 'PIN incorrect' }  → PIN invalide
 *   - 401                              → session invalide
 */

/** Session utilisateur + accès actif, ou null. */
async function sessionValidee(req: NextRequest) {
  const session = await sessionDepuisRequete(req)
  const utilisateur = session?.utilisateur
  if (!utilisateur || !utilisateur.restaurantId) return null
  const acces = await verifierAccesRestaurant(utilisateur.restaurantId, utilisateur.id)
  if (!acces.compteActif || !acces.abonnementActif) return null
  return utilisateur
}

export async function POST(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const corps = await req.json() as {
      commandeId?: string
      commandeRef?: string
      montant?: number
      pin?: string
      motif?: string
    }

    const { commandeId, commandeRef, montant, pin, motif } = corps

    if (!commandeId || !pin) {
      return NextResponse.json(
        { erreur: 'Corps invalide : commandeId et pin requis' },
        { status: 400 },
      )
    }

    // ─── Vérification du PIN (IC-01) ────────────────────────────────────────
    // Le PIN réel ne vit que dans la variable d'environnement côté serveur —
    // jamais dans le bundle JS client.
    const pinAttendu = process.env.ALBA_PIN_MANAGER ?? '1234'
    if (pin !== pinAttendu) {
      // Délai minimal pour freiner le brute-force (50 ms)
      await new Promise((r) => setTimeout(r, 50))
      return NextResponse.json({ erreur: 'PIN incorrect' }, { status: 403 })
    }

    // ─── Journal d'annulation (IC-03) ────────────────────────────────────────
    // On insère AVANT de répondre : si l'insert échoue, on rejette l'annulation
    // pour ne pas avoir d'annulation non tracée.
    const { error: errJournal } = await supabase
      .from('journal_annulations')
      .insert({
        id: nouveauId('ann'),
        restaurant_id: utilisateur.restaurantId,
        commande_ref: commandeRef ?? commandeId,
        commande_id: commandeId,
        montant: montant ?? 0,
        annule_par_id: utilisateur.id,
        motif: motif ?? null,
        annule_le: new Date().toISOString(),
      })

    if (errJournal) {
      console.error('Erreur journal_annulations :', errJournal)
      return NextResponse.json(
        { erreur: 'Impossible de journaliser l\'annulation — annulation refusée.' },
        { status: 500 },
      )
    }

    // ─── Suppression du ticket dans le cloud ────────────────────────────────
    // Best-effort : si Supabase ne répond pas, le store côté client
    // retentera via la file `suppressions`. On ne bloque pas sur cette erreur.
    await supabase
      .from('commandes_restaurant')
      .delete()
      .eq('id', commandeId)
      .eq('restaurant_id', utilisateur.restaurantId)

    return NextResponse.json({ autorise: true })
  } catch (err) {
    console.error('API /api/caisse/annuler — Erreur inattendue :', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}
