'use client'

/**
 * Onboarding découverte (Sprint 5) — tout ce que voit le gérant qui
 * découvre Alba : modal d'entrée, guide pas-à-pas, rappel discret,
 * moment de complétion. Le serveur calcule la progression (UN seul
 * aller-retour) ; ici on ne fait qu'afficher.
 *
 * Fail-closed : un restaurant masqué (ou un compte non admin) reçoit
 * `visible:false` et cette couche ne rend strictement rien.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowRightIcon,
  ChartPieIcon,
  ChefHatIcon,
  CheckIcon,
  PackageSearchIcon,
  PartyPopperIcon,
  ReceiptTextIcon,
  SparklesIcon,
  StoreIcon,
  UsersIcon,
} from 'lucide-react'
import {
  ETAPES_ONBOARDING,
  Role,
  TOTAL_ETAPES_ONBOARDING,
  type EtapeOnboarding,
  type ProgressionOnboarding,
} from '@/lib/auth'
import { Badge, Progress, Sheet } from '@/components/kit'
import { useAuth } from '@/lib/auth-contexte'
import { useAlba } from '@/lib/store'
import { useMenu } from '@/components/menu-store'
import { cn } from '@/lib/utils'

/** Clés sessionStorage : le choix « Plus tard » ne vaut que pour l'onglet. */
const CLE_FERME = 'alba:onboarding:ferme'
const CLE_FINI = 'alba:onboarding:fini'

/**
 * Signal local : une action annonce que l'état a pu changer (membre créé,
 * pilotage consulté…) — l'orchestrateur l'écoute pour se rafraîchir sans
 * attendre une navigation.
 */
export const EVENEMENT_ONBOARDING_RAFRAICHIR = 'alba:onboarding:rafraichir'

const ICONES: Record<EtapeOnboarding, typeof StoreIcon> = {
  profil: StoreIcon,
  plat: ChefHatIcon,
  vente: ReceiptTextIcon,
  stock: PackageSearchIcon,
  equipe: UsersIcon,
  stats: ChartPieIcon,
}

/**
 * « Y aller » mène à la section concernée : un lien, ou un ancrage de la
 * même page (menu / personnel — le guide s'ouvre depuis le back-office).
 * L'étape « profil » n'a pas de cible : elle est déjà accomplie à
 * l'inscription (nom + quartier) et aucun écran ne permet encore de la
 * modifier — pas de lien d'action sur une étape déjà faite.
 */
const CIBLES: Record<EtapeOnboarding, string> = {
  profil: '',
  plat: '#gestion-menu',
  vente: '/caisse',
  stock: '/stock',
  equipe: '#personnel',
  stats: '/pilotage',
}

const LIBELLES: Record<EtapeOnboarding, string> = {
  profil: 'Ta fiche restaurant',
  plat: 'Ton premier plat',
  vente: 'Ta première vente',
  stock: 'Ton premier ingrédient',
  equipe: 'Un membre dans l’équipe',
  stats: 'Tes chiffres du jour',
}

const DETAILS: Record<EtapeOnboarding, string> = {
  profil: 'Nom et quartier renseignés, pour que ta vitrine te ressemble.',
  plat: 'Ajoute un plat à ta carte — il apparaît immédiatement sur la carte client.',
  vente: 'Encaisser un ticket, c’est la vraie mécanique Alba.',
  stock: 'Ajoute au moins un ingrédient — l’app peut alors te dire ce qui va manquer.',
  equipe: 'Crée un compte pour ta caissière ou ton cuisinier, avec les zones qu’il doit voir.',
  stats: 'CA, tickets, marges : jette un œil au pilotage.',
}

/**
 * Lit la progression en cours (restaurant admin uniquement). Utilisé par
 * le back-office pour mettre en avant les étapes du parcours — le
 * serveur reste l'autorité du calcul, ici on ne fait que lire.
 */
