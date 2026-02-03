export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getTodaysQuote } from "../../../lib/selectQuote";
import {
  ensurePersistedDailyQuote,
  getPersistedDailyQuote,
} from "../../../lib/dailyStore";

/**
 * Route Handler: GET /api/daily
 *
 * Server-only by default (Route Handlers run on the server).
 * Runtime intent:
 * - Safe for the Edge runtime (no Node-only APIs, no filesystem/network dependencies).
 * - Running on the Edge can reduce latency and makes caching at the CDN straightforward.
 */

/**
 * Returns the deterministic quote of the day, including persisted metadata.
 *
 * Response JSON shape:
 * - date: "YYYY-MM-DD" (UTC)
 * - authorId: string
 * - authorName: string
 * - quote: string
 * - mood: string (fast heuristic, e.g., "inspiring", "success", "unknown")
 *
 * Caching:
 * - We cache until the next UTC midnight. This is safe because the quote is deterministic per UTC day.
 * - This avoids serving yesterday's quote past the UTC day boundary.
 * - Note: keep using the UTC date (as we do) to ensure consistency across regions.
 */
export async function GET() {
  try {
    // First, try to read a persisted entry for today's UTC date.
    const today = formatUtcDateYYYYMMDD(new Date());
    let todays = await getPersistedDailyQuote(today);

    // If none exists yet (e.g., first call of the day or local dev), generate
    // and persist one. Cron is expected to call this route once daily so that
    // the UI does not need to talk to the quote API directly.
    if (!todays) {
      todays = await ensurePersistedDailyQuote(getTodaysQuote);
    }

    const maxAgeSeconds = secondsUntilNextUtcMidnight();

    return NextResponse.json(
      {
        date: todays.date,
        authorId: todays.person.id,
        authorName: todays.person.name,
        quote: todays.quote,
        mood: todays.mood,
      },
      {
        headers: {
          // Cache until the next UTC day boundary.
          // This avoids serving yesterday's quote for up to 24 hours after midnight UTC.
          // `s-maxage` allows shared caches (CDNs) to cache too.
          "Cache-Control": `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
        },
      },
    );
  } catch (err) {
    // Avoid leaking internals. Keep it consistent and safe.
    // In production, this ends up in server logs/observability.
    console.error("[/api/daily] unexpected error", err);
    return NextResponse.json(
      {
        error: "Unable to generate today's quote.",
      },
      { status: 500 },
    );
  }
}

function formatUtcDateYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0),
  );
  const diffMs = next.getTime() - now.getTime();
  // Clamp: at least 60s to avoid overly chatty caches; at most 24h.
  return clamp(Math.floor(diffMs / 1000), 60, 86400);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

