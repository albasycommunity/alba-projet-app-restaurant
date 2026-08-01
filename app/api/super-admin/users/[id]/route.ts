import { NextRequest, NextResponse } from 'next/server'
import { Role } from '@/lib/auth'
import {
  muterBdd,
  reinitialiserMotDePasse,
  trouverUtilisateur,
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

  const cible = await trouverUtilisateur(id)
  if (!cible) {
    return NextResponse.json(
      { erreur: 'Compte introuvable.' },
      { status: 404 },
    )
  }
  if (cible.role === Role.SUPER_ADMIN) {
    return NextResponse.json(
      { erreur: 'Le super admin ne se modifie pas ici.' },
      { status: 400 },
    )
  }

  let actif: boolean | undefined
  let nouveauMotDePasse: string | undefined

  if (typeof corps?.actif === 'boolean') {
    actif = corps.actif
  }
  if (corps?.reinitialiserMotDePasse) {
    nouveauMotDePasse = await reinitialiserMotDePasse(cible)
  }

  if (actif !== undefined) {
    await muterBdd((bdd) => {
      const cibleBdd = bdd.utilisateurs.find((u) => u.id === id)
      if (cibleBdd) cibleBdd.actif = actif!
    })
  }

  return NextResponse.json({
    ok: true,
    actif,
    nouveauMotDePasse,
  })
}
