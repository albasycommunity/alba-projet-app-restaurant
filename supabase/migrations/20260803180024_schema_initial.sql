-- Restaurants
create table restaurants (
  id text primary key,
  nom text not null,
  quartier text not null,
  gerant text not null,
  actif boolean not null default true,
  cree_le timestamptz not null default now()
);

-- Utilisateurs
create table utilisateurs (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  nom text not null,
  role text not null check (role in ('SUPER_ADMIN','RESTAURANT_ADMIN','STAFF','CLIENT')),
  restaurant_id text references restaurants(id),
  actif boolean not null default true,
  permissions text[] not null default '{}',
  cree_le timestamptz not null default now()
);

-- Abonnements
create table abonnements (
  id text primary key,
  restaurant_id text not null references restaurants(id),
  plan text not null check (plan in ('mensuel','annuel')),
  palier text check (palier in ('starter','pro','premium')),
  statut text not null check (statut in ('actif','essai','expire','en_attente')),
  date_debut timestamptz not null,
  date_fin timestamptz not null,
  montant integer not null
);

-- Paiements (historique)
create table paiements (
  id text primary key,
  abonnement_id text not null references abonnements(id),
  restaurant_id text not null references restaurants(id),
  restaurant_nom text not null,
  montant integer not null,
  mode text not null,
  motif text not null,
  date timestamptz not null default now()
);

-- Fidélité clients
create table fidelite (
  user_id text primary key references utilisateurs(id),
  points integer not null default 0,
  visites integer not null default 0,
  panier_moyen integer not null default 0
);

-- Commandes clients
create table commandes_clients (
  id text primary key,
  ref text not null,
  client_id text not null references utilisateurs(id),
  client_nom text not null,
  restaurant_id text not null references restaurants(id),
  lignes jsonb not null,
  total integer not null,
  cree_a timestamptz not null default now()
);

-- Compteur global de commandes (équivalent à ton compteurCommandes)
create table compteurs (
  cle text primary key,
  valeur integer not null default 0
);
insert into compteurs (cle, valeur) values ('commandes', 400);

-- Paramètres de paiement (ligne unique)
create table parametres_paiement (
  id integer primary key default 1,
  numeros_mobile_money jsonb not null,
  naboopay_actif boolean not null default false,
  naboopay_api_key text not null default '',
  naboopay_webhook_secret text not null default '',
  constraint un_seul_id check (id = 1)
);

-- Transactions agrégateur
create table transactions_paiement (
  id text primary key,
  fournisseur text not null default 'naboopay',
  order_id text not null unique,
  abonnement_id text not null references abonnements(id),
  restaurant_id text not null references restaurants(id),
  plan text not null,
  palier text,
  montant integer not null,
  statut text not null check (statut in ('pending','paid','cancelled','refunded','failed')),
  cree_le timestamptz not null default now(),
  paye_le timestamptz,
  methode text,
  frais integer
);

-- Journal des webhooks
create table webhooks_paiement (
  id text primary key,
  fournisseur text not null default 'naboopay',
  recu_le timestamptz not null default now(),
  signature_valide boolean not null,
  statut text not null check (statut in ('rejete','traite','ignore')),
  ordre_id text,
  detail text,
  corps text
);

-- RLS activé sur toutes les tables : accès uniquement via service_role
-- côté serveur (tes routes API font déjà toute la vérification d'auth/
-- permissions en amont — RLS ici est une couche de défense supplémentaire,
-- pas la seule protection).
alter table restaurants enable row level security;
alter table utilisateurs enable row level security;
alter table abonnements enable row level security;
alter table paiements enable row level security;
alter table fidelite enable row level security;
alter table commandes_clients enable row level security;
alter table compteurs enable row level security;
alter table parametres_paiement enable row level security;
alter table transactions_paiement enable row level security;
alter table webhooks_paiement enable row level security;

-- Aucune policy créée : par défaut, RLS actif + zéro policy = accès refusé
-- à tout le monde SAUF service_role (qui contourne RLS par conception).
-- C'est le comportement voulu ici puisque tout passe par tes routes API.