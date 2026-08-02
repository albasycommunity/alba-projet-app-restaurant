import { hashSync } from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import { Role, nouveauId, dateIso, type PlanAbonnement } from '@/lib/auth'
import {
  creerRestaurantEnEssai,
  muterBdd,
  trouverUtilisateurParEmail,
} from '@/lib/server/bdd'

export const dynamic = 'force-dynamic'

const EMAIL_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const corps = await req.json().catch(() => null)
  const nom = typeof corps?.nom === 'string' ? corps.nom.trim() : ''
  const email = typeof corps?.email === 'string' ? corps.email.trim() : ''
  const motDePasse =
    typeof corps?.motDePasse === 'string' ? corps.motDePasse : ''
  const nomRestaurant =
    typeof corps?.nomRestaurant === 'string' ? corps.nomRestaurant.trim() : ''
  const quartier =
    typeof corps?.quartier === 'string' ? corps.quartier.trim() : ''
  const plan: PlanAbonnement | null =
    corps?.plan === 'annuel' ? 'annuel' : corps?.plan === 'mensuel' ? 'mensuel' : null

  if (nom.length < 2) {
    return NextResponse.json(
      { erreur: 'Indique ton nom complet.' },
      { status: 400 },
    )
  }
  if (!EMAIL_VALIDE.test(email)) {
    return NextResponse.json(
      { erreur: 'Adresse email invalide.' },
      { status: 400 },
    )
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

  // Inscription gérant : un plan a été choisi sur la landing → le restaurant
  // démarre avec DUREE_ESSAI_JOURS jours d'essai gratuit. Aucune session
  // n'est créée : l'utilisateur se connecte ensuite.
  if (plan) {
    if (nomRestaurant.length < 2) {
      return NextResponse.json(
        { erreur: "Indique le nom de ton restaurant." },
        { status: 400 },
      )
    }
    await creerRestaurantEnEssai({
      nom: nomRestaurant,
      quartier: quartier || 'Dakar',
      gerant: nom,
      email,
      motDePasse,
      plan,
    })
    return NextResponse.json(
      { ok: true, compte: 'restaurant', plan },
      { status: 201 },
    )
  }

  // Inscription client (Carte de Fidélité) — comportement historique.
  const utilisateur = {
    id: nouveauId('u'),
    email: email.toLowerCase(),
    password_hash: hashSync(motDePasse, 10),
    nom,
    role: Role.CLIENT,
    restaurantId: null,
    actif: true,
    permissions: [],
    creeLe: dateIso(new Date()),
  }

  await muterBdd((bdd) => {
    bdd.utilisateurs.push(utilisateur)
    bdd.fidelite.push({
      userId: utilisateur.id,
      points: 0,
      visites: 0,
      panierMoyen: 0,
    })
  })

  return NextResponse.json({ ok: true, compte: 'client' }, { status: 201 })
}
