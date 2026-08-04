-- Sprint 1 — Mode « decouverte » : l'essai gratuit temporel (15 jours,
-- statut `essai`) est remplacé par une découverte illimitée (statut
-- `decouverte`), comptée en actions réelles (decouverte_actions_restantes).

-- 1. Retire l'ancienne contrainte (Postgres auto-nomme <table>_<colonne>_check).
alter table public.abonnements drop constraint if exists abonnements_statut_check;

-- 2. Recrée la contrainte avec la nouvelle liste de statuts.
alter table public.abonnements
  add constraint abonnements_statut_check
  check (statut in ('actif','decouverte','expire','en_attente'));

-- 3. Compteur d'actions de découverte (3 actions offertes).
alter table public.abonnements
  add column if not exists decouverte_actions_restantes integer not null default 3;

-- 4. Migration des abonnements existants : essai → decouverte (c'est la
--    migration qui migre les données, jamais le code).
update public.abonnements set statut = 'decouverte' where statut = 'essai';
