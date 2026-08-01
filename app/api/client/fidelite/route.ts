import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import { fideliteDeClient } from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.CLIENT])
  if (!garde.ok) return garde.reponse

  const fiche = await fideliteDeClient(garde.utilisateur.id)

  return NextResponse.json({
    fidelite: fiche ?? { userId: garde.utilisateur.id, points: 0, visites: 0, panierMoyen: 0 },
  })
}
