import { NextRequest, NextResponse } from 'next/server'
import { Role, type NumerosMobileMoney } from '@/lib/auth'
import { lireParametresPaiement, sauverParametresPaiement } from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'
import { NABOOPAY_MOCK } from '@/lib/server/naboopay'

export const dynamic = 'force-dynamic'

/**
 * Panel « Moyens de paiement » du super admin.
 *
 * Sécurité impérative :
 * - seuls les SUPER_ADMIN passent (re-vérifié côté serveur, jamais l'UI seule) ;
 * - les clés API / secrets ne sont JAMAIS renvoyés au client : uniquement
 *   un booléen « configuré ou non » + un état lisible ;
 * - la sauvegarde ne remplace une clé que si un nouveau champ est fourni :
 *   un champ vide signifie « garder la valeur actuelle », donc une clé
 *   affichée quelque part ne peut pas être re-réécrite par un client.
 */

function vueNabooPay(parametres: Awaited<ReturnType<typeof lireParametresPaiement>>) {
  const { apiKey, webhookSecret, actif } = parametres.naboopay
  const aCle = apiKey.trim() !== ''
  const aSecret = webhookSecret.trim() !== ''

  let etat: string
  if (NABOOPAY_MOCK) {
    etat = actif ? 'actif_simulation' : 'simulation_desactive'
  } else if (!aCle && !actif) {
    etat = 'non_configure'
  } else if (!aCle) {
    etat = 'incomplet'
  } else if (!actif) {
    etat = 'configure_desactive'
  } else {
    etat = 'actif'
  }

  return {
    actif,
    apiKeyConfiguree: aCle,
    webhookSecretConfiguree: aSecret,
    etat,
    mock: NABOOPAY_MOCK,
  }
}

export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.SUPER_ADMIN])
  if (!garde.ok) return garde.reponse

  const parametres = await lireParametresPaiement()

  return NextResponse.json({
    numerosMobileMoney: parametres.numerosMobileMoney,
    naboopay: vueNabooPay(parametres),
    // Structure extensible : les futurs fournisseurs s'ajoutent ici sans
    // casser l'UI — chaque entrée porte son état propre.
    fournisseurs: [
      {
        code: 'naboopay',
        nom: 'NabooPay',
        etat: vueNabooPay(parametres).etat,
      },
      { code: 'wave_direct', nom: 'Wave direct', etat: 'bientot' },
      { code: 'orange_money_direct', nom: 'Orange Money direct', etat: 'bientot' },
    ],
    webhookUrl: `${req.nextUrl.origin}/api/webhooks/naboopay`,
  })
}

export async function PATCH(req: NextRequest) {
  const garde = await exigerRole(req, [Role.SUPER_ADMIN])
  if (!garde.ok) return garde.reponse

  const corps = await req.json().catch(() => null)
  if (!corps || typeof corps !== 'object') {
    return NextResponse.json(
      { erreur: 'Corps de requête invalide.' },
      { status: 400 },
    )
  }

  const numeros = corps.numerosMobileMoney as
    | Partial<NumerosMobileMoney>
    | undefined
  if (numeros) {
    for (const [mode, numero] of Object.entries(numeros)) {
      if (typeof numero !== 'string') {
        return NextResponse.json(
          { erreur: `Numéro invalide pour ${mode}.` },
          { status: 400 },
        )
      }
      if (numero.trim() && !/^\+?\d[\d\s.-]*$/.test(numero.trim())) {
        return NextResponse.json(
          { erreur: `Format de numéro invalide pour ${mode}.` },
          { status: 400 },
        )
      }
    }
  }

  const naboopay = corps.naboopay as
    | { actif?: unknown; apiKey?: unknown; webhookSecret?: unknown }
    | undefined
  if (naboopay && typeof naboopay !== 'object') {
    return NextResponse.json(
      { erreur: 'Configuration NabooPay invalide.' },
      { status: 400 },
    )
  }

  await sauverParametresPaiement({
    numerosMobileMoney: numeros as NumerosMobileMoney | undefined,
    naboopay: {
      actif:
        naboopay?.actif !== undefined
          ? naboopay.actif === true
          : undefined,
      apiKey:
        typeof naboopay?.apiKey === 'string' ? naboopay.apiKey : undefined,
      webhookSecret:
        typeof naboopay?.webhookSecret === 'string'
          ? naboopay.webhookSecret
          : undefined,
    },
  })

  const parametres = await lireParametresPaiement()
  return NextResponse.json({
    ok: true,
    message: 'Moyens de paiement enregistrés.',
    numerosMobileMoney: parametres.numerosMobileMoney,
    naboopay: vueNabooPay(parametres),
    webhookUrl: `${req.nextUrl.origin}/api/webhooks/naboopay`,
  })
}
