import { NextRequest, NextResponse } from 'next/server'
import { lireBdd } from '@/lib/server/bdd'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const bdd = await lireBdd()
  const cible =
    (id ? bdd.restaurants.find((r) => r.id === id) : null) ??
    bdd.restaurants.find((r) => r.actif) ??
    null

  return NextResponse.json({
    restaurant: cible
      ? { id: cible.id, nom: cible.nom, quartier: cible.quartier }
      : null,
  })
}