export function useProgressionOnboarding(): ProgressionOnboarding | null {
  const { utilisateur } = useAuth()
  const { plats } = useMenu()
  const { etat } = useAlba()
  const [progression, setProgression] =
    useState<ProgressionOnboarding | null>(null)

  const admin = utilisateur?.role === Role.RESTAURANT_ADMIN
  const platCree = plats.some((p) => p.cree)
  const venteEncaisee = etat.commandes.some((c) => c.id.startsWith('local-'))
  // IC-05 : le stock est considéré configuré dès qu'au moins un ingrédient
  // a été ajouté dans la session locale (état non vide).
  const stockConfigure = etat.stock.length > 0

  useEffect(() => {
    if (!admin) return
    let annule = false
    const url = `/api/back-office/onboarding?platCree=${platCree ? '1' : '0'}&venteEncaisee=${venteEncaisee ? '1' : '0'}&stockConfigure=${stockConfigure ? '1' : '0'}`
    const charger = () =>
      fetch(url, { cache: 'no-store' })
        .then((r) => (r.ok ? (r.json() as Promise<ProgressionOnboarding>) : null))
        .then((d) => {
          if (!annule && d) setProgression(d)
        })
        .catch(() => {
          // réseau coupé : on garde la dernière progression connue
        })
    charger()
    const surSignal = () => charger()
    window.addEventListener(EVENEMENT_ONBOARDING_RAFRAICHIR, surSignal)
    return () => {
      annule = true
      window.removeEventListener(EVENEMENT_ONBOARDING_RAFRAICHIR, surSignal)
    }
  }, [admin, platCree, venteEncaisee, stockConfigure])

  return progression
}

/**
 * Orchestrateur monté dans l'espace restaurant (layout) — toujours vivant
 * pour capter le moment où la 5ᵉ étape tombe, où que soit le gérant.
 * Rendu visible uniquement sur le back-office (modal + rappel) ; le
 * moment de complétion, lui, peut surgir sur n'importe quelle page.
 */
