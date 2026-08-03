-- Accès service_role à l'ensemble du schéma public.
--
-- Le projet n'expose pas automatiquement les nouvelles tables à la Data
-- API (nouveau comportement par défaut) : les tables créées par migration
-- ne sont accessibles à PERSONNE via PostgREST, service_role compris.
-- L'app utilise UNIQUEMENT la clé service_role (côté serveur, RLS contourné
-- par conception — toute l'autorisation est faite dans les routes API).
-- anon / authenticated restent sans aucun droit : RLS actif + zéro policy
-- = accès refusé pour tout accès client, comme prévu.

grant usage on schema public to service_role;

-- Tables et séquences actuelles ET futures.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Fonctions RPC actuelles ET futures.
grant execute on all functions in schema public to service_role;
alter default privileges in schema public grant all on functions to service_role;
