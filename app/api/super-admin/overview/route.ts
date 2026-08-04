import { NextRequest, NextResponse } from 'next/server'
import { Role, joursRestants } from '@/lib/auth'
import { lireBdd } from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const garde = await exigerRole(req, [Role.SUPER_ADMIN])
  if (!garde.ok) return garde.reponse

  const bdd = await lireBdd()

  const abonnementParRestaurant = Object.fromEntries(
    bdd.abonnements.map((a) => [a.restaurantId, a]),
  )

  const actifs = bdd.abonnements.filter((a) => a.statut === 'actif')
  const mrq =
    actifs.reduce(
      (s, a) => s + (a.plan === 'annuel' ? a.montant / 12 : a.montant),
      0,
    )
  const revenus = bdd.paiements.reduce((s, p) => s + p.montant, 0)

  const restaurants = bdd.restaurants.map((r) => {
    const abonnement = abonnementParRestaurant[r.id]
    return {
      ...r,
      abonnement: abonnement
        ? {
            ...abonnement,
            joursRestants: joursRestants(abonnement.dateFin),
          }
        : null,
    }
  })

  const admins = bdd.utilisateurs.filter(
    (u) => u.role === Role.RESTAURANT_ADMIN,
  )

  return NextResponse.json({
    stats: {
      restaurants: bdd.restaurants.length,
      restaurantsActifs: bdd.restaurants.filter((r) => r.actif).length,
      admins: admins.length,
      abonnementsActifs: actifs.length,
      decouvertes: bdd.abonnements.filter((a) => a.statut === 'decouverte').length,
      enAttente: bdd.abonnements.filter((a) => a.statut === 'en_attente').length,
      expires: bdd.abonnements.filter((a) => a.statut === 'expire').length,
      mrq: Math.round(mrq),
      revenus,
      commandesClients: bdd.commandesClients.length,
      clients: bdd.utilisateurs.filter((u) => u.role === Role.CLIENT).length,
    },
    restaurants,
    admins,
    paiementsRecents: bdd.paiements.slice(0, 12),
  })
}