export function OnboardingDecouverte() {
  const pathname = usePathname()
  const router = useRouter()
  const { utilisateur, abonnement } = useAuth()
  const { plats } = useMenu()
  const { etat } = useAlba()

  const [progression, setProgression] =
    useState<ProgressionOnboarding | null>(null)
  const [guideOuvert, setGuideOuvert] = useState(false)
  const [felicites, setFelicites] = useState(false)
  const [dejaFerme, setDejaFerme] = useState(false)
  const [presente, setPresente] = useState(false)
  const fete = useRef(false)
  const redirectionPlans = useRef<number | null>(null)

  const admin = utilisateur?.role === Role.RESTAURANT_ADMIN
  const platCree = plats.some((p) => p.cree)
  const venteEncaisee = etat.commandes.some((c) => c.id.startsWith('local-'))

  const rafraichir = useCallback(async () => {
    if (!admin) return
    try {
      const url = `/api/back-office/onboarding?platCree=${platCree ? '1' : '0'}&venteEncaisee=${venteEncaisee ? '1' : '0'}`
      const reponse = await fetch(url, { cache: 'no-store' })
      if (reponse.ok) {
        setProgression((await reponse.json()) as ProgressionOnboarding)
      }
    } catch {
      // réseau coupé : on garde la dernière progression connue
    }
  }, [admin, platCree, venteEncaisee])

  // Chargement initial + chaque navigation (une action = un changement de
  // page) + retour sur l'onglet (une vente peut être encaissée ailleurs).
  useEffect(() => {
    rafraichir()
  }, [rafraichir, pathname])

  useEffect(() => {
    const surFocus = () => rafraichir()
    const surSignal = () => rafraichir()
    window.addEventListener('focus', surFocus)
    window.addEventListener(EVENEMENT_ONBOARDING_RAFRAICHIR, surSignal)
    return () => {
      window.removeEventListener('focus', surFocus)
      window.removeEventListener(EVENEMENT_ONBOARDING_RAFRAICHIR, surSignal)
    }
  }, [rafraichir])

  // « Plus tard » ne vaut que pour la fenêtre de l'onglet : la prochaine
  // session (nouvel onglet) rouvre le guide à l'atterrissage.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(CLE_FERME) === '1') {
        setDejaFerme(true)
      }
    } catch {
      // pas de sessionStorage : le guide se rouvrira à chaque atterrissage
    }
  }, [])

  const visible = progression?.visible === true
  const accomplies = progression?.accomplies ?? 0
  const enCours = visible && accomplies < TOTAL_ETAPES_ONBOARDING
  const etapes = progression?.etapes

  // Modal d'entrée : à l'atterrissage sur le back-office, une seule fois
  // par session (le parcours ne bloque jamais rien — il s'ouvre en douce).
  // Une fois présenté, on ne rouvre plus tout seul : la bande de rappel
  // (« Reprendre le guide ») prend le relais.
  useEffect(() => {
    if (pathname !== '/back-office') return
    if (!enCours || guideOuvert || felicites || dejaFerme || presente) return
    const id = window.setTimeout(() => {
      setPresente(true)
      setGuideOuvert(true)
    }, 600)
    return () => window.clearTimeout(id)
  }, [pathname, enCours, guideOuvert, felicites, dejaFerme, presente])

  // Moment de complétion : la 5ᵉ étape tombe, où que soit le gérant —
  // une seule fois par session, jamais deux. Après le « Bravo », on
  // l'emmène automatiquement vers les plans (le but du parcours).
  useEffect(() => {
    if (!visible || accomplies < TOTAL_ETAPES_ONBOARDING) return
    setGuideOuvert(false)
    if (fete.current) return
    fete.current = true
    try {
      if (window.sessionStorage.getItem(CLE_FINI) === '1') return
      window.sessionStorage.setItem(CLE_FINI, '1')
    } catch {
      // pas de sessionStorage : on fête quand même une fois
    }
    setFelicites(true)
    redirectionPlans.current = window.setTimeout(
      () => router.push('/abonnement/renouveler?source=parcours'),
      3500,
    )
  }, [visible, accomplies, router])

  useEffect(
    () => () => {
      if (redirectionPlans.current !== null) {
        window.clearTimeout(redirectionPlans.current)
      }
    },
    [],
  )

  /** Fermer le Bravo sans attendre la redirection automatique. */
  function fermerFelicites() {
    if (redirectionPlans.current !== null) {
      window.clearTimeout(redirectionPlans.current)
      redirectionPlans.current = null
    }
    setFelicites(false)
  }

  function fermerTemporairement() {
    setDejaFerme(true)
    try {
      window.sessionStorage.setItem(CLE_FERME, '1')
    } catch {
      // sans sessionStorage, le guide se rouvrira à l'atterrissage
    }
    setGuideOuvert(false)
  }

  /** « Je connais déjà » / « Ne plus afficher » — sortie définitive. */
  async function sortirDefinitivement() {
    try {
      await fetch('/api/back-office/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'masquer', masque: true }),
      })
    } catch {
      // hors-ligne : on retire quand même l'interface pour la session
    }
    fermerTemporairement()
    setProgression((p) => (p ? { ...p, visible: false } : p))
  }

  /** Cible du guide : ancrage local (même page) ou navigation. Pour un
   *  ancrage, on attend que le Sheet soit réellement démonté (le modal
   *  verrouille le scroll de la page via `body.overflow`) : deux frames,
   *  puis scroll doux, avec repli instantané si le smooth n'a pas bougé. */
  function allerVers(cible: string) {
    setGuideOuvert(false)
    if (!cible) return
    if (cible.startsWith('#')) {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => {
          const cibleDom = document.getElementById(cible.slice(1))
          if (!cibleDom) return
          const avant = window.scrollY
          try {
            cibleDom.scrollIntoView({ behavior: 'smooth', block: 'start' })
          } catch {
            // navigateur sans smooth scroll : on y va d'un coup
            cibleDom.scrollIntoView({ behavior: 'auto', block: 'start' })
            return
          }
          // Repli : si le smooth est resté bloqué (scroll encore verrouillé,
          // comportement inexistant), on déplace d'un coup.
          window.setTimeout(() => {
            if (Math.abs(window.scrollY - avant) < 2) {
              document
                .getElementById(cible.slice(1))
                ?.scrollIntoView({ behavior: 'auto', block: 'start' })
            }
          }, 450)
        }),
      )
      return
    }
    router.push(cible)
  }

  const rappelVisible =
    pathname === '/back-office' && enCours && (dejaFerme || presente)

  if (!admin) return null

  const prochaine = (etapes
    ? ETAPES_ONBOARDING.find((cle) => !etapes[cle])
    : undefined) as EtapeOnboarding | undefined

  return (
    <>
      {rappelVisible && (
        <section className="px-4 pt-4 sm:px-6 lg:px-8">
          <div className="animate-rise flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4">
            <SparklesIcon className="size-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">
                  Découverte — {accomplies}/{TOTAL_ETAPES_ONBOARDING} étapes
                </p>
                <Badge ton="primaire">À ton rythme</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Reprends où tu en étais quand tu veux. Ça n’apparaîtra plus
                une fois terminé.
              </p>
              <Progress
                className="mt-2 max-w-xs"
                valeur={(accomplies / TOTAL_ETAPES_ONBOARDING) * 100}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setGuideOuvert(true)}
                className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
              >
                Reprendre le guide
              </button>
              <button
                type="button"
                onClick={sortirDefinitivement}
                className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              >
                Ne plus afficher
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Guide pas-à-pas — ne bloque jamais l'accès au back-office. */}
      <Sheet
        ouvert={guideOuvert}
        onFermer={fermerTemporairement}
        titre="Bienvenue dans Alba"
        sous="5 étapes pour prendre la main — le reste se découvrira tout seul."
        large
        pied={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={fermerTemporairement}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-secondary font-medium transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              Plus tard — je découvre par moi-même
            </button>
            <button
              type="button"
              onClick={sortirDefinitivement}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Je connais déjà Alba
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              « Plus tard » : le guide reviendra lors d’une prochaine
              visite. « Je connais déjà » : il ne sera plus jamais affiché.
            </p>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Progress
              className="flex-1"
              valeur={(accomplies / TOTAL_ETAPES_ONBOARDING) * 100}
              ton="primaire"
            />
            <span className="text-xs font-semibold text-muted-foreground tnum">
              {accomplies}/{TOTAL_ETAPES_ONBOARDING}
            </span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {etapes &&
              ETAPES_ONBOARDING.map((cle) => {
                const fait = etapes[cle]
                const prochain = !fait && cle === prochaine
                const Icone = ICONES[cle]
                const cible = CIBLES[cle]
                return (
                  <li
                    key={cle}
                    className={cn(
                      'rounded-xl border p-3.5 transition-colors',
                      fait
                        ? 'border-border bg-background/40'
                        : prochain
                          ? 'border-primary/40 bg-primary/8'
                          : 'border-border bg-background/60',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl',
                          fait
                            ? 'bg-success/15 text-success'
                            : prochain
                              ? 'bg-primary/15 text-primary'
                              : 'bg-secondary text-muted-foreground',
                        )}
                      >
                        {fait ? (
                          <CheckIcon className="size-5 animate-pop" />
                        ) : (
                          <Icone className="size-5" />
                        )}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              'text-sm font-semibold',
                              fait && 'text-muted-foreground',
                            )}
                          >
                            {LIBELLES[cle]}
                          </span>
                          {fait ? (
                            <Badge ton="succes">Fait</Badge>
                          ) : prochain ? (
                            <Badge ton="primaire">À faire</Badge>
                          ) : null}
                        </div>
                        <p
                          className={cn(
                            'text-xs leading-relaxed text-muted-foreground',
                            fait && 'opacity-70',
                          )}
                        >
                          {DETAILS[cle]}
                        </p>

                        {cle === 'vente' && !fait && (
                          <QuotaVente />
                        )}

                        {prochain && cible && (
                          <div className="mt-2">
                            <button
                              type="button"
                              onClick={() => allerVers(cible)}
                              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
                            >
                              Y aller
                              <ArrowRightIcon className="size-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      </Sheet>

      {/* Moment de complétion — une seule fois, jamais deux. L'essentiel :
          les plans à choisir maintenant que le parcours est terminé. */}
      <Sheet
        ouvert={felicites}
        onFermer={fermerFelicites}
        titre="Bravo, ton restaurant est prêt"
        sous="Les 5 étapes de découverte sont terminées — à toi de choisir ton plan."
        pied={
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                fermerFelicites()
                router.push('/abonnement/renouveler?source=parcours')
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition-all duration-300 ease-[var(--ease-spring)] active:scale-[0.98]"
            >
              Choisir mon plan
              <ArrowRightIcon className="size-4" />
            </button>
            <Link
              href="/caisse"
              onClick={fermerFelicites}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Ouvrir la caisse
            </Link>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          {/* Confettis brefs — 1,5 s, jamais plus */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {['bg-primary', 'bg-success', 'bg-warning', 'bg-accent'].map(
              (couleur, i) => (
                <span
                  key={i}
                  className={cn(
                    'animate-confetti absolute left-1/2 top-10 size-2.5 rounded-sm',
                    couleur,
                  )}
                  style={{ marginLeft: `${(i - 1.5) * 34}px`, animationDelay: `${i * 90}ms` }}
                />
              ),
            )}
          </div>
          <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success animate-pop">
            <PartyPopperIcon className="size-7" />
          </span>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">
            Ta fiche, ton menu, ta première vente, ton équipe, tes chiffres :
            tu as maintenant tout Alba entre les mains. Les données de
            démonstration restent là tant que tu es en découverte.
          </p>
        </div>
      </Sheet>
    </>
  )
}

/** Étape 3 : l'encaissement consomme une vraie action de découverte. */
function QuotaVente() {
  const { abonnement } = useAuth()
  const actionsRestantes = abonnement?.decouverteActionsRestantes ?? null
  // Hors mode découverte, pas de notion de quota : rien à afficher.
  if (actionsRestantes === null) return null
  if (actionsRestantes <= 0) {
    return (
      <p className="mt-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-warning">
        Actions réelles épuisées —{' '}
        <Link
          href="/abonnement/renouveler?raison=activation-requise"
          className="font-medium underline"
        >
          active ton abonnement
        </Link>{' '}
        pour encaisser.
      </p>
    )
  }
  return (
    <p className="mt-1.5 rounded-lg bg-warning/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-warning">
      Chaque encaissement consomme 1 action de découverte — il t’en reste{' '}
      <span className="font-semibold tnum">{actionsRestantes}/3</span>.
    </p>
  )
}

/**
 * Étape 5 : signaler que le pilotage a RÉELLEMENT été consulté — seul
 * flag du parcours (les autres étapes se déduisent des données). Posé
 * une seule fois, à la visite réelle de la page.
 */
export function PilotageConsulte() {
  const { utilisateur } = useAuth()
  const envoye = useRef(false)

  useEffect(() => {
    if (envoye.current) return
    if (utilisateur?.role !== Role.RESTAURANT_ADMIN) return
    envoye.current = true
    fetch('/api/back-office/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pilotage-consulte' }),
    })
      .catch(() => {
        // hors-ligne : on réessaiera à la prochaine visite
        envoye.current = false
      })
      .finally(() => {
        window.dispatchEvent(new Event(EVENEMENT_ONBOARDING_RAFRAICHIR))
      })
  }, [utilisateur?.role])

  return null
}