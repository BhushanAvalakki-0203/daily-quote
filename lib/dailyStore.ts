import "server-only";

import type { DailyQuote } from "./selectQuote";
import { inferMood, type Mood } from "./mood";
import { kv } from "@vercel/kv";

/**
 * Detect whether Vercel KV is configured.
 * - Locally: usually false
 * - On Vercel: true (env vars injected automatically)
 */
const isKvConfigured =
  !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;

/**
 * Persisted daily quote shape.
 *
 * Includes:
 * - date (UTC, "YYYY-MM-DD")
 * - quote + author (from DailyQuote)
 * - inferred mood (fast, deterministic heuristic)
 */
export type PersistedDailyQuote = DailyQuote & {
  mood: Mood;
};

// IMPORTANT: Why we do NOT use in-memory storage here
// --------------------------------------------------
// In serverless / edge environments (like Vercel):
// - Multiple regions and processes can serve traffic.
// - Processes can be stopped and restarted at any time.
// - In-memory Maps are NOT shared and NOT durable.
//
// Therefore, we persist the daily quote in Vercel KV (Redis),
// which is shared across regions and survives restarts.
//
// Locally, KV may not be configured, so we safely no-op.

async function getStoredDailyQuote(
  date: string
): Promise<PersistedDailyQuote | null> {
  if (!isKvConfigured) {
    // Local dev: KV not available
    return null;
  }

  const key = kvKeyForDate(date);
  const value = await kv.get<PersistedDailyQuote>(key);
  return (value as PersistedDailyQuote | null) ?? null;
}

async function saveDailyQuote(entry: PersistedDailyQuote): Promise<void> {
  if (!isKvConfigured) {
    // Local dev: skip persistence
    return;
  }

  const key = kvKeyForDate(entry.date);

  // We intentionally do not set an expiry so historical
  // daily quotes remain available.
  await kv.set(key, entry);
}

/**
 * Generate and persist the daily quote if not already stored.
 *
 * - Deterministic per UTC date (delegates to `selectDaily`)
 * - Infers mood once and persists it
 *
 * Intended usage:
 * - Called once per day by a cron job (GET /api/daily)
 * - UI should NEVER call the quote provider directly
 */
export async function ensurePersistedDailyQuote(
  selectDaily: () => Promise<DailyQuote>
): Promise<PersistedDailyQuote> {
  const candidate = await selectDaily();

  const existing = await getStoredDailyQuote(candidate.date);
  if (existing) {
    return existing;
  }

  const mood = inferMood(candidate.quote);

  const persisted: PersistedDailyQuote = {
    ...candidate,
    mood,
  };

  await saveDailyQuote(persisted);
  return persisted;
}

/**
 * Read-only accessor for a persisted daily quote.
 *
 * - NEVER calls the quote API
 * - Safe for UI server components
 * - Returns null if the daily quote has not been generated yet
 */
export async function getPersistedDailyQuote(
  date: string
): Promise<PersistedDailyQuote | null> {
  return getStoredDailyQuote(date);
}

function kvKeyForDate(date: string): string {
  // Prefix keys to avoid collisions
  return `daily-quote:${date}`;
}
