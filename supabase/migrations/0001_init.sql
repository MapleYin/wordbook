-- English Words Collector: initial schema
create extension if not exists pgcrypto;

create type public.explanation_language as enum ('zh', 'en');
create type public.source_type as enum ('book', 'article', 'other');

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type public.source_type not null default 'other',
  created_at timestamptz not null default now(),
  unique (user_id, title)
);

create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  text text not null,
  translation text,
  translation_language public.explanation_language,
  created_at timestamptz not null default now()
);

create table public.word_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sentence_id uuid not null references public.sentences(id) on delete cascade,
  word text not null,
  headword text not null,
  highlight_start integer not null,
  highlight_end integer not null,
  language public.explanation_language not null,
  explanation text not null default '',
  part_of_speech text not null default '',
  definition text not null default '',
  created_at timestamptz not null default now(),
  constraint highlight_range_valid check (highlight_start >= 0 and highlight_end > highlight_start)
);

-- Shared, non-sensitive cache of free-dictionary lookups (not user-scoped)
create table public.word_dictionary_cache (
  headword text primary key,
  phonetic text,
  audio_url text,
  meanings jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now()
);

create index sources_user_id_created_at_idx on public.sources (user_id, created_at desc);
create index sentences_user_id_created_at_idx on public.sentences (user_id, created_at desc);
create index sentences_source_id_idx on public.sentences (source_id);
create index word_entries_user_id_created_at_idx on public.word_entries (user_id, created_at desc);
create index word_entries_sentence_id_idx on public.word_entries (sentence_id);
create index word_entries_headword_idx on public.word_entries (user_id, headword);

alter table public.sources enable row level security;
alter table public.sentences enable row level security;
alter table public.word_entries enable row level security;
alter table public.word_dictionary_cache enable row level security;

create policy "select own sources" on public.sources for select using (auth.uid() = user_id);
create policy "insert own sources" on public.sources for insert with check (auth.uid() = user_id);
create policy "update own sources" on public.sources for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own sources" on public.sources for delete using (auth.uid() = user_id);

create policy "select own sentences" on public.sentences for select using (auth.uid() = user_id);
create policy "insert own sentences" on public.sentences for insert with check (auth.uid() = user_id);
create policy "update own sentences" on public.sentences for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own sentences" on public.sentences for delete using (auth.uid() = user_id);

create policy "select own word_entries" on public.word_entries for select using (auth.uid() = user_id);
create policy "insert own word_entries" on public.word_entries for insert with check (auth.uid() = user_id);
create policy "update own word_entries" on public.word_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own word_entries" on public.word_entries for delete using (auth.uid() = user_id);

-- Dictionary cache: shared read/write for any signed-in user, no ownership column.
create policy "select dictionary cache" on public.word_dictionary_cache for select to authenticated using (true);
create policy "insert dictionary cache" on public.word_dictionary_cache for insert to authenticated with check (true);
create policy "update dictionary cache" on public.word_dictionary_cache for update to authenticated using (true) with check (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.sources to authenticated;
grant select, insert, update, delete on public.sentences to authenticated;
grant select, insert, update, delete on public.word_entries to authenticated;
grant select, insert, update on public.word_dictionary_cache to authenticated;
