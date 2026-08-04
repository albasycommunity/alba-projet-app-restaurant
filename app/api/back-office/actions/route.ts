import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import {
  consommerActionDecouverte,
  decouverteActionsRestantes,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import {
  ACTIONS_DECOUVERTE,
  reponseQuotaDecouverteEpuise,
} from '@/lib/server/decouverte'
import { reponseTropDeRequetes, requeteAutorisee } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

/** Freine l'abus : 60 consommations / heure par IP. */
const LIMITE_ACTIONS = { fenetreMs: 3_600_000, max: 60 }

/**
 * Consomme une action de découverte réelle (encaissement, création
 * d'employé). Le restaurantId vient TOUJOURS de la session, jamais du
 * corps de requête. Quota épuisé ou abonnement plus en découverte → 402.
 */
export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.RESTAURANT_ADMIN], {
    verifierAbonnement: true,
  })
  if (!garde.ok) return garde.reponse

  if (!(await requeteAutorisee(req, 'actions', LIMITE_ACTIONS))) {
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
  if (
    typeof action !== 'string' ||
    !(ACTIONS_DECOUVERTE as readonly string[]).includes(action)
  ) {
    return NextResponse.json(
      { erreur: "Action de découverte inconnue." },
      { status: 400 },
    )
  }

  const restantes = await decouverteActionsRestantes(restaurantId)
  if (restantes === null || restantes === 0) {
    return reponseQuotaDecouverteEpuise()
  }

  // Décrément atomique : deux requêtes simultanées ne peuvent pas passer
  // toutes les deux — la consommation fait foi (fail-closed).
  const consommation = await consommerActionDecouverte(restaurantId)
  if (!consommation.ok) {
    return reponseQuotaDecouverteEpuise()
  }

  return NextResponse.json({
    ok: true,
    actionsRestantes: consommation.restantes,
  })
}
