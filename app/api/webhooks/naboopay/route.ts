import { NextRequest, NextResponse } from 'next/server'
import { traiterWebhookNabooPay } from '@/lib/server/naboopay'

export const dynamic = 'force-dynamic'

/**
 * Point d'entrée des notifications NabooPay. À enregistrer dans le
 * dashboard NabooPay sous : https://votre-site.com/api/webhooks/naboopay
 *
 * La signature (header `X-Signature`, HMAC-SHA256 du corps brut avec le
 * secret configuré dans le panel super admin) est vérifiée avant tout
 * traitement — signature invalide → 401, rien ne bouge.
 */
export async function POST(req: NextRequest) {
  const corpsBrut = await req.text()
  const signature = req.headers.get('x-signature')

  const resultat = await traiterWebhookNabooPay({ corpsBrut, signature })
  return NextResponse.json(resultat.corps, { status: resultat.status })
}
