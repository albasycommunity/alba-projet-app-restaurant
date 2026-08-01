import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { enregistrerCommandeClient, lireBdd } from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.CLIENT])
  if (!garde.ok) return garde.reponse

  const corps = await req.json().catch(() => null)
  const lignes = Array.isArray(corps?.lignes) ? corps.lignes : []

  if (lignes.length === 0) {
    return NextResponse.json(
      { erreur: 'Le panier est vide.' },
      { status: 400 },
    )
  }

  const ligneValide = (l: unknown): l is { platId: string; nom: string; prix: number; qte: number } =>
    typeof l === 'object' && l !== null &&
    typeof (l as { platId?: unknown }).platId === 'string' &&
    typeof (l as { nom?: unknown }).nom === 'string' &&
    typeof (l as { prix?: unknown }).prix === 'number' &&
    typeof (l as { qte?: unknown }).qte === 'number' &&
    (l as { qte: number }).qte > 0

  if (!lignes.every(ligneValide)) {
    return NextResponse.json(
      { erreur: 'Panier invalide.' },
      { status: 400 },
    )
  }

  const total = lignes.reduce(
    (s: number, l: { platId: string; nom: string; prix: number; qte: number }) =>
      s + l.prix * l.qte,
    0,
  )

  const bdd = await lireBdd()
  const restaurant = bdd.restaurants[0]

  const { ref, pointsGagnes } = await enregistrerCommandeClient({
    clientId: garde.utilisateur.id,
    clientNom: garde.utilisateur.nom,
    restaurantId: restaurant?.id ?? 'r1',
    lignes: lignes as { platId: string; nom: string; prix: number; qte: number }[],
    total,
  })

  return NextResponse.json({
    ref,
    total,
    pointsGagnes,
    restaurantNom: restaurant?.nom,
  })
}
