import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import {
  marquerOnboardingMasque,
  marquerPilotageConsulte,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import { progressionOnboarding } from '@/lib/server/onboarding'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/** Freine l'abus : 20 bascules / heure par IP (suffisant, c'est un geste rare). */
const LIMITE_ONBOARDING = { fenetreMs: 3_600_000, max: 20 }

/**
 * Progression de l'onboarding découverte. Le restaurantId vient TOUJOURS
 * de la session (jamais du client). Les contributions platCree/venteEncaisee
 * sont des FAITS constatés côté client (le menu et les encaissements de
 * session vivent en local) — le serveur agrège et reste l'autorité du
 * compteur. Fail-closed : un restaurant masqué reçoit `visible:false` et
 * l'interface n'affiche strictement rien.
 */
export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN])
  if (!garde.ok) return garde.reponse

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const platCree = req.nextUrl.searchParams.get('platCree') === '1'
  const venteEncaisee = req.nextUrl.searchParams.get('venteEncaisee') === '1'

  return NextResponse.json(
    await progressionOnboarding(restaurantId, { platCree, venteEncaisee }),
  )
}

/**
 * Mutations d'onboarding :
 * - `{ action: 'masquer', masque: true }` → sortie définitive du parcours
 *   (« Je connais déjà » / « Ne plus afficher ») ;
 * - `{ action: 'pilotage-consulte' }` → étape 5 cochée (visite réelle des stats).
 */
export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN], {
    verifierAbonnement: true,
  })
  if (!garde.ok) return garde.reponse

  if (!(await requeteAutorisee(req, 'onboarding', LIMITE_ONBOARDING))) {
    return reponseTropDeRequetes('Trop de demandes. Réessaie dans une minute.')
  }

  const restaurantId = garde.utilisateur.restaurantId
  if (!restaurantId) {
    return NextResponse.json(
      { erreur: 'Aucun restaurant rattaché à ce compte.' },
      { status: 400 },
    )
  }

  const corps = await req.json().catch(() => null)
  const action = corps?.action

  if (action === 'masquer') {
    // `masque` n'existe pas → `true` (fail-closed : on masque).
    const masque = corps.masque === false ? false : true
    await marquerOnboardingMasque(restaurantId, masque)
    return NextResponse.json({ ok: true, masque })
  }

  if (action === 'pilotage-consulte') {
    await marquerPilotageConsulte(restaurantId)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ erreur: 'Action d’onboarding inconnue.' }, { status: 400 })
}