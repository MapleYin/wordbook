create type public.entry_type as enum ('word', 'phrase');
alter table public.word_entries add column entry_type public.entry_type not null default 'word';
