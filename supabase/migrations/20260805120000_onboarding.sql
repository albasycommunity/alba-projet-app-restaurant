-- Sprint 5 — Onboarding découverte : accompagner un gérant qui arrive
-- pour la première fois, sans jamais déranger les restaurants déjà en
-- service.
--
-- Fail-closed par défaut : `onboarding_masque` vaut `true` pour TOUT
-- restaurant déjà présent — l'onboarding reste invisible pour l'existant
-- sans aucun backfill. Seul le chemin de création d'un compte découverte
-- (`creerRestaurantEnDecouverte`) démarre avec `false` : c'est l'unique
-- endroit où un restaurant naît avec l'onboarding visible.

-- 1. Masquage global de l'onboarding (défaut `true` = invisible).
alter table public.restaurants
  add column if not exists onboarding_masque boolean not null default true;

-- 2. Seule étape non déductible des données : le pilotage a-t-il été
--    consulté ? Défaut `false` (pas encore visité) — sans effet pour les
--    comptes masqués, qui ne verront jamais le parcours de toute façon.
alter table public.restaurants
  add column if not exists onboarding_stats_consultees boolean not null default false;
