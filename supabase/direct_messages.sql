-- Direct Messages + Read State SQL for Know-Do Bridge
-- Safe to run multiple times (idempotent)

create extension if not exists pgcrypto;

-- Keep this function here so the script is standalone.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- 1) Direct messages payload exchange
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_role text,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_role text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint direct_messages_content_not_empty check (length(trim(content)) > 0),
  constraint direct_messages_no_self_chat check (sender_id <> recipient_id)
);

-- Backfill columns for legacy direct_messages tables.
alter table public.direct_messages add column if not exists sender_name text;
alter table public.direct_messages add column if not exists sender_role text;
alter table public.direct_messages add column if not exists recipient_name text;
alter table public.direct_messages add column if not exists recipient_role text;
alter table public.direct_messages add column if not exists created_at timestamptz not null default timezone('utc', now());

create index if not exists idx_direct_messages_sender_created
  on public.direct_messages (sender_id, created_at desc);
create index if not exists idx_direct_messages_recipient_created
  on public.direct_messages (recipient_id, created_at desc);
create index if not exists idx_direct_messages_created_at
  on public.direct_messages (created_at desc);

-- 2) Per-user read state exchange (multi-device sync)
create table if not exists public.direct_message_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  peer_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, peer_id),
  check (user_id <> peer_id)
);

create index if not exists idx_direct_message_reads_user_id
  on public.direct_message_reads (user_id);
create index if not exists idx_direct_message_reads_peer_id
  on public.direct_message_reads (peer_id);
create index if not exists idx_direct_message_reads_last_read_at
  on public.direct_message_reads (last_read_at desc);

drop trigger if exists trigger_direct_message_reads_updated_at on public.direct_message_reads;
create trigger trigger_direct_message_reads_updated_at
before update on public.direct_message_reads
for each row
execute function public.set_updated_at();

-- 3) RLS policies
alter table public.direct_messages enable row level security;
alter table public.direct_message_reads enable row level security;

drop policy if exists "participants can view direct messages" on public.direct_messages;
create policy "participants can view direct messages"
on public.direct_messages
for select
using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "authenticated users can send direct messages" on public.direct_messages;
create policy "authenticated users can send direct messages"
on public.direct_messages
for insert
with check (auth.uid() = sender_id);

drop policy if exists "users can view own direct message reads" on public.direct_message_reads;
create policy "users can view own direct message reads"
on public.direct_message_reads
for select
using (auth.uid() = user_id);

drop policy if exists "users can insert own direct message reads" on public.direct_message_reads;
create policy "users can insert own direct message reads"
on public.direct_message_reads
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can update own direct message reads" on public.direct_message_reads;
create policy "users can update own direct message reads"
on public.direct_message_reads
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "users can delete own direct message reads" on public.direct_message_reads;
create policy "users can delete own direct message reads"
on public.direct_message_reads
for delete
using (auth.uid() = user_id);

-- Optional: allow sender to delete own messages
-- drop policy if exists "senders can delete own direct messages" on public.direct_messages;
-- create policy "senders can delete own direct messages"
-- on public.direct_messages
-- for delete
-- using (auth.uid() = sender_id);

-- 4) Realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.direct_messages;
  exception
    when duplicate_object then
      null;
  end;

  begin
    alter publication supabase_realtime add table public.direct_message_reads;
  exception
    when duplicate_object then
      null;
  end;
end $$;
