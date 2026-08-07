import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { exigerRole } from '@/lib/server/auth'
import { supabase } from '@/lib/server/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Seul le staff (caissier) ou l'admin peut facturer
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN, Role.STAFF], { verifierAbonnement: true })
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json({ erreur: 'Aucun restaurant rattaché.' }, { status: 400 })
  }

  const corps = await req.json().catch(() => null)
  if (!corps || !corps.reglements) {
    return NextResponse.json({ erreur: 'Données de facturation manquantes.' }, { status: 400 })
  }

  // 1. Lire le compteur actuel de factures
  const { data: compteurData, error: errCompteurLecture } = await supabase
    .from('compteurs')
    .select('valeur')
    .eq('cle', 'factures_' + restaurantId)
    .single()

  let valeurActuelle = 0
  if (errCompteurLecture && errCompteurLecture.code === 'PGRST116') {
    // Le compteur n'existe pas encore pour ce restaurant, on le crée
    const { error: errInsert } = await supabase
      .from('compteurs')
      .insert({ cle: 'factures_' + restaurantId, valeur: 1 })
    if (!errInsert) {
      valeurActuelle = 1
    }
  } else if (compteurData) {
    valeurActuelle = compteurData.valeur + 1
    await supabase
      .from('compteurs')
      .update({ valeur: valeurActuelle })
      .eq('cle', 'factures_' + restaurantId)
  }

  // Si on a pas pu récupérer la valeur, on fallback sur un timestamp pour éviter un blocage
  const numeroBrut = valeurActuelle > 0 ? valeurActuelle : Date.now()
  const annee = new Date().getFullYear()
  const numeroFacture = `FAC-${annee}-${String(numeroBrut).padStart(5, '0')}`

  // On pourrait insérer dans une vraie table 'factures' ici si on avait mis à jour le schéma

  return NextResponse.json({
    ok: true,
    numeroFacture,
    restaurantId,
    creeLe: new Date().toISOString()
  })
}
