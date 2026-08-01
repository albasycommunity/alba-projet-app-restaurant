import { NextRequest, NextResponse } from 'next/server'
import { PLANS_ABONNEMENT, Role } from '@/lib/auth'
import {
  creerRestaurantAvecAbonnement,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'
import { exigerRole } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const garde = await exigerRole(req, [Role.SUPER_ADMIN])
  if (!garde.ok) return garde.reponse

  const corps = await req.json().catch(() => null)
  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : ''
  const quartier = typeof corps?.quartier === 'string' ? corps.quartier.trim() : ''
  const gerant = typeof corps?.gerant === 'string' ? corps.gerant.trim() : ''
  const email = typeof corps?.email === 'string' ? corps.email.trim() : ''
  const motDePasse =
    typeof corps?.motDePasse === 'string' ? corps.motDePasse.trim() : ''
  const plan = corps?.plan === 'annuel' ? 'annuel' : 'mensuel'

  if (!nom || !quartier || !gerant) {
    return NextResponse.json(
      { erreur: 'Nom, quartier et gérant sont requis.' },
      { status: 400 },
    )
  }
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json({ erreur: 'Email invalide.' }, { status: 400 })
  }
  if (motDePasse.length < 8) {
    return NextResponse.json(
      { erreur: 'Le mot de passe doit faire au moins 8 caractères.' },
      { status: 400 },
    )
  }
  if (await trouverUtilisateurParEmail(email)) {
    return NextResponse.json(
      { erreur: 'Un compte existe déjà avec cet email.' },
      { status: 409 },
    )
  }

  const planChoisi = PLANS_ABONNEMENT[plan]
  await creerRestaurantAvecAbonnement({
    nom,
    quartier,
    gerant,
    email,
    motDePasse,
    plan,
    montant: planChoisi.montant,
  })

  return NextResponse.json(
    {
      ok: true,
      message: `${nom} est en ligne avec son abonnement ${planChoisi.libelle.toLowerCase()}.`,
    },
    { status: 201 },
  )
}
