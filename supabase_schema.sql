-- ============================================================
-- AI Wallet — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- Enable UUID extension (already enabled on most Supabase projects)
create extension if not exists "uuid-ossp";


-- ============================================================
-- ACCOUNTS
-- ============================================================
create table if not exists accounts (
  id              text primary key,
  name            text not null,
  type            text not null check (type in ('cash', 'bank', 'card', 'wallet')),
  balance_paise   bigint default 0,
  currency        text default 'INR',
  icon            text,
  color           text,
  is_active       boolean default true,
  sort_order      int default 0,
  deleted_at      text,
  user_id         uuid references auth.users(id) on delete cascade not null,
  created_at      text not null,
  updated_at      text not null
);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table if not exists categories (
  id          text primary key,
  name        text not null,
  type        text not null check (type in ('expense', 'income')),
  parent_id   text references categories(id),
  icon        text,
  color       text,
  is_system   boolean default false,
  is_active   boolean default true,
  sort_order  int default 0,
  user_id     uuid references auth.users(id) on delete cascade not null,
  created_at  text not null,
  updated_at  text not null
);

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table if not exists transactions (
  id                        text primary key,
  schema_version            text default '1.0',
  transaction_type          text not null check (transaction_type in ('expense','income','transfer','refund','adjustment')),
  amount_paise              bigint not null,
  currency                  text default 'INR',
  merchant                  text,
  category_id               text references categories(id),
  occurred_at               text not null,
  payment_account_id        text references accounts(id) not null,
  transfer_to_account_id    text references accounts(id),
  refund_of_transaction_id  text,
  note                      text,
  confidence                real default 1.0,
  source                    text default 'manual',
  is_ai_generated           boolean default false,
  was_user_edited           boolean default false,
  original_ai_category_id   text,
  deleted_at                text,
  user_id                   uuid references auth.users(id) on delete cascade not null,
  created_at                text not null,
  updated_at                text not null
);

-- ============================================================
-- AI LEARNING EVENTS  (analytics — per-user but queried aggregate)
-- ============================================================
create table if not exists ai_learning_events (
  id                      text primary key,
  transaction_id          text references transactions(id),
  changes                 jsonb not null,
  input_text              text,
  input_source            text check (input_source in ('text','voice','image')),
  merchant_normalized     text,
  is_useful_for_learning  boolean,
  user_id                 uuid references auth.users(id) on delete cascade not null,
  created_at              text not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_accounts_user       on accounts(user_id);
create index if not exists idx_categories_user     on categories(user_id);
create index if not exists idx_transactions_user   on transactions(user_id);
create index if not exists idx_transactions_occurred on transactions(occurred_at);
create index if not exists idx_learning_merchant   on ai_learning_events(merchant_normalized);
create index if not exists idx_learning_user       on ai_learning_events(user_id);


-- ============================================================
-- ROW LEVEL SECURITY — users can only see their own data
-- ============================================================
alter table accounts           enable row level security;
alter table categories         enable row level security;
alter table transactions       enable row level security;
alter table ai_learning_events enable row level security;

-- accounts
create policy "accounts: own rows only" on accounts
  using (user_id = auth.uid());

-- categories
create policy "categories: own rows only" on categories
  using (user_id = auth.uid());

-- transactions
create policy "transactions: own rows only" on transactions
  using (user_id = auth.uid());

-- ai_learning_events: users own their events, but we (service role) can read all for analytics
create policy "learning: own rows only" on ai_learning_events
  using (user_id = auth.uid());


-- ============================================================
-- ANALYTICS VIEW  (server-side only, accessed via service role key)
-- Aggregates category correction patterns across all users
-- No PII — only normalized merchant + category pair counts
-- ============================================================
create or replace view analytics_category_corrections
with (security_invoker = true)
as
select
  merchant_normalized,
  (change->>'from') as category_from,
  (change->>'to')   as category_to,
  count(*)          as correction_count,
  max(ale.created_at) as last_seen_at
from ai_learning_events ale,
     jsonb_array_elements(changes) as change
where change->>'field' = 'category_id'
  and merchant_normalized is not null
group by merchant_normalized, category_from, category_to
order by correction_count desc;
