/**
 * Intégration NabooPay (côté serveur uniquement — jamais importé du client).
 *
 * Toute la logique vit ici pour rester extensible : si un jour un autre
 * agrégateur (Wave direct, Orange Money…) rejoint la plateforme, il suffit
 * d'ajouter un module homologue + une entrée dans la liste des fournisseurs
 * du panel — rien n'est codé en dur pour NabooPay ailleurs.
 *
 * Aucune clé API n'est codée en dur : elle est lue depuis la configuration
 * saisie par le SUPER_ADMIN (BDD serveur). Sans clé configurée, le flux
 * manuel existant reste le fallback.
 *
 * Mode simulation : `NABOOPAY_MOCK=mock` dans l'environnement. La création
 * de transaction renvoie un checkout local de démo et le restaurant peut
 * « simuler le paiement » : le payload de webhook est signé avec le vrai
 * secret configuré puis traité par EXACTEMENT la même fonction que la route
 * de webhook — signature HMAC comprise. Aucun appel réseau réel.
 */

import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { LIBELLE_PALIER } from '@/lib/auth'
import { logger } from '@/lib/server/logger'
import type {
  PalierAbonnement,
  ParametresPaiement,
  PlanAbonnement,
  Utilisateur,
} from '@/lib/auth'
import {
  annulerRenouvellementAutomatique,
  confirmerRenouvellementAutomatique,
  demarrerRenouvellementAutomatique,
  enregistrerTransactionPaiement,
  journaliserWebhook,
  lireBdd,
  lireParametresPaiement,
  trouverTransactionPaiementParOrderId,
} from '@/lib/server/bdd'

/** Base URL publique de l'API NabooPay (v2). */
export const BASE_URL_NABOOPAY = 'https://api.naboopay.com'

/** Délai d'attente d'un appel réseau NabooPay (ms). */
const DELAI_MS = 15_000

/** Mode simulation : teste tout le flux sans clé API réelle ni réseau. */
export const NABOOPAY_MOCK = process.env.NABOOPAY_MOCK === 'mock'

/**
 * Secret de signature utilisé par la SIMULATION quand aucune clé n'a été
 * saisie dans le panel : les deux côtés (signature locale + vérification)
 * utilisent la même valeur, et la vérification n'est possible qu'en mode
 * simulation — un vrai secret reste toujours nécessaire en production.
 */
export const SECRET_WEBHOOK_SIMULATION = 'alba-simulation-webhook-secret'

/** Secret effectif : celui du panel, ou le secret de simulation (mock seul). */
export function secretWebhookEffectif(parametres: ParametresPaiement) {
  return parametres.naboopay.webhookSecret.trim() ||
    (NABOOPAY_MOCK ? SECRET_WEBHOOK_SIMULATION : '')
}

/**
 * Le paiement automatique est proposé quand :
 * - l'interrupteur du panel est activé, ET
 * - une clé API est configurée (ou mode simulation).
 */
export function paiementAutomatiqueDisponible(p: ParametresPaiement) {
  return p.naboopay.actif && (NABOOPAY_MOCK || p.naboopay.apiKey.trim() !== '')
}

export type ErreurNabooPay =
  | { type: 'cle_absente'; message: string }
  | { type: 'cle_invalide'; message: string }
  | { type: 'scope_insuffisant'; message: string }
  | { type: 'rate_limit'; message: string }
  | { type: 'serveur'; message: string }
  | { type: 'reseau'; message: string }

function erreur(message: string, type: ErreurNabooPay['type']): ErreurNabooPay {
  return { type, message }
}

/** Lit la config courante et refuse proprement si le paiement auto est inactif. */
export async function exigerPaiementAutomatique(): Promise<
  | { ok: true; parametres: ParametresPaiement }
  | { ok: false; erreur: ErreurNabooPay }
> {
  const parametres = await lireParametresPaiement()
  if (!parametres.naboopay.actif) {
    return {
      ok: false,
      erreur: erreur(
        'Le paiement automatique est désactivé par le super admin.',
        'cle_absente',
      ),
    }
  }
  if (!NABOOPAY_MOCK && parametres.naboopay.apiKey.trim() === '') {
    return {
      ok: false,
      erreur: erreur(
        'Aucune clé API NabooPay configurée — contacte le super admin.',
        'cle_absente',
      ),
    }
  }
  return { ok: true, parametres }
}

export type TransactionCreee = {
  ok: true
  orderId: string
  checkoutUrl: string
}

/**
 * Crée une transaction d'encaissement (POST /api/v2/transactions) puis
 * redirige le client vers `checkout_url`. En mode simulation, aucune
 * requête réseau : un checkout local de démo est renvoyé.
 */
