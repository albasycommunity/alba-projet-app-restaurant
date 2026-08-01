import { NextRequest, NextResponse } from 'next/server'
import {
  MODES_PAIEMENT_ABONNEMENT,
  PLANS_ABONNEMENT,
  Role,
  type ModePaiementAbonnement,
  type PlanAbonnement,
} from '@/lib/auth'
import {
  abonnementDeRestaurant,
  demanderRenouvellement,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const { utilisateur } = garde
  if (!utilisateur.restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const corps = await req.json().catch(() => null)
  const plan: PlanAbonnement =
    corps?.plan === 'annuel' ? 'annuel' : 'mensuel'
  const mode = corps?.mode as ModePaiementAbonnement | undefined

  if (!MODES_PAIEMENT_ABONNEMENT.some((m) => m.mode === mode)) {
    return NextResponse.json(
      { erreur: 'Mode de paiement invalide.' },
      { status: 400 },
    )
  }

  const abonnement = await abonnementDeRestaurant(utilisateur.restaurantId)
  if (!abonnement) {
    return NextResponse.json(
      { erreur: 'Aucun abonnement existant.' },
      { status: 400 },
    )
  }

  const montant = PLANS_ABONNEMENT[plan].montant
  await demanderRenouvellement({
    abonnement,
    plan,
    mode: mode!,
    montant,
  })

  return NextResponse.json({
    ok: true,
    message:
      'Demande enregistrée — ton abonnement est en attente de confirmation par le super admin dès réception du paiement.',
    montant,
    mode,
  })
}
