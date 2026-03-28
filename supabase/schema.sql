create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null,
  headline text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text,
  topic text not null default 'General',
  content text not null,
  likes_count integer not null default 0 check (likes_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_role text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id)
);


create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null,
  sender_role text,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  recipient_name text not null,
  recipient_role text,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

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
create index if not exists idx_posts_created_at on public.posts (created_at desc);
create index if not exists idx_posts_author_id on public.posts (author_id);
create index if not exists idx_comments_post_id on public.comments (post_id);
create index if not exists idx_comments_author_id on public.comments (author_id);
create index if not exists idx_comments_created_at on public.comments (created_at asc);
create index if not exists idx_post_likes_post_id on public.post_likes (post_id);
create index if not exists idx_post_likes_user_id on public.post_likes (user_id);
create index if not exists idx_direct_messages_sender_id on public.direct_messages (sender_id);
create index if not exists idx_direct_messages_recipient_id on public.direct_messages (recipient_id);
create index if not exists idx_direct_messages_created_at on public.direct_messages (created_at desc);
create index if not exists idx_direct_message_reads_user_id on public.direct_message_reads (user_id);
create index if not exists idx_direct_message_reads_peer_id on public.direct_message_reads (peer_id);
create index if not exists idx_direct_message_reads_last_read_at on public.direct_message_reads (last_read_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trigger_profiles_updated_at on public.profiles;
create trigger trigger_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trigger_posts_updated_at on public.posts;
create trigger trigger_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

drop trigger if exists trigger_comments_updated_at on public.comments;
create trigger trigger_comments_updated_at
before update on public.comments
for each row
execute function public.set_updated_at();

drop trigger if exists trigger_direct_message_reads_updated_at on public.direct_message_reads;
create trigger trigger_direct_message_reads_updated_at
before update on public.direct_message_reads
for each row
execute function public.set_updated_at();

create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set comment_count = comment_count + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set comment_count = greatest(comment_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trigger_sync_post_comment_count_insert on public.comments;
create trigger trigger_sync_post_comment_count_insert
after insert on public.comments
for each row
execute function public.sync_post_comment_count();

drop trigger if exists trigger_sync_post_comment_count_delete on public.comments;
create trigger trigger_sync_post_comment_count_delete
after delete on public.comments
for each row
execute function public.sync_post_comment_count();

create or replace function public.sync_post_like_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    update public.posts
    set likes_count = likes_count + 1
    where id = new.post_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.posts
    set likes_count = greatest(likes_count - 1, 0)
    where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists trigger_sync_post_like_count_insert on public.post_likes;
create trigger trigger_sync_post_like_count_insert
after insert on public.post_likes
for each row
execute function public.sync_post_like_count();

drop trigger if exists trigger_sync_post_like_count_delete on public.post_likes;
create trigger trigger_sync_post_like_count_delete
after delete on public.post_likes
for each row
execute function public.sync_post_like_count();

alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.post_likes enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_message_reads enable row level security;

drop policy if exists "profiles are viewable by everyone" on public.profiles;
create policy "profiles are viewable by everyone"
on public.profiles
for select
using (true);

drop policy if exists "users can insert own profile" on public.profiles;
create policy "users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "users can update own profile" on public.profiles;
create policy "users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

drop policy if exists "posts are viewable by everyone" on public.posts;
create policy "posts are viewable by everyone"
on public.posts
for select
using (true);

drop policy if exists "authenticated users can insert posts" on public.posts;
create policy "authenticated users can insert posts"
on public.posts
for insert
with check (auth.uid() = author_id);

drop policy if exists "authors can update own posts" on public.posts;
create policy "authors can update own posts"
on public.posts
for update
using (auth.uid() = author_id);

drop policy if exists "authors can delete own posts" on public.posts;
create policy "authors can delete own posts"
on public.posts
for delete
using (auth.uid() = author_id);

drop policy if exists "comments are viewable by everyone" on public.comments;
create policy "comments are viewable by everyone"
on public.comments
for select
using (true);

drop policy if exists "authenticated users can insert comments" on public.comments;
create policy "authenticated users can insert comments"
on public.comments
for insert
with check (auth.uid() = author_id);

drop policy if exists "authors can update own comments" on public.comments;
create policy "authors can update own comments"
on public.comments
for update
using (auth.uid() = author_id);

drop policy if exists "authors can delete own comments" on public.comments;
create policy "authors can delete own comments"
on public.comments
for delete
using (auth.uid() = author_id);

drop policy if exists "likes are viewable by everyone" on public.post_likes;
create policy "likes are viewable by everyone"
on public.post_likes
for select
using (true);

drop policy if exists "authenticated users can like posts" on public.post_likes;
create policy "authenticated users can like posts"
on public.post_likes
for insert
with check (auth.uid() = user_id);

drop policy if exists "users can remove own likes" on public.post_likes;
create policy "users can remove own likes"
on public.post_likes
for delete
using (auth.uid() = user_id);

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


