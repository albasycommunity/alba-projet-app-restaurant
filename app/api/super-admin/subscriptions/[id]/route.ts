import { NextRequest, NextResponse } from 'next/server'
import { Role, type StatutAbonnement } from '@/lib/auth'
import {
  activerAbonnement,
  lireBdd,
  suspendreAbonnement,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const garde = await exigerRole(req, [Role.SUPER_ADMIN])
  if (!garde.ok) return garde.reponse

  const { id } = await context.params
  const corps = await req.json().catch(() => null)
  const statut = corps?.statut as StatutAbonnement | undefined

  const bdd = await lireBdd()
  const abonnement = bdd.abonnements.find((a) => a.id === id)
  if (!abonnement) {
    return NextResponse.json(
      { erreur: 'Abonnement introuvable.' },
      { status: 404 },
    )
  }

  if (statut === 'actif') {
    await activerAbonnement(abonnement)
    return NextResponse.json({
      ok: true,
      message: 'Abonnement activé — le back-office est de nouveau accessible.',
    })
  }
  if (statut === 'expire') {
    await suspendreAbonnement(abonnement)
    return NextResponse.json({
      ok: true,
      message: 'Abonnement suspendu — l’accès au back-office est coupé.',
    })
  }
  if (statut === 'en_attente') {
    await import('@/lib/server/bdd').then((m) =>
      m.muterBdd((db) => {
        const cible = db.abonnements.find((a) => a.id === abonnement.id)
        if (cible) cible.statut = 'en_attente'
      }),
    )
    return NextResponse.json({ ok: true, message: 'Abonnement en attente.' })
  }

  return NextResponse.json(
    { erreur: 'Statut invalide.' },
    { status: 400 },
  )
}
