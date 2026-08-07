import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/server/supabase'
import { verifierAccesRestaurant } from '@/lib/server/bdd'
import { sessionDepuisRequete } from '@/lib/server/auth'
import type { Decaissement } from '@/lib/data'

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
 * Décaissements des dernières 24 h du restaurant, tous postes confondus.
 * C'est ce qui permet au pilotage de déduire le vrai total d'espèces
 * sorties, même quand la caisse et la tablette sont deux appareils.
 */
export async function GET(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const depuis = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('decaissements_restaurant')
      .select('*')
      .eq('restaurant_id', utilisateur.restaurantId)
      .gte('date', depuis)
      .order('date', { ascending: false })

    if (error) {
      console.error('Erreur Supabase lecture decaissements:', error)
      return NextResponse.json({ erreur: 'Erreur serveur DB' }, { status: 500 })
    }

    const decaissements: Decaissement[] = (data ?? []).map((l) => ({
      id: String(l.id),
      montant: Number(l.montant),
      motif: String(l.motif ?? ''),
      date: new Date(l.date).getTime(),
      parId: String(l.encaisse_par_id ?? '') || undefined,
      synchronise: true,
    }))

    return NextResponse.json({ decaissements })
  } catch (err) {
    console.error('API Caisse Decaissements GET - Erreur:', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const utilisateur = await sessionValidee(req)
    if (!utilisateur) {
      return NextResponse.json({ erreur: 'Non autorisé' }, { status: 401 })
    }

    const dec = await req.json()

    const { error } = await supabase.from('decaissements_restaurant').insert({
      id: dec.id,
      montant: dec.montant,
      motif: dec.motif,
      date: new Date(dec.date).toISOString(),
      restaurant_id: utilisateur.restaurantId,
      encaisse_par_id: dec.parId ?? null,
    })

    if (error) {
      console.error('Erreur Supabase insertion décaissement:', error)
      return NextResponse.json({ erreur: 'Erreur serveur DB' }, { status: 500 })
    }

    return NextResponse.json({ succes: true })
  } catch (err) {
    console.error('API Caisse Decaissements - Erreur:', err)
    return NextResponse.json({ erreur: 'Erreur inattendue' }, { status: 500 })
  }
}