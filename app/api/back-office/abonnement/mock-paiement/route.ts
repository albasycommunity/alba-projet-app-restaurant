import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { Role } from '@/lib/auth'
import {
  lireParametresPaiement,
  trouverTransactionPaiementParOrderId,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'
import {
  NABOOPAY_MOCK,
  SECRET_WEBHOOK_SIMULATION,
  traiterWebhookNabooPay,
} from '@/lib/server/naboopay'

export const dynamic = 'force-dynamic'

/** Simulation de paiement : 10 / minute par IP — route payante. */
const LIMITE_SIMULATION = { fenetreMs: 60_000, max: 10 }

/**
 * Mode simulation uniquement (NABOOPAY_MOCK=mock, jamais en production) :
 * simule le webhook « paiement réussi » pour une transaction locale.
 *
 * Le payload est construit EXACTEMENT comme NabooPay l'enverrait, signé
 * avec le secret configuré dans le panel, puis traité par la même fonction
 * que la route de webhook — la vérification HMAC est donc réellement
 * exercée. Aucun appel réseau, aucune clé réelle requise.
 */
export async function POST(req: NextRequest) {
  if (process.env.NABOOPAY_MOCK !== 'mock') {
    return NextResponse.json(
      { erreur: 'Mode simulation désactivé.' },
      { status: 404 },
    )
  }

  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  if (!requeteAutorisee(req, 'mock-paiement', LIMITE_SIMULATION)) {
    return reponseTropDeRequetes(
      'Trop de demandes. Réessaie dans une minute.',
    )
  }

  const corps = await req.json().catch(() => null)
  const orderId = typeof corps?.orderId === 'string' ? corps.orderId : ''
  if (!orderId) {
    return NextResponse.json(
      { erreur: 'orderId manquant.' },
      { status: 400 },
    )
  }

  const transaction = await trouverTransactionPaiementParOrderId(orderId)
  if (
    !transaction ||
    transaction.restaurantId !== garde.utilisateur.restaurantId
  ) {
    return NextResponse.json(
      { erreur: 'Transaction introuvable pour ce restaurant.' },
      { status: 404 },
    )
  }

  const parametres = await lireParametresPaiement()
  const payload = {
    order_id: transaction.orderId,
    transaction_status: 'completed',
    amount: transaction.montant,
    currency: 'XOF',
    selected_payment_method: 'wave',
    customer: {
      first_name: garde.utilisateur.nom.split(' ')[0] ?? '',
      last_name: garde.utilisateur.nom.split(' ').slice(1).join(' ') ?? '',
      phone: '',
    },
    fees: Math.round(transaction.montant * 0.01),
    paid_at: new Date().toISOString(),
  }
  const corpsBrut = JSON.stringify(payload)

  // Signature HMAC-SHA256 comme le ferait NabooPay. Sans secret saisi
  // dans le panel, la simulation utilise le secret de simulation partagé
  // (même valeur du côté vérification) — le flux est testable sans clé.
  const signature = createHmac(
    'sha256',
    parametres.naboopay.webhookSecret.trim() || SECRET_WEBHOOK_SIMULATION,
  )
    .update(corpsBrut)
    .digest('hex')

  const resultat = await traiterWebhookNabooPay({
    corpsBrut,
    signature,
  })

  return NextResponse.json(
    {
      ...resultat.corps,
      simulation: true,
      message:
        resultat.status === 200
          ? 'Paiement simulé : l’abonnement a été activé automatiquement (webhook signé et vérifié).'
          : 'La simulation a échoué.',
    },
    { status: resultat.status },
  )
}
