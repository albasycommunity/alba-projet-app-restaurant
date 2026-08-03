-- Compteur de commandes ATOMIQUE : UPDATE ... RETURNING dans une seule
-- instruction SQL — aucun lire-puis-écrire côté application, donc pas de
-- race condition entre instances serverless concurrentes.
create or replace function incrementer_compteur(
  p_cle text,
  p_quantite integer default 1
)
returns integer
language sql
volatile
as $$
  update compteurs
  set valeur = valeur + p_quantite
  where cle = p_cle
  returning valeur;
$$;

-- ---------------------------------------------------------------
-- Rate-limiting en base de données (remplace la Map en mémoire,
-- inefficace en multi-instance serverless).
-- Chaque clé = une ligne : fenêtre fixe par clé, incrément atomique.
-- ---------------------------------------------------------------
create table if not exists rate_limits (
  cle text primary key,
  -- Nombre de requêtes dans la fenêtre courante.
  compte integer not null default 0,
  -- Fin de fenêtre courante (epoch ms).
  reinitialise_a bigint not null
);

alter table rate_limits enable row level security;

-- Aucune policy : accès uniquement via service_role (comme le reste).

-- Incrément ATOMIQUE de la fenêtre : une seule instruction UPDATE verrouille
-- la ligne — deux requêtes simultanées ne peuvent pas doubler le compteur.
-- Retourne 1 si la requête est autorisée (compte <= max), 0 sinon.
create or replace function incremente_rate_limit(
  p_cle text,
  p_fenetre_ms bigint,
  p_max integer
)
returns integer
language plpgsql
volatile
as $$
declare
  maintenant_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_compte integer;
begin
  -- Nouvelle clé : fenêtre complète démarrant maintenant.
  insert into rate_limits (cle, compte, reinitialise_a)
  values (p_cle, 0, maintenant_ms + p_fenetre_ms)
  on conflict (cle) do nothing;

  update rate_limits
  set
    compte = case
      when reinitialise_a <= maintenant_ms then 1
      else compte + 1
    end,
    reinitialise_a = case
      when reinitialise_a <= maintenant_ms then maintenant_ms + p_fenetre_ms
      else reinitialise_a
    end
  where cle = p_cle
  returning compte into v_compte;

  if v_compte <= p_max then
    return 1;
  end if;
  return 0;
end;
$$;
