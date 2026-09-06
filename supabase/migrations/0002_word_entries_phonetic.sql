-- Per-entry pronunciation, editable independently of the shared dictionary cache.
alter table public.word_entries add column phonetic text not null default '';
