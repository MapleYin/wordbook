# English Words Collector

A personal vocabulary notebook: paste a sentence you met while reading, mark the new word(s)
inside it, and get an AI-written explanation in Chinese or English. Everything is saved to your
account.

## Stack

- Next.js (App Router, TypeScript), Tailwind CSS
- Supabase (Postgres, Auth, Row Level Security)
- Anthropic Claude API for contextual explanations
- [dictionaryapi.dev](https://dictionaryapi.dev) (free, keyless) for English phonetics, audio,
  and generic definitions

## Setup

1. Create a Supabase project, then run `supabase/migrations/0001_init.sql` against it (via the
   Supabase CLI's `supabase db push`, or by pasting it into the Dashboard's SQL editor).
2. In the Supabase Auth settings, consider disabling "Confirm email" for local development —
   otherwise new sign-ups need to click a confirmation link before they can sign in.
3. Copy `.env.local.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project
   - `ANTHROPIC_API_KEY` (and optionally `ANTHROPIC_MODEL`, defaults to `claude-sonnet-5`)
4. `npm install`
5. `npm run dev` and open [http://localhost:3000](http://localhost:3000)

## Data model

- `sources` — books/articles a sentence can be attributed to
- `sentences` — pasted sentences, optionally linked to a source, with a cached sentence
  translation
- `word_entries` — one row per marked word occurrence in a sentence, with its contextual
  explanation, part of speech, and definition
- `word_dictionary_cache` — a shared cache of free-dictionary lookups (phonetic, audio,
  definitions), keyed by lowercase headword

All per-user tables are protected by Row Level Security scoped to `auth.uid()`.

## Pages

- `/` — landing page (signed out) or your collection (signed in): add-word panel + word list
- `/auth` — sign in / sign up
- `/review` — flashcard review of your saved words
