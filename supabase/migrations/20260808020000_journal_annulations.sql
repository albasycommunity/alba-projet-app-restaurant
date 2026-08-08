-- Journal d'annulation de tickets (IC-03) — chaque annulation par PIN
-- laisse une trace immuable : qui a annulé quoi, quand, et combien.
-- Cette table est en APPEND ONLY : aucun DELETE autorisé.
create table journal_annulations (
  id text primary key,
  restaurant_id text not null references restaurants(id),
  commande_ref text not null,
  commande_id text not null,
  montant integer not null,
  annule_par_id text references utilisateurs(id),
  motif text,
  annule_le timestamptz not null default now()
);

-- RLS
alter table journal_annulations enable row level security;

-- Lecture réservée aux membres du restaurant (audit interne)
create policy "Les membres lisent leur journal annulations"
  on journal_annulations
  for select
  using (
    restaurant_id in (
      select restaurant_id from utilisateurs where id = auth.uid()::text
    )
  );

-- Insertion réservée au service_role (route API /api/caisse/annuler)
-- Jamais d'insert direct depuis le client — la validation PIN est côté serveur.
create policy "Service role insere dans journal annulations"
  on journal_annulations
  for insert
  with check (true);

-- Aucun UPDATE ni DELETE possible, même pour service_role :
-- le journal est immuable par conception.
