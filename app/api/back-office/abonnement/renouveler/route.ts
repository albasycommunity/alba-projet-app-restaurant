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
  demarrerRenouvellementAutomatique,
  enregistrerTransactionPaiement,
  lireBdd,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import { creerTransactionNabooPay } from '@/lib/server/naboopay'

export const dynamic = 'force-dynamic'

/**
 * Deux flux selon le choix du restaurant :
 * - `naboopay: true` → paiement automatique : crée une transaction
 *   NabooPay et renvoie `checkout_url` vers laquelle rediriger le client.
 *   L'abonnement s'activera automatiquement à la réception du webhook.
 * - sinon → flux manuel existant (paiement mobile money + validation par
 *   le super admin). Fallback conservé tel quel quand NabooPay n'est pas
 *   configuré, indisponible ou en erreur.
 */
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
  const naboopay = corps?.naboopay === true

  const abonnement = await abonnementDeRestaurant(utilisateur.restaurantId)
  if (!abonnement) {
    return NextResponse.json(
      { erreur: 'Aucun abonnement existant.' },
      { status: 400 },
    )
  }

  const montant = PLANS_ABONNEMENT[plan].montant

  /* ------------------------- paiement automatique ------------------------- */
  if (naboopay) {
    const bdd = await lireBdd()
    const restaurant = bdd.restaurants.find(
      (r) => r.id === utilisateur.restaurantId,
    )
    const creation = await creerTransactionNabooPay({
      plan,
      montant,
      utilisateur,
      restaurantNom: restaurant?.nom ?? 'Restaurant',
      origin: req.nextUrl.origin,
    })

    if (!creation.ok) {
      // Clé absente/invalide, mauvais scope, rate limit, erreur serveur,
      // réseau… : on renvoie une erreur claire et le client propose de
      // basculer sur le flux manuel — jamais le paiement ne reste bloqué.
      return NextResponse.json(
        {
          ok: false,
          erreur: creation.erreur.message,
          naboopayErreur: creation.erreur.type,
          proposeManuel: true,
        },
        { status: 200 },
      )
    }

    await demarrerRenouvellementAutomatique({ abonnement, plan, montant })
    await enregistrerTransactionPaiement({
      orderId: creation.orderId,
      abonnement,
      restaurantId: utilisateur.restaurantId,
      plan,
      montant,
    })

    return NextResponse.json({
      ok: true,
      naboopay: true,
      checkoutUrl: creation.checkoutUrl,
      orderId: creation.orderId,
      montant,
    })
  }

  /* ----------------------------- flux manuel ----------------------------- */
  if (!MODES_PAIEMENT_ABONNEMENT.some((m) => m.mode === mode)) {
    return NextResponse.json(
      { erreur: 'Mode de paiement invalide.' },
      { status: 400 },
    )
  }

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
