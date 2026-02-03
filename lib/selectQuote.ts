import "server-only";

import { fetchQuotesByAuthor } from "./fetchQuotes";
import { PERSONALITIES, toAuthorId, type Personality } from "./personalities";

export type DailyQuote = Readonly<{
  /** UTC date in YYYY-MM-DD format (same for everyone) */
  date: string;
  person: Readonly<{
    /** Stable id derived from the personality name (e.g., "steve-jobs") */
    id: string;
    /** Display name (from `lib/personalities.ts`) */
    name: Personality;
  }>;
  quote: string;
}>;

/**
 * NOTE ON "LOW REPETITION" WITHOUT PERSISTENCE
 * --------------------------------------------
 * This selection is deterministic from the date only. That means:
 * - We cannot *guarantee* "no repeats across consecutive days" without saving state
 *   (e.g. in a DB, KV store, or even a local file) because the algorithm has no
 *   memory of what was shown yesterday.
 * - What we *can* do is distribute picks fairly across the available quotes, so
 *   the *probability* of repetition is low when you have a decent number of quotes.
 *   Roughly, if you have N total quotes, repeat probability from one day to the next
 *   is about 1/N (assuming uniform distribution).
 *
 * If you later want "never repeat until all quotes are used", you need persistence
 * (store a shuffled cycle index per day) or generate a deterministic permutation
 * keyed by a long-term secret + day number and then take the next item in sequence.
 */

/**
 * Returns today's quote (deterministic for the UTC date).
 * Same quote for everyone on the same day.
 */
export async function getTodaysQuote(now: Date = new Date()): Promise<DailyQuote> {
  const date = formatUtcDateYYYYMMDD(now);
  const seed = fnv1a32(`daily-quote:${date}`);
  const rng = mulberry32(seed);

  const flat = await fetchAndFlattenQuotes();
  if (flat.length === 0) {
    // Graceful behavior: if the quote provider fails or returns no quotes,
    // we surface a clear server-side error.
    //
    // Limitation: without local persistence, we can't guarantee availability.
    // Future improvement: store a vetted fallback set in a DB/KV store.
    throw new Error("No quotes available from the quote provider.");
  }

  // Deterministic pseudo-random index derived from the date-based seed.
  // `rng()` is in [0, 1), so this is stable for a given day.
  const index = Math.floor(rng() * flat.length);
  const picked = flat[index];

  return {
    date,
    person: { id: picked.personId, name: picked.personName },
    quote: picked.quote,
  };
}

type FlatQuote = Readonly<{
  personId: string;
  personName: Personality;
  quote: string;
}>;

/**
 * Fetch quotes for all personalities and flatten into a stable list.
 *
 * Determinism note:
 * - We fetch at request time (server-only) and then select deterministically from the fetched set.
 * - If the upstream provider's dataset changes (or some authors fail), the picked quote may change
 *   for the same date. Without persistence, we cannot "lock" a quote permanently.
 *
 * Future improvement:
 * - Persist "quote of the day" per date (DB/KV) after first successful fetch.
 * - Add per-personality aliasing or multiple providers for better coverage.
 */
async function fetchAndFlattenQuotes(): Promise<ReadonlyArray<FlatQuote>> {
  // Stable order matters: keep deterministic iteration order so index mapping
  // only changes if you intentionally change `PERSONALITIES`.
  const out: FlatQuote[] = [];

  // Fetch sequentially to be gentle on the public API.
  // (If you have many personalities, you can add concurrency with a small limit.)
  for (const name of PERSONALITIES) {
    const quotes = await fetchQuotesByAuthor(name);
    const personId = toAuthorId(name);
    for (const quote of quotes) {
      out.push({ personId, personName: name, quote });
    }
  }

  return out;
}

function formatUtcDateYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * FNV-1a 32-bit hash (fast, stable, good enough for seeding a PRNG).
 * Returns an unsigned 32-bit integer.
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiplication
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG: small, fast, deterministic given a seed.
 * Produces a float in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

