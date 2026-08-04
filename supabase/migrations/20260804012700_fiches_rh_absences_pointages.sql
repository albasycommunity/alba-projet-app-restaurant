-- Fiche RH : un enregistrement par utilisateur de rôle STAFF (ou RESTAURANT_ADMIN).
-- Séparée de `utilisateurs` pour ne jamais mélanger les données d'authentification
-- (email, password_hash) avec les données RH (poste, embauche, contact).
create table fiches_rh (
  utilisateur_id text primary key references utilisateurs(id),
  poste text not null,
  date_embauche date not null default current_date,
  telephone text,
  contact_urgence text,
  notes text,
  cree_le timestamptz not null default now()
);

-- Pointages : remplace le pointage en mémoire actuel (lib/store.tsx).
-- Chaque scan (arrivée/pause/reprise/départ) devient une vraie ligne persistée.
create table pointages (
  id text primary key,
  utilisateur_id text not null references utilisateurs(id),
  restaurant_id text not null references restaurants(id),
  type text not null check (type in ('arrivee','pause','reprise','depart')),
  horodatage timestamptz not null default now()
);
create index idx_pointages_utilisateur on pointages(utilisateur_id, horodatage desc);
create index idx_pointages_restaurant_jour on pointages(restaurant_id, horodatage desc);

-- Absences : déclarées par l'employé (self-service) ou par la cheffe,
-- avec un statut de justification suivi dans le temps.
create table absences (
  id text primary key,
  utilisateur_id text not null references utilisateurs(id),
  restaurant_id text not null references restaurants(id),
  date date not null,
  type text not null check (type in ('absence','retard','conge')),
  statut text not null default 'declaree' check (statut in ('declaree','justifiee','refusee')),
  motif text,
  justificatif_url text,
  declaree_par text not null references utilisateurs(id),
  traitee_par text references utilisateurs(id),
  cree_le timestamptz not null default now(),
  traitee_le timestamptz
);
create index idx_absences_restaurant on absences(restaurant_id, date desc);
create index idx_absences_utilisateur on absences(utilisateur_id, date desc);

-- RLS activée, aucune policy : accès exclusif via service_role (comme le
-- reste du schéma) — tes routes API font déjà toute l'autorisation.
alter table fiches_rh enable row level security;
alter table pointages enable row level security;
alter table absences enable row level security;