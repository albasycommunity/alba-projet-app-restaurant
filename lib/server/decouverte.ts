import { NextResponse } from 'next/server'

/**
 * Actions réelles offertes en mode découverte. Chaque action consommée
 * décrémente `decouverte_actions_restantes` (atomique côté store).
 */
export const ACTIONS_DECOUVERTE = ['encaisser', 'creer-employe'] as const
export type ActionDecouverte = (typeof ACTIONS_DECOUVERTE)[number]

/** Réponse 402 standard quand le quota d'actions de découverte est épuisé. */
export function reponseQuotaDecouverteEpuise() {
  return NextResponse.json(
    {
      ok: false,
      erreur: "Ton quota d'actions de découverte est épuisé.",
      raison: 'activation-requise',
      url: '/abonnement/renouveler?raison=activation-requise',
    },
    { status: 402 },
  )
}
