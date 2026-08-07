-- Sorties de caisse tracées (décaissements) — partagées entre tous les
-- postes pour que le pilotage déduise le vrai total des espèces.
create table decaissements_restaurant (
  id text primary key,
  montant integer not null check (montant > 0),
  motif text not null,
  date timestamptz not null default now(),
  restaurant_id text not null references restaurants(id),
  encaisse_par_id text references utilisateurs(id)
);

-- RLS
alter table decaissements_restaurant enable row level security;

-- Les membres du restaurant peuvent tout faire sur leurs décaissements
create policy "Les membres du restaurant gèrent les décaissements"
  on decaissements_restaurant
  for all
  using (
    restaurant_id in (
      select restaurant_id from utilisateurs where id = auth.uid()
    )
  );

-- Permettre à service_role de tout faire (notamment notre route API)
create policy "Service role a tous les droits sur decaissements"
  on decaissements_restaurant
  for all
  using (true);