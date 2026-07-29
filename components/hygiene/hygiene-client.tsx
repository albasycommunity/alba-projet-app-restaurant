'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  CameraIcon,
  CheckIcon,
  ClipboardCheckIcon,
  FileTextIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ThermometerIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import {
  MOMENTS,
  RESTAURANT,
  momentCourant,
  type MomentService,
  type TacheHaccp,
} from '@/lib/data'
import { useAlba, vibrer } from '@/lib/store'
import {
  Badge,
  Card,
  CardTitle,
  Contenu,
  PageHeader,
  Progress,
  Segments,
  Sheet,
  StatTile,
  Stepper,
} from '@/components/kit'
import { cn } from '@/lib/utils'

/** Les preuves photo vivent le temps du service, pas dans le stockage local. */
type Preuves = Record<string, string>

/**
 * Hygiène. Un seul geste par tâche : photo, valeur, validé. Le registre
 * s'imprime tel quel si un contrôleur se présente.
 */
export function HygieneClient() {
  const { etat, envoyer, notifier } = useAlba()
  const [moment, setMoment] = useState<MomentService>('Matin')
  const [ouverte, setOuverte] = useState<TacheHaccp | null>(null)
  const [preuves, setPreuves] = useState<Preuves>({})
  const [registre, setRegistre] = useState(false)

  // On ouvre sur le service en cours : c'est là que se trouve le travail.
  useEffect(() => {
    setMoment(momentCourant())
  }, [])

  const parMoment = useMemo(() => {
    const groupes = new Map<MomentService, TacheHaccp[]>()
    for (const m of MOMENTS) groupes.set(m, [])
    for (const t of etat.haccp) groupes.get(t.moment)?.push(t)
    return groupes
  }, [etat.haccp])

  const taches = parMoment.get(moment) ?? []
  const faites = etat.haccp.filter((t) => t.faite).length
  const conformite = Math.round((faites / Math.max(1, etat.haccp.length)) * 100)
  const critiquesOuverts = etat.haccp.filter((t) => t.critique && !t.faite)

  const horsPlage = etat.haccp.filter(
    (t) =>
      t.faite &&
      t.mesure &&
      t.valeur !== undefined &&
      (t.valeur > t.mesure.max ||
        (t.mesure.min !== undefined && t.valeur < t.mesure.min)),
  )

  return (
    <div className="flex flex-col gap-6 pb-6">
      <PageHeader
        titre="Hygiène"
        sous="Les relevés du jour, avec la preuve et l’heure. De quoi recevoir un contrôle sans transpirer."
        action={
          <button
            type="button"
            onClick={() => setRegistre(true)}
            className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-transform duration-300 ease-[var(--ease-spring)] hover:scale-[1.03]"
          >
            <FileTextIcon className="size-4" />
            Registre du jour
          </button>
        }
      />

      <Contenu className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          libelle="Conformité"
          icone={<ShieldCheckIcon className="size-3.5" />}
          valeur={`${conformite} %`}
          detail={`${faites} relevés sur ${etat.haccp.length}`}
          ton={conformite === 100 ? 'succes' : conformite >= 60 ? 'neutre' : 'alerte'}
        />
        <StatTile
          libelle="Points critiques"
          icone={<TriangleAlertIcon className="size-3.5" />}
          valeur={String(critiquesOuverts.length)}
          detail="bloquants pour le service"
          ton={critiquesOuverts.length > 0 ? 'alerte' : 'succes'}
        />
        <StatTile
          libelle="Hors plage"
          icone={<ThermometerIcon className="size-3.5" />}
          valeur={String(horsPlage.length)}
          detail="relevés à reprendre"
          ton={horsPlage.length > 0 ? 'alerte' : 'succes'}
        />
        <StatTile
          libelle="Traçabilité"
          icone={<ClipboardCheckIcon className="size-3.5" />}
          valeur={String(etat.stock.filter((i) => i.lotRecu).length)}
          detail="lots fournisseurs suivis"
        />
      </Contenu>

      {critiquesOuverts.length > 0 && (
        <Contenu>
          <Card className="animate-halo border-destructive/30 bg-destructive/6 flex items-center gap-3">
            <TriangleAlertIcon className="size-5 shrink-0 text-destructive" />
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-pretty">
              <span className="font-medium">
                {critiquesOuverts.length} point
                {critiquesOuverts.length > 1 ? 's' : ''} critique
                {critiquesOuverts.length > 1 ? 's' : ''} à relever
              </span>{' '}
              <span className="text-muted-foreground">
                — {critiquesOuverts.map((t) => t.libelle).join(', ')}.
              </span>
            </p>
          </Card>
        </Contenu>
      )}

      <Contenu>
        <Segments
          valeur={moment}
          onChange={setMoment}
          options={MOMENTS.map((m) => ({
            valeur: m,
            libelle: m,
            compte: (parMoment.get(m) ?? []).filter((t) => !t.faite).length,
          }))}
        />
      </Contenu>

      <Contenu className="grid gap-3 lg:grid-cols-2">
        {taches.map((t, index) => (
          <CarteTache
            key={t.id}
            tache={t}
            preuve={preuves[t.id]}
            index={index}
            onOuvrir={() => setOuverte(t)}
            onAnnuler={() => {
              envoyer({ type: 'haccpAnnuler', id: t.id })
              setPreuves((p) => {
                const suite = { ...p }
                delete suite[t.id]
                return suite
              })
            }}
          />
        ))}
      </Contenu>

      <Contenu>
        <Card>
          <CardTitle
            aside={
              <span className="text-[11px] text-muted-foreground">
                dernier lot reçu par produit
              </span>
            }
          >
            Traçabilité fournisseurs
          </CardTitle>
          <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
            {etat.stock.map((i) => (
              <li
                key={i.id}
                className="flex items-baseline gap-2 border-b border-border py-2 last:border-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{i.nom}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {i.lotRecu ?? '—'}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {i.fournisseur}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Contenu>

      <FeuilleValidation
        tache={ouverte}
        onFermer={() => setOuverte(null)}
        onValider={(valeur, photo) => {
          if (!ouverte) return
          if (photo) setPreuves((p) => ({ ...p, [ouverte.id]: photo }))
          envoyer({
            type: 'haccpValider',
            id: ouverte.id,
            par: RESTAURANT.gerante,
            valeur,
            photo: Boolean(photo),
          })
          const mesure = ouverte.mesure
          const derive =
            mesure &&
            valeur !== undefined &&
            (valeur > mesure.max ||
              (mesure.min !== undefined && valeur < mesure.min))
          notifier({
            ton: derive ? 'alerte' : 'succes',
            titre: derive
              ? `${ouverte.libelle} hors plage`
              : `${ouverte.libelle} validé`,
            detail: derive
              ? `${valeur} ${mesure?.unite} relevés. Corrige puis refais le relevé.`
              : 'Horodaté et signé. Le registre est à jour.',
          })
          vibrer(derive ? [16, 60, 16] : 12)
          setOuverte(null)
        }}
      />

      <Registre
        ouvert={registre}
        onFermer={() => setRegistre(false)}
        preuves={preuves}
      />
    </div>
  )
}

/* ------------------------------ Carte tâche ------------------------------ */

function CarteTache({
  tache,
  preuve,
  index,
  onOuvrir,
  onAnnuler,
}: {
  tache: TacheHaccp
  preuve?: string
  index: number
  onOuvrir: () => void
  onAnnuler: () => void
}) {
  const derive =
    tache.mesure &&
    tache.valeur !== undefined &&
    (tache.valeur > tache.mesure.max ||
      (tache.mesure.min !== undefined && tache.valeur < tache.mesure.min))

  return (
    <Card
      className={cn(
        'animate-rise flex flex-col gap-3',
        tache.faite && !derive && 'border-success/25 bg-success/5',
        derive && 'border-destructive/30 bg-destructive/6',
        !tache.faite && tache.critique && 'border-warning/30',
      )}
      style={{ animationDelay: `${index * 45}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl',
            tache.faite && !derive
              ? 'bg-success/15 text-success'
              : derive
                ? 'bg-destructive/15 text-destructive'
                : 'bg-secondary text-muted-foreground',
          )}
        >
          {tache.faite && !derive ? (
            <svg
              viewBox="0 0 24 24"
              className="animate-coche size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : tache.mesure ? (
            <ThermometerIcon className="size-5" />
          ) : (
            <ClipboardCheckIcon className="size-5" />
          )}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold tracking-tight">
              {tache.libelle}
            </h3>
            {tache.critique && !tache.faite && (
              <Badge ton="attention">point critique</Badge>
            )}
            {derive && <Badge ton="alerte">hors plage</Badge>}
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            {tache.detail}
          </p>
          {tache.faite && (
            <p className="text-[11px] text-muted-foreground tnum">
              {tache.heure} · {tache.par}
              {tache.valeur !== undefined &&
                tache.mesure &&
                ` · ${tache.valeur} ${tache.mesure.unite}`}
              {tache.photo && ' · photo au dossier'}
            </p>
          )}
        </div>

        {preuve && (
          <Image
            src={preuve}
            alt={`Preuve photo — ${tache.libelle}`}
            width={56}
            height={56}
            unoptimized
            className="size-14 shrink-0 rounded-lg border border-border object-cover"
          />
        )}
      </div>

      {tache.faite ? (
        <button
          type="button"
          onClick={onAnnuler}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcwIcon className="size-4" />
          Refaire le relevé
        </button>
      ) : (
        <button
          type="button"
          onClick={onOuvrir}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-3.5 font-display text-sm font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.97]"
        >
          <CameraIcon className="size-4" />
          {tache.mesure ? 'Relever et photographier' : 'Valider avec photo'}
        </button>
      )}
    </Card>
  )
}

/* --------------------------- Feuille validation --------------------------- */

function FeuilleValidation({
  tache,
  onFermer,
  onValider,
}: {
  tache: TacheHaccp | null
  onFermer: () => void
  onValider: (valeur: number | undefined, photo?: string) => void
}) {
  const [valeur, setValeur] = useState(0)
  const [photo, setPhoto] = useState<string | undefined>()
  const champ = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!tache) return
    setPhoto(undefined)
    // On propose le milieu de la plage : le geste par défaut est conforme.
    if (tache.mesure) {
      const { min, max } = tache.mesure
      setValeur(min !== undefined ? Math.round((min + max) / 2) : max)
    } else {
      setValeur(0)
    }
  }, [tache])

  const conforme =
    !tache?.mesure ||
    (valeur <= tache.mesure.max &&
      (tache.mesure.min === undefined || valeur >= tache.mesure.min))

  return (
    <Sheet
      ouvert={tache !== null}
      onFermer={onFermer}
      titre={tache?.libelle ?? ''}
      sous={
        tache?.mesure
          ? `Plage conforme : ${
              tache.mesure.min !== undefined ? `${tache.mesure.min} à ` : '≤ '
            }${tache.mesure.max} ${tache.mesure.unite}`
          : 'La photo et l’heure suffisent comme preuve.'
      }
      pied={
        tache && (
          <button
            type="button"
            onClick={() => onValider(tache.mesure ? valeur : undefined, photo)}
            disabled={!photo}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-display text-base font-semibold transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98] disabled:opacity-40',
              conforme
                ? 'bg-primary text-primary-foreground'
                : 'bg-destructive text-destructive-foreground',
            )}
          >
            <CheckIcon className="size-5" />
            {photo
              ? conforme
                ? 'Valider le relevé'
                : 'Enregistrer la non-conformité'
              : 'Prends d’abord la photo'}
          </button>
        )
      }
    >
      {tache && (
        <div className="flex flex-col gap-4">
          {tache.mesure && (
            <div
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-4',
                conforme
                  ? 'border-success/25 bg-success/6'
                  : 'animate-shake border-destructive/30 bg-destructive/8',
              )}
            >
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {tache.mesure.libelle}
              </span>
              <Stepper
                libelle={tache.mesure.libelle}
                valeur={valeur}
                unite={` ${tache.mesure.unite}`}
                pas={1}
                min={-30}
                max={200}
                onChange={setValeur}
              />
              <p
                className={cn(
                  'text-center text-xs font-medium',
                  conforme ? 'text-success' : 'text-destructive',
                )}
              >
                {conforme
                  ? 'Dans la plage. Rien à corriger.'
                  : 'Hors plage — note-le quand même, la traçabilité compte plus que le score.'}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Preuve photo
            </span>
            {photo ? (
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Image
                  src={photo}
                  alt="Preuve photo du relevé"
                  width={64}
                  height={64}
                  unoptimized
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground">
                  Photo attachée. Elle sera horodatée à la validation.
                </p>
                <button
                  type="button"
                  onClick={() => champ.current?.click()}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:underline"
                >
                  Reprendre
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => champ.current?.click()}
                className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary/40"
              >
                <CameraIcon className="size-7 text-primary" />
                <span className="text-sm font-medium">
                  Prendre la photo du relevé
                </span>
                <span className="text-xs text-muted-foreground">
                  L’appareil s’ouvre directement, pas de galerie à fouiller.
                </span>
              </button>
            )}
            <input
              ref={champ}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Photo du relevé"
              onChange={(e) => {
                const fichier = e.target.files?.[0]
                if (!fichier) return
                const lecteur = new FileReader()
                lecteur.onload = () => setPhoto(String(lecteur.result))
                lecteur.readAsDataURL(fichier)
                vibrer(10)
              }}
            />
          </div>
        </div>
      )}
    </Sheet>
  )
}

/* -------------------------------- Registre -------------------------------- */

function Registre({
  ouvert,
  onFermer,
  preuves,
}: {
  ouvert: boolean
  onFermer: () => void
  preuves: Record<string, string>
}) {
  const { etat } = useAlba()
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const faites = etat.haccp.filter((t) => t.faite)

  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onFermer}
      large
      titre="Registre HACCP du jour"
      sous="Prêt à présenter. « Imprimer » produit aussi le PDF à envoyer."
      pied={
        <button
          type="button"
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-4 font-display text-base font-semibold text-primary-foreground transition-transform duration-200 ease-[var(--ease-spring)] active:scale-[0.98]"
        >
          <FileTextIcon className="size-5" />
          Imprimer / enregistrer en PDF
        </button>
      }
    >
      <div id="registre-imprimable" className="flex flex-col gap-5">
        <header className="flex flex-col gap-1 border-b border-border pb-3">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            {RESTAURANT.nom} — {RESTAURANT.quartier}
          </h3>
          <p className="text-sm text-muted-foreground">
            Registre des autocontrôles · {date}
          </p>
          <p className="text-xs text-muted-foreground">
            Responsable : {RESTAURANT.gerante} · {faites.length} relevé
            {faites.length > 1 ? 's' : ''} sur {etat.haccp.length}
          </p>
        </header>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Taux de conformité</span>
            <span className="tnum">
              {Math.round((faites.length / Math.max(1, etat.haccp.length)) * 100)} %
            </span>
          </div>
          <Progress
            valeur={(faites.length / Math.max(1, etat.haccp.length)) * 100}
            ton={faites.length === etat.haccp.length ? 'succes' : 'attention'}
          />
        </div>

        {MOMENTS.map((m) => {
          const liste = etat.haccp.filter((t) => t.moment === m)
          if (liste.length === 0) return null
          return (
            <section key={m} className="flex flex-col gap-2">
              <h4 className="font-display text-sm font-semibold tracking-tight">
                {m}
              </h4>
              <ul className="flex flex-col divide-y divide-border">
                {liste.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 py-2">
                    <span
                      className={cn(
                        'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        t.faite
                          ? 'bg-success/20 text-success'
                          : 'bg-secondary text-muted-foreground',
                      )}
                      aria-hidden="true"
                    >
                      {t.faite ? '✓' : '—'}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium">{t.libelle}</span>
                      <span className="text-[11px] text-muted-foreground tnum">
                        {t.faite
                          ? `${t.heure} · ${t.par}${
                              t.valeur !== undefined && t.mesure
                                ? ` · ${t.valeur} ${t.mesure.unite}`
                                : ''
                            }${t.photo ? ' · photo' : ''}`
                          : 'non réalisé'}
                      </span>
                    </div>
                    {preuves[t.id] && (
                      <Image
                        src={preuves[t.id]}
                        alt={`Preuve — ${t.libelle}`}
                        width={40}
                        height={40}
                        unoptimized
                        className="size-10 shrink-0 rounded border border-border object-cover"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        <section className="flex flex-col gap-2">
          <h4 className="font-display text-sm font-semibold tracking-tight">
            Lots réceptionnés
          </h4>
          <ul className="flex flex-col divide-y divide-border">
            {etat.stock
              .filter((i) => i.lotRecu)
              .map((i) => (
                <li key={i.id} className="flex items-baseline gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm">{i.nom}</span>
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {i.lotRecu}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {i.fournisseur}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </Sheet>
  )
}
