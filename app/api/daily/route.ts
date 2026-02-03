// app/api/daily/route.ts

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getTodaysQuote } from "../../../lib/selectQuote";
import {
  ensurePersistedDailyQuote,
  getPersistedDailyQuote,
} from "../../../lib/dailyStore";

/**
 * GET /api/daily
 *
 * - Node.js runtime (KV + external fetch)
 * - Uses SAME logical day as UI
 * - Safe for cron and manual hits
 */
export async function GET() {
  try {
    // 🔑 Same logical day as page.tsx
    const today = getLogicalDate();

    let todays = await getPersistedDailyQuote(today);

    if (!todays) {
      todays = await ensurePersistedDailyQuote(getTodaysQuote);
    }

    const maxAgeSeconds = secondsUntilNextLogicalRollover();

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

/* ---------- helpers ---------- */

function getLogicalDate(now: Date = new Date()): string {
  const SHIFT_MS = 14.5 * 60 * 60 * 1000;
  const shifted = new Date(now.getTime() - SHIFT_MS);

  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function secondsUntilNextLogicalRollover(now: Date = new Date()): number {
  const SHIFT_MS = 14.5 * 60 * 60 * 1000;
  const shiftedNow = new Date(now.getTime() - SHIFT_MS);

  const next = new Date(
    Date.UTC(
      shiftedNow.getUTCFullYear(),
      shiftedNow.getUTCMonth(),
      shiftedNow.getUTCDate() + 1,
      0,
      0,
      0,
    ),
  );

  const diffMs = next.getTime() - shiftedNow.getTime();
  return clamp(Math.floor(diffMs / 1000), 60, 86400);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
