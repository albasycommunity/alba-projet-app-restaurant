import { CheckCircle2Icon, PlayCircleIcon, Settings2Icon, UserPlusIcon } from 'lucide-react'

const ETAPES = [
  {
    titre: '1. Créez votre compte',
    texte: "En 30 secondes, sans carte bancaire ni engagement. Vous accédez immédiatement à votre espace gérant.",
    i: UserPlusIcon,
  },
  {
    titre: '2. Configurez votre carte',
    texte: "Ajoutez vos plats, définissez vos prix et configurez les rôles de votre équipe. Tout est guidé.",
    i: Settings2Icon,
  },
  {
    titre: '3. Encaissez le premier ticket',
    texte: "Le service démarre. Les commandes partent en cuisine, le stock se met à jour, et vos chiffres remontent en temps réel.",
    i: PlayCircleIcon,
  },
]

export function CommentCaMarche() {
  return (
    <section className="relative py-20 sm:py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-medium tracking-[0.22em] text-primary uppercase">
            Mise en route
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Prêt à encaisser en 5 minutes
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            Pas besoin de technicien ni de formation longue. Alba est pensé pour que vous puissiez démarrer le jour même.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-4 lg:gap-8">
          {ETAPES.map((etape, i) => {
            const I = etape.i
            return (
              <div key={etape.titre} className="relative flex flex-col items-center text-center">
                {/* Ligne connectrice (sauf dernier) */}
                {i !== ETAPES.length - 1 && (
                  <div className="absolute top-8 left-1/2 hidden w-full border-t-2 border-dashed border-border/60 md:block" />
                )}
                
                <span className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-[0_8px_20px_-10px_oklch(0.65_0.16_38/0.7)] mb-6 z-10">
                  <I className="size-7" />
                </span>
                
                <h3 className="font-display text-lg font-semibold tracking-tight">
                  {etape.titre}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty max-w-xs">
                  {etape.texte}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
