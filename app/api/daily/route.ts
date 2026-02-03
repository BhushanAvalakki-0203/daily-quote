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
 * - Runs on Node.js (required for KV + external fetches)
 * - Cron-safe
 * - Never crashes the UI
 */
export async function GET() {
  try {
    const today = formatUtcDateYYYYMMDD(new Date());

    // 1. Try reading from KV
    let todays = await getPersistedDailyQuote(today);

    // 2. If missing, generate + persist
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
          "Cache-Control": `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
        },
      },
    );
  } catch (err) {
    console.error("[/api/daily] FAILED", err);

    return NextResponse.json(
      {
        error: "Unable to generate today's quote.",
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}

/* ---------------- helpers ---------------- */

function formatUtcDateYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function secondsUntilNextUtcMidnight(now: Date = new Date()): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );
  const diffMs = next.getTime() - now.getTime();
  return clamp(Math.floor(diffMs / 1000), 60, 86400);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
