'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheckIcon,
  HeartIcon,
  LoaderIcon,
  MinusIcon,
  PlusIcon,
  ShoppingBagIcon,
  XIcon,
} from 'lucide-react'
import { Badge, Card, Sheet } from '@/components/kit'
import { useAuth } from '@/lib/auth-contexte'
import { useMenu } from '@/components/menu-store'
import { CATEGORIES, PALIERS, niveauPour, prochainPalier } from '@/lib/data'

type LignePanier = { platId: string; nom: string; prix: number; qte: number }

const fcfa = (n: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F'

/**
 * Accueil du client connecté : la carte du jour, la commande en ligne et
 * sa Carte de Fidélité. Réservé aux sessions CLIENT — jamais visible
 * avant authentification.
 */
export function AccueilClient() {
  const router = useRouter()
  const { utilisateur, chargement: chargementAuth, deconnecter } = useAuth()
  const { platsActifs } = useMenu()

  const [panier, setPanier] = useState<LignePanier[]>([])
  const [panierOuvert, setPanierOuvert] = useState(false)
  const [commande, setCommande] = useState<{
    ref: string
    total: number
    pointsGagnes: number
  } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const [fidelite, setFidelite] = useState<{
    points: number
    visites: number
  } | null>(null)

  const [restaurant, setRestaurant] = useState<{
    id: string
    nom: string
    quartier: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/client/restaurant', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setRestaurant(d.restaurant))
      .catch(() => setRestaurant(null))
  }, [])

  useEffect(() => {
    if (utilisateur?.role !== 'CLIENT') return
    fetch('/api/client/fidelite', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setFidelite(d.fidelite))
      .catch(() => setFidelite(null))
  }, [utilisateur])

  const total = useMemo(
    () => panier.reduce((s, l) => s + l.prix * l.qte, 0),
    [panier],
  )
  const nombrePlats = panier.reduce((s, l) => s + l.qte, 0)

  function ajouter(platId: string, nom: string, prix: number) {
    setPanier((liste) => {
      const existante = liste.find((l) => l.platId === platId)
      return existante
        ? liste.map((l) =>
            l.platId === platId ? { ...l, qte: l.qte + 1 } : l,
          )
        : [...liste, { platId, nom, prix, qte: 1 }]
    })
  }

  function retirer(platId: string) {
    setPanier((liste) =>
      liste
        .map((l) => (l.platId === platId ? { ...l, qte: l.qte - 1 } : l))
        .filter((l) => l.qte > 0),
    )
  }

  async function commander() {
    if (!utilisateur) {
      router.push('/login')
      return
    }
    setErreur(null)
    setEnvoi(true)
    try {
      const reponse = await fetch('/api/client/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lignes: panier }),
      })
      const donnees = await reponse.json()
      if (!reponse.ok) {
        setErreur(donnees.erreur ?? 'Commande impossible.')
        return
      }
      setCommande(donnees)
      setPanier([])
      setPanierOuvert(false)
    } catch {
      setErreur('Le serveur ne répond pas. Réessaie dans un instant.')
    } finally {
      setEnvoi(false)
    }
  }

  const niveau = fidelite ? niveauPour(fidelite.points) : null
  const prochain = fidelite ? prochainPalier(fidelite.points) : null

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      {/* En-tête */}
      <header className="glass sticky top-0 z-40 flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
          a
        </span>
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-base font-semibold">
            {restaurant?.nom ?? 'alba'}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">
            {restaurant
              ? restaurant.quartier
              : "l'excellence culinaire, simplifiée"}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {chargementAuth ? null : utilisateur ? (
            <div className="flex items-center gap-2 rounded-full bg-secondary/70 py-1 pr-3 pl-1">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-[11px] font-semibold text-primary">
                {utilisateur.nom
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((m) => m[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="hidden text-xs font-medium sm:inline">
                {utilisateur.nom.split(' ')[0]}
              </span>
              <button
                type="button"
                onClick={deconnecter}
                className="text-[11px] text-muted-foreground hover:text-destructive"
              >
                Quitter
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 sm:px-6">
        {/* Héro */}
        <section className="animate-rise mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Badge ton="primaire">Carte du jour</Badge>
          <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            La vraie cuisine de Dakar,
            <br />
            chez toi en quelques minutes.
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Thiéboudienne, yassa, dibi : commande en ligne, retrait au
            comptoir ou livraison. Et à chaque commande, ta Carte de
            Fidélité engrange des points.
          </p>
        </section>

        {/* Carte de fidélité */}
        <section className="mt-6">
          <Card className="animate-rise ring-glow">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <HeartIcon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-sm font-semibold">
                  Carte de Fidélité
                </h2>
                {niveau && fidelite ? (
                  <p className="text-xs text-muted-foreground">
                    {fidelite.points} points · niveau{' '}
                    <span className="font-medium text-foreground">{niveau}</span>
                    {' · '}
                    {fidelite.visites} visites
                    {prochain &&
                      ` · encore ${prochain.manque} points pour ${prochain.niveau}`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Commande et tes points s'ajoutent ici.
                  </p>
                )}
              </div>
              {utilisateur && (
                <div className="flex flex-col gap-1">
                  {PALIERS.map((p) => (
                    <span key={p.niveau} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <BadgeCheckIcon
                        className={`size-3.5 ${
                          niveau === p.niveau ? 'text-primary' : 'text-muted-foreground/40'
                        }`}
                      />
                      {p.niveau} — {p.avantage}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Menu */}
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            La carte
          </h2>
          <div className="mt-4 flex flex-col gap-6">
            {CATEGORIES.map((categorie) => {
              const plats = platsActifs.filter((p) => p.categorie === categorie)
              if (plats.length === 0) return null
              return (
                <div key={categorie}>
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {categorie}
                  </h3>
                  <ul className="mt-2 flex flex-col divide-y divide-border">
                    {plats.map((plat) => (
                      <li
                        key={plat.id}
                        className="flex items-center gap-3 py-3"
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {plat.nom}
                            </span>
                            {plat.rupture && (
                              <Badge ton="alerte">Rupture</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground tnum">
                            {fcfa(plat.prix)}
                          </span>
                        </div>
                        {plat.rupture ? (
                          <span className="text-xs text-muted-foreground">
                            Bientôt
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="w-6 text-center font-display text-sm font-semibold tnum">
                              {panier.find((l) => l.platId === plat.id)?.qte ?? 0}
                            </span>
                            <button
                              type="button"
                              aria-label={`Ajouter ${plat.nom}`}
                              onClick={() => ajouter(plat.id, plat.nom, plat.prix)}
                              className="flex size-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary transition-transform duration-200 ease-[var(--ease-spring)] active:scale-90"
                            >
                              <PlusIcon className="size-4" />
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </section>

        {/* Confirmation */}
        {commande && (
          <Card className="animate-rise mt-8 border-success/30 bg-success/8">
            <div className="flex flex-col gap-1">
              <Badge ton="succes">Commande reçue par le restaurant</Badge>
              <h2 className="font-display mt-2 text-xl font-semibold">
                Jërëjëf, {utilisateur?.nom.split(' ')[0]} !
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Référence <span className="font-semibold text-foreground">{commande.ref}</span>
                {' · '}
                {fcfa(commande.total)}
                {commande.pointsGagnes > 0 && (
                  <>
                    {' · '}
                    <span className="font-medium text-success">
                      +{commande.pointsGagnes} points fidélité
                    </span>
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setCommande(null)}
                className="mt-3 self-start text-xs font-medium text-primary hover:underline"
              >
                Commander encore
              </button>
            </div>
          </Card>
        )}

        {erreur && (
          <p className="mt-6 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            {erreur}
          </p>
        )}
      </main>

      {/* Barre panier flottante */}
      {nombrePlats > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setPanierOuvert(true)}
            className="animate-rise mx-auto flex w-full max-w-xl items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 text-primary-foreground shadow-xl transition-transform duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
          >
            <ShoppingBagIcon className="size-5 shrink-0" />
            <span className="text-sm font-medium">
              {nombrePlats} plat{nombrePlats > 1 ? 's' : ''}
            </span>
            <span className="ml-auto font-display text-base font-semibold tnum">
              {fcfa(total)}
            </span>
          </button>
        </div>
      )}

      {/* Feuille panier */}
      <Sheet
        ouvert={panierOuvert}
        onFermer={() => setPanierOuvert(false)}
        titre="Ta commande"
        sous="La cuisine reçoit la commande immédiatement."
        pied={
          <button
            type="button"
            onClick={commander}
            disabled={envoi || panier.length === 0}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-60"
          >
            {envoi ? (
              <LoaderIcon className="size-4 animate-spin" />
            ) : (
              <>
                Commander · {fcfa(total)}
              </>
            )}
          </button>
        }
      >
        {panier.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ton panier est vide.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {panier.map((ligne) => (
              <li key={ligne.platId} className="flex items-center gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{ligne.nom}</span>
                  <span className="text-xs text-muted-foreground tnum">
                    {fcfa(ligne.prix)} × {ligne.qte}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Retirer un ${ligne.nom}`}
                    onClick={() => retirer(ligne.platId)}
                    className="flex size-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground active:scale-90"
                  >
                    <MinusIcon className="size-3.5" />
                  </button>
                  <span className="w-6 text-center font-display text-sm font-semibold tnum">
                    {ligne.qte}
                  </span>
                  <button
                    type="button"
                    aria-label={`Ajouter un ${ligne.nom}`}
                    onClick={() => ajouter(ligne.platId, ligne.nom, ligne.prix)}
                    className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary active:scale-90"
                  >
                    <PlusIcon className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </div>
  )
}
