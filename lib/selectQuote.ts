import "server-only";

import { fetchQuotesByAuthor } from "./fetchQuotes";
import { PERSONALITIES, toAuthorId, type Personality } from "./personalities";

export type DailyQuote = Readonly<{
  date: string;
  person: Readonly<{
    id: string;
    name: Personality;
  }>;
  quote: string;
}>;

/* --------------------------------------------------
   HARD FALLBACK (never fails)
-------------------------------------------------- */
const FALLBACK_PERSON: Personality = PERSONALITIES[0];

const FALLBACK_QUOTE_TEXT =
  "Consistency beats motivation. Show up every day, even when it’s hard.";

/**
 * Returns today's quote (deterministic per UTC date).
 * NEVER throws. Safe for cron, KV, and UI.
 */
export async function getTodaysQuote(
  now: Date = new Date(),
): Promise<DailyQuote> {
  const date = formatUtcDateYYYYMMDD(now);
  const seed = fnv1a32(`daily-quote:${date}`);
  const rng = mulberry32(seed);

  try {
    const flat = await fetchAndFlattenQuotes();

    if (flat.length === 0) {
      console.warn("[getTodaysQuote] No quotes fetched. Using fallback.");
      return fallbackQuote(date);
    }

    const index = Math.floor(rng() * flat.length);
    const picked = flat[index];

    return {
      date,
      person: { id: picked.personId, name: picked.personName },
      quote: picked.quote,
    };
  } catch (err) {
    console.error("[getTodaysQuote] crashed, using fallback", err);
    return fallbackQuote(date);
  }
}

/* --------------------------------------------------
   Helpers
-------------------------------------------------- */

function fallbackQuote(date: string): DailyQuote {
  return {
    date,
    person: {
      id: toAuthorId(FALLBACK_PERSON),
      name: FALLBACK_PERSON,
    },
    quote: FALLBACK_QUOTE_TEXT,
  };
}

type FlatQuote = Readonly<{
  personId: string;
  personName: Personality;
  quote: string;
}>;

async function fetchAndFlattenQuotes(): Promise<ReadonlyArray<FlatQuote>> {
  const out: FlatQuote[] = [];

  for (const name of PERSONALITIES) {
    try {
      const quotes = await fetchQuotesByAuthor(name);
      const personId = toAuthorId(name);

      for (const quote of quotes) {
        out.push({ personId, personName: name, quote });
      }
    } catch (err) {
      console.warn(`[quotes] Failed for ${name}`, err);
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

/* ---------- deterministic RNG ---------- */

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

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
