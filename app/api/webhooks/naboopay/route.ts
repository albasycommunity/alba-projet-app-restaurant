import { NextRequest, NextResponse } from 'next/server'
import { traiterWebhookNabooPay } from '@/lib/server/naboopay'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/** Webhooks : 60 notifications / minute par IP — plafonne un repli en boucle. */
const LIMITE_WEBHOOK = { fenetreMs: 60_000, max: 60 }

/**
 * Point d'entrée des notifications NabooPay. À enregistrer dans le
 * dashboard NabooPay sous : https://votre-site.com/api/webhooks/naboopay
 *
 * La signature (header `X-Signature`, HMAC-SHA256 du corps brut avec le
 * secret configuré dans le panel super admin) est vérifiée avant tout
 * traitement — signature invalide → 401, rien ne bouge.
 */
export async function POST(req: NextRequest) {
  if (!(await requeteAutorisee(req, 'webhook', LIMITE_WEBHOOK))) {
    return reponseTropDeRequetes('Trop de notifications.')
  }
  const corpsBrut = await req.text()
  if (corpsBrut.length > 64 * 1024) {
    return NextResponse.json(
      { erreur: 'Corps trop volumineux.' },
      { status: 413 },
    )
  }
  const signature = req.headers.get('x-signature')

  const resultat = await traiterWebhookNabooPay({ corpsBrut, signature })
  return NextResponse.json(resultat.corps, { status: resultat.status })
}