export async function creerTransactionNabooPay(input: {
  plan: PlanAbonnement
  palier: PalierAbonnement
  montant: number
  utilisateur: Utilisateur
  restaurantNom: string
  origin: string
}): Promise<TransactionCreee | { ok: false; erreur: ErreurNabooPay }> {
  const garde = await exigerPaiementAutomatique()
  if (!garde.ok) return { ok: false, erreur: garde.erreur }
  const { parametres } = garde

  if (NABOOPAY_MOCK) {
    const orderId = `ALB-MOCK-${Date.now().toString(36).toUpperCase()}`
    const checkoutUrl = `${input.origin}/abonnement/renouveler?mock_checkout=${orderId}`
    return { ok: true, orderId, checkoutUrl }
  }

  const corps = {
    method_of_payment: ['wave', 'orange_money'],
    products: [
      {
        name: `Abonnement ${LIBELLE_PALIER[input.palier]} ${input.plan === 'annuel' ? 'annuel' : 'mensuel'} — ${input.restaurantNom}`,
        price: input.montant,
        quantity: 1,
        description: `Abonnement ${LIBELLE_PALIER[input.palier]} (${input.plan}) de ${input.restaurantNom}`,
      },
    ],
    customer: {
      first_name: input.utilisateur.nom.split(' ')[0] ?? '',
      last_name: input.utilisateur.nom.split(' ').slice(1).join(' ') ?? '',
      phone: '',
    },
    success_url: `${input.origin}/abonnement/renouveler?paiement=succes`,
    error_url: `${input.origin}/abonnement/renouveler?paiement=erreur`,
    fees_customer_side: false,
    is_escrow: false,
    is_merchant: false,
  }

  let reponse: Response
  try {
    reponse = await fetch(`${BASE_URL_NABOOPAY}/api/v2/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parametres.naboopay.apiKey}`,
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(DELAI_MS),
      cache: 'no-store',
    })
  } catch {
    return {
      ok: false,
      erreur: erreur(
        'Impossible de joindre NabooPay — vérifie ta connexion et réessaie, ou utilise le paiement manuel.',
        'reseau',
      ),
    }
  }

  const statutErreur = analyserStatutErreur(reponse.status)
  if (statutErreur) return { ok: false, erreur: statutErreur }

  const donnees = await reponse.json().catch(() => null)
  if (
    !donnees ||
    typeof donnees.checkout_url !== 'string' ||
    typeof donnees.order_id !== 'string'
  ) {
    return {
      ok: false,
      erreur: erreur(
        'Réponse NabooPay invalide (champs manquants) — réessaie ou utilise le paiement manuel.',
        'serveur',
      ),
    }
  }

  return {
    ok: true,
    orderId: donnees.order_id,
    checkoutUrl: donnees.checkout_url,
  }
}

/** Récupère une transaction (GET /api/v2/transactions/{order_id}). */
export async function recupererTransactionNabooPay(orderId: string) {
  const parametres = await lireParametresPaiement()
  if (NABOOPAY_MOCK) {
    const transaction = await trouverTransactionPaiementParOrderId(orderId)
    return { transaction_status: transaction?.statut ?? 'pending' }
  }
  if (parametres.naboopay.apiKey.trim() === '') {
    return { transaction_status: 'pending' as const }
  }
  try {
    const reponse = await fetch(
      `${BASE_URL_NABOOPAY}/api/v2/transactions/${encodeURIComponent(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${parametres.naboopay.apiKey}`,
        },
        signal: AbortSignal.timeout(DELAI_MS),
        cache: 'no-store',
      },
    )
    if (!reponse.ok) return { transaction_status: 'pending' as const }
    const donnees = await reponse.json().catch(() => null)
    return {
      transaction_status:
        typeof donnees?.transaction_status === 'string'
          ? donnees.transaction_status
          : 'pending',
    }
  } catch {
    return { transaction_status: 'pending' as const }
  }
}

/**
 * Vérification HMAC-SHA256 du payload brut reçu : la signature NabooPay est
 * calculée sur le corps JSON exact (compact), donc on signe la chaîne telle
 * que reçue, jamais un objet re-sérialisé.
 */
