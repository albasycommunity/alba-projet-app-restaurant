'use client'

import { PlusIcon, ShieldCheckIcon } from 'lucide-react'

const FAQ = [
  {
    q: 'Est-ce que ça marche vraiment sans connexion ?',
    r: "Oui. Alba écrit d'abord en local : encaisser, servir, ajuster le stock — rien de vital ne dépend du réseau. Dès que la connexion revient, tout se synchronise automatiquement. C'est le principe offline-first, pensé pour les coupures comme pour les zones mal couvertes.",
  },
  {
    q: 'Combien ça coûte ?',
    r: "Le compte client est gratuit. Le back-office restaurant est à 25 000 F par mois, sans engagement, ou 250 000 F par an (2 mois offerts). Le paiement se fait par Wave, Orange Money, Free Money ou espèces.",
  },
  {
    q: 'Pour quel type de restaurant ?',
    r: "Terrasse, salon de thé, cantine, restaurant gastronomique : Alba s'adapte à la taille de l'équipe et du service. Un téléphone ou une tablette suffisent pour commencer.",
  },
  {
    q: 'Mes données sont-elles protégées ?',
    r: "Chaque mot de passe est haché, les sessions sont limitées à 24 h et les permissions sont vérifiées au serveur à chaque requête — jamais seulement dans l'interface. Chaque restaurant n'accède qu'à ses propres données.",
  },
  {
    q: "Puis-je essayer avant de m'abonner ?",
    r: "Oui : crée un compte client gratuit et explore la plateforme. L'abonnement ne se déclenche que quand tu es prêt à ouvrir le back-office de ton établissement.",
  },
  {
    q: 'Faut-il un matériel spécifique ?',
    r: 'Non. Un smartphone Android ou un iPhone suffisent pour la salle et la cuisine ; un ordinateur est un plus pour le pilotage. Tout est conçu pour le tactile, une main, en pleine rush.',
  },
]

export function FoireAuxQuestions() {
  return (
    <section id="faq" className="relative scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            FAQ
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Les questions qu'on nous pose
          </h2>
        </div>

        <div className="mt-10 flex flex-col gap-2.5">
          {FAQ.map((f) => (
            <details
              key={f.q}
              className="faq group rounded-2xl border border-border bg-card/60 transition-colors duration-300 open:border-primary/30 open:bg-card"
            >
              <summary className="flex items-center gap-3 px-5 py-4">
                <span className="flex-1 text-sm font-medium sm:text-[15px]">
                  {f.q}
                </span>
                <span className="faq-icone flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 text-muted-foreground group-hover:text-foreground">
                  <PlusIcon className="size-4" />
                </span>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                  {f.r}
                </p>
              </div>
            </details>
          ))}
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-3.5 text-success" />
          Autre question ? Écris-nous, on répond en moins de 24 h.
        </p>
      </div>
    </section>
  )
}
