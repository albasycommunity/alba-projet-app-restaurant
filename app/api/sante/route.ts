import { NextResponse } from 'next/server'
import { etatDuStore } from '@/lib/server/bdd'
import { logger } from '@/lib/server/logger'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de santé pour les sondes (Docker HEALTHCHECK, équilibreur de
 * charge, uptime). Vérifie que le store lit correctement le disque et
 * expose l'état utile au diagnostic, sans rien écrire.
 */
export async function GET() {
  try {
    const etat = await etatDuStore()
    return NextResponse.json(
      {
        ok: true,
        ...etat,
      },
      { status: 200 },
    )
  } catch (erreur) {
    // Jamais de détail interne vers le client — seulement côté serveur.
    logger('sante', 'erreur', 'Échec de l’état du store', {
      detail: String(erreur),
    })
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