export function verifierSignatureWebhook(
  corpsBrut: string,
  signature: string | null,
  secret: string,
) {
  if (!corpsBrut || !signature || !secret) return false
  const attendue = createHmac('sha256', secret).update(corpsBrut).digest('hex')
  const a = Buffer.from(attendue, 'hex')
  const b = Buffer.from(signature, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** Statuts considérés comme un paiement réussi par le webhook. */
const STATUTS_PAYES = new Set(['completed', 'paid', 'paid_and_blocked'])
const STATUTS_ANNULES = new Set(['cancelled', 'refunded'])

export type ResultatWebhook = {
  status: number
  corps: Record<string, unknown>
}

/**
 * Traite un webhook NabooPay reçu :
 * 1. signature vérifiée avant TOUT traitement (sinon 401, rien ne bouge) ;
 * 2. paiement réussi → activation automatique de l'abonnement ;
 * 3. annulation/remboursement → l'abonnement redevient expiré ;
 * 4. tout est journalisé (même les rejets) pour le debug.
 */
export async function traiterWebhookNabooPay(input: {
  corpsBrut: string
  signature: string | null
}): Promise<ResultatWebhook> {
  const parametres = await lireParametresPaiement()
  const secret = secretWebhookEffectif(parametres)

  const rejeter = async (detail: string, status = 401) => {
    logger('naboopay', 'warn', 'Webhook rejeté', { detail, status })
    await journaliserWebhook({
      signatureValide: false,
      statut: 'rejete',
      detail,
      corps: input.corpsBrut,
    })
    return { status, corps: { erreur: detail } }
  }

  if (!secret && !NABOOPAY_MOCK) {
    return rejeter(
      'Webhook non configuré : aucun secret de signature enregistré.',
    )
  }
  if (!input.signature) {
    return rejeter('Signature X-Signature manquante.')
  }
  if (!verifierSignatureWebhook(input.corpsBrut, input.signature, secret)) {
    return rejeter('Signature invalide.')
  }

  const payload = JSON.parse(input.corpsBrut) as Record<string, unknown> | null
  if (!payload || typeof payload !== 'object') {
    await journaliserWebhook({
      signatureValide: true,
      statut: 'rejete',
      detail: 'Payload non JSON.',
      corps: input.corpsBrut,
    })
    return { status: 400, corps: { erreur: 'Payload invalide.' } }
  }

  const ordreId =
    typeof payload.order_id === 'string' ? payload.order_id : ''
  const statut =
    typeof payload.transaction_status === 'string'
      ? payload.transaction_status
      : ''

  if (!ordreId) {
    await journaliserWebhook({
      signatureValide: true,
      statut: 'ignore',
      detail: 'order_id manquant — ignoré.',
      corps: input.corpsBrut,
    })
    return { status: 200, corps: { ok: true, traite: 'ignore' } }
  }

  const transaction = await trouverTransactionPaiementParOrderId(ordreId)

  if (STATUTS_PAYES.has(statut)) {
    if (!transaction) {
      await journaliserWebhook({
        signatureValide: true,
        statut: 'ignore',
        ordreId,
        detail: `Paiement reçu pour un order_id inconnu (${ordreId}).`,
        corps: input.corpsBrut,
      })
      return { status: 404, corps: { erreur: 'Transaction inconnue.' } }
    }
    if (transaction.statut === 'paid') {
      // Idempotence : NabooPay peut renvoyer le même webhook plusieurs fois.
      await journaliserWebhook({
        signatureValide: true,
        statut: 'ignore',
        ordreId,
        detail: 'Transaction déjà confirmée — ignoré.',
        corps: input.corpsBrut,
      })
      return { status: 200, corps: { ok: true, traite: 'deja_traite' } }
    }
    await confirmerRenouvellementAutomatique({
      transaction,
      methode:
        typeof payload.selected_payment_method === 'string'
          ? payload.selected_payment_method
          : undefined,
      frais: typeof payload.fees === 'number' ? payload.fees : undefined,
    })
    await journaliserWebhook({
      signatureValide: true,
      statut: 'traite',
      ordreId,
      detail: `Paiement confirmé (${statut}) — abonnement activé.`,
      corps: input.corpsBrut,
    })
    return { status: 200, corps: { ok: true, traite: 'confirme' } }
  }

  if (STATUTS_ANNULES.has(statut)) {
    if (transaction) await annulerRenouvellementAutomatique(transaction)
    await journaliserWebhook({
      signatureValide: true,
      statut: 'traite',
      ordreId,
      detail: `Transaction ${statut} — abonnement non activé.`,
      corps: input.corpsBrut,
    })
    return { status: 200, corps: { ok: true, traite: 'annule' } }
  }

  await journaliserWebhook({
    signatureValide: true,
    statut: 'ignore',
    ordreId,
    detail: `Statut sans traitement (${statut || 'inconnu'}).`,
    corps: input.corpsBrut,
  })
  return { status: 200, corps: { ok: true, traite: 'ignore' } }
}

/** Mappe les codes HTTP NabooPay vers des messages compréhensibles. */
function analyserStatutErreur(status: number): ErreurNabooPay | null {
  switch (status) {
    case 401:
      return erreur(
        'Clé API NabooPay invalide — demande au super admin de la vérifier dans le panel Moyens de paiement.',
        'cle_invalide',
      )
    case 403:
      return erreur(
        'La clé NabooPay n’a pas les autorisations nécessaires (scope checkout / write / read_write).',
        'scope_insuffisant',
      )
    case 409:
    case 429:
      return erreur(
        'NabooPay a limité le nombre de requêtes — réessaie dans une minute, ou utilise le paiement manuel.',
        'rate_limit',
      )
    default:
      if (status >= 500) {
        return erreur(
          'NabooPay est momentanément indisponible — réessaie, ou utilise le paiement manuel.',
          'serveur',
        )
      }
      if (status >= 400) {
        return erreur(
          `NabooPay a refusé la transaction (${status}) — utilise le paiement manuel.`,
          'serveur',
        )
      }
      return null
  }
}
