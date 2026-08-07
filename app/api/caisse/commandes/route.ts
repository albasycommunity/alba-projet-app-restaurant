import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/server/supabase'
import { verifierAccesRestaurant } from '@/lib/server/bdd'
import { sessionDepuisRequete } from '@/lib/server/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await sessionDepuisRequete(req)
    const utilisateur = session?.utilisateur

    if (!utilisateur || !utilisateur.restaurantId) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const acces = await verifierAccesRestaurant(utilisateur.restaurantId, utilisateur.id)
    if (!acces.compteActif || !acces.abonnementActif) {
      return NextResponse.json({ erreur: 'Accès bloqué' }, { status: 403 })
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
