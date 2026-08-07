import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/server/supabase'
import { verifierAccesRestaurant } from '@/lib/server/bdd'
import { sessionDepuisRequete } from '@/lib/server/auth'
import type {
  CanalCommande,
  Commande,
  StatutCommande,
} from '@/lib/data'

/** Session utilisateur + accès actif, ou null si le poste n'a pas le droit. */
async function sessionValidee(req: NextRequest) {
  const session = await sessionDepuisRequete(req)
  const utilisateur = session?.utilisateur
  if (!utilisateur || !utilisateur.restaurantId) return null
  const acces = await verifierAccesRestaurant(utilisateur.restaurantId, utilisateur.id)
  if (!acces.compteActif || !acces.abonnementActif) return null
  return utilisateur
}

/**
 * Renvoie les commandes du restaurant pour les dernières 24 h — c'est ce
 * qui permet au pilotage de compter les ventes encaissées sur tous les
 * postes, pas seulement celles de l'appareil courant.
 */
export async function GET(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('commandes_restaurant')
      .select('*')
      .eq('restaurant_id', utilisateur.restaurantId)
      .gte('recue_a', depuis)
      .order('recue_a', { ascending: false })

    if (error) {
      console.error('Erreur Supabase lecture commandes:', error)
      return NextResponse.json({ erreur: 'Erreur serveur DB' }, { status: 500 })
    }

    const commandes: Commande[] = (data ?? []).map((l) => ({
      id: String(l.id),
      ref: String(l.ref ?? ''),
      canal: (l.canal ?? 'comptoir') as CanalCommande,
      table: l.table_nom ?? undefined,
      client: l.client ?? undefined,
      statut: (l.statut ?? 'recue') as StatutCommande,
      recueA: new Date(l.recue_a).getTime(),
      estimation: Number(l.estimation ?? 10),
      lignes: Array.isArray(l.lignes) ? (l.lignes as Commande['lignes']) : [],
      reglements: Array.isArray(l.reglements)
        ? (l.reglements as Commande['reglements'])
        : [],
      synchronise: true,
      encaisseParId: String(l.encaisse_par_id ?? '') || undefined,
    }))

    return NextResponse.json({ commandes })
  } catch (err) {
    console.error('API Caisse Commandes GET - Erreur:', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}

/**
 * Annule un encaissement côté cloud : quand un ticket est retiré de la
 * caisse (annulation PIN), il ne doit plus compter dans le chiffre
 * d'affaires d'aucun poste.
 */
export async function DELETE(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ erreur: 'id manquant' }, { status: 400 })
    }

    const { error } = await supabase
      .from('commandes_restaurant')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', utilisateur.restaurantId)

    if (error) {
      console.error('Erreur Supabase suppression commande:', error)
      return NextResponse.json({ erreur: 'Erreur serveur DB' }, { status: 500 })
    }

    return NextResponse.json({ succes: true })
  } catch (err) {
    console.error('API Caisse Commandes DELETE - Erreur:', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const commande = await req.json()

    // Insertion dans Supabase
    const { error } = await supabase.from('commandes_restaurant').insert({
      id: commande.id,
      ref: commande.ref,
      canal: commande.canal,
      table_nom: commande.table ?? null,
      client: commande.client ?? null,
      statut: commande.statut,
      recue_a: new Date(commande.recueA).toISOString(),
      estimation: commande.estimation,
      lignes: commande.lignes,
      reglements: commande.reglements,
      restaurant_id: utilisateur.restaurantId,
      encaisse_par_id: commande.encaisseParId ?? null,
    })

    if (error) {
      console.error('Erreur Supabase insertion commande:', error)
      return NextResponse.json({ erreur: 'Erreur serveur DB' }, { status: 500 })
    }

    return NextResponse.json({ succes: true })
  } catch (err) {
    console.error('API Caisse Commandes - Erreur:', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}