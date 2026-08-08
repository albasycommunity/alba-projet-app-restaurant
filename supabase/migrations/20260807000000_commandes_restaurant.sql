-- Table pour les commandes internes du restaurant (Caisse -> Cuisine)
create table commandes_restaurant (
  id text primary key,
  ref text not null,
  canal text not null check (canal in ('salle','comptoir','ligne','livraison')),
  table_nom text,
  client text,
  statut text not null check (statut in ('recue','preparation','prete','servie')),
  recue_a timestamptz not null default now(),
  estimation integer not null default 15,
  lignes jsonb not null,
  reglements jsonb not null,
  restaurant_id text not null references restaurants(id),
  encaisse_par_id text references utilisateurs(id)
);

-- RLS
alter table commandes_restaurant enable row level security;

-- L'admin du restaurant et le staff peuvent tout faire sur les commandes de leur restaurant
create policy "Les membres du restaurant gèrent les commandes"
  on commandes_restaurant
  for all
  using (
    restaurant_id in (
      select restaurant_id from utilisateurs where id = auth.uid()::text
    )
  );

-- Permettre à service_role de tout faire (notamment notre route API)
create policy "Service role a tous les droits sur commandes"
  on commandes_restaurant
  for all
  using (true);

-- Activer Realtime pour cette table afin que la cuisine reçoive les bons instantanément
alter publication supabase_realtime add table commandes_restaurant;
